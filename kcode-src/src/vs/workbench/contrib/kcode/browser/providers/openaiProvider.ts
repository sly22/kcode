/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IRequestService } from '../../../../../platform/request/common/request.js';
import { AgentToolCall } from '../../common/kcodeAgentTools.js';
import { toOpenAITools } from '../../common/kcodeAgentToolSchemas.js';
import { ChatDelta, ChatMessage, ChatRequest } from '../../common/kcodeChatService.js';
import { KCODE_CONFIG_OPENAI_BASE_URL } from '../../common/kcodeConstants.js';
import { KcodeProvider, ModelInfo, qualifiedModelId } from '../../common/kcodeModels.js';
import { IKcodeSecretStorageService } from '../../common/kcodeSecretStorageService.js';
import { IKcodeModelProvider } from './ikcodeProvider.js';
import { fetchJson, fetchSseData, stripProviderPrefix } from './kcodeHttpClient.js';

const OPENAI_MODELS: ReadonlyArray<{ id: string; label: string }> = [
	{ id: 'gpt-4o', label: 'GPT-4o' },
	{ id: 'gpt-4.1', label: 'GPT-4.1' },
	{ id: 'o3', label: 'o3' },
];

interface OpenAIModelsResponse {
	data?: Array<{ id: string }>;
}

interface OpenAIToolCallDelta {
	index?: number;
	id?: string;
	function?: { name?: string; arguments?: string };
}

interface OpenAIStreamChunk {
	choices?: Array<{
		delta?: { content?: string; tool_calls?: OpenAIToolCallDelta[] };
		finish_reason?: string | null;
	}>;
	error?: { message?: string };
}

interface ToolCallAccumulator {
	id?: string;
	name?: string;
	arguments: string;
}

export class OpenAIProvider implements IKcodeModelProvider {
	readonly providerId = KcodeProvider.OpenAI;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IKcodeSecretStorageService private readonly secretStorage: IKcodeSecretStorageService,
		@IRequestService private readonly requestService: IRequestService,
	) { }

	async listModels(): Promise<readonly ModelInfo[]> {
		const apiKey = await this.secretStorage.getApiKey(KcodeProvider.OpenAI);
		if (!apiKey) {
			return this.fallbackModels();
		}

		const baseUrl = this.getBaseUrl();
		try {
			const json = await fetchJson<OpenAIModelsResponse>(this.requestService, {
				method: 'GET',
				url: `${baseUrl}/models`,
				headers: { Authorization: `Bearer ${apiKey}` },
				callSite: 'OpenAIProvider.listModels',
			}, CancellationToken.None);

			const remote = (json.data ?? [])
				.map(m => m.id)
				.filter(id => id.startsWith('gpt-') || id.startsWith('o') || id.startsWith('chatgpt-'))
				.sort()
				.map(id => ({
					id: qualifiedModelId(KcodeProvider.OpenAI, id),
					label: id,
					provider: KcodeProvider.OpenAI,
				}));

			return remote.length > 0 ? remote : this.fallbackModels();
		} catch {
			return this.fallbackModels();
		}
	}

	async *sendMessage(request: ChatRequest, token: CancellationToken): AsyncIterable<ChatDelta> {
		const apiKey = await this.secretStorage.getApiKey(KcodeProvider.OpenAI);
		if (!apiKey) {
			yield {
				content: localize(
					'kcode.openai.noApiKey',
					'OpenAI API key is not configured. Use the command "Kcode: Set OpenAI API Key".',
				),
				done: true,
			};
			return;
		}

		const baseUrl = this.getBaseUrl();
		const model = stripProviderPrefix(request.model);
		const body: Record<string, unknown> = {
			model,
			messages: request.messages.map(m => this.toOpenAIMessage(m)),
			stream: true,
		};
		if (request.tools && request.tools.length > 0) {
			body.tools = toOpenAITools(request.tools);
		}

		const toolCallMap = new Map<number, ToolCallAccumulator>();

		try {
			for await (const data of fetchSseData(this.requestService, {
				method: 'POST',
				url: `${baseUrl}/chat/completions`,
				headers: { Authorization: `Bearer ${apiKey}` },
				body,
				callSite: 'OpenAIProvider.sendMessage',
			}, token)) {
				const chunk = JSON.parse(data) as OpenAIStreamChunk;
				if (chunk.error?.message) {
					yield { content: chunk.error.message, done: true };
					return;
				}

				const choice = chunk.choices?.[0];
				const delta = choice?.delta;
				if (delta?.content) {
					yield { content: delta.content };
				}

				if (delta?.tool_calls) {
					for (const tc of delta.tool_calls) {
						const index = tc.index ?? 0;
						const acc = toolCallMap.get(index) ?? { arguments: '' };
						if (tc.id) {
							acc.id = tc.id;
						}
						if (tc.function?.name) {
							acc.name = tc.function.name;
						}
						if (tc.function?.arguments) {
							acc.arguments += tc.function.arguments;
						}
						toolCallMap.set(index, acc);
					}
				}

				const finishReason = choice?.finish_reason;
				if (finishReason === 'tool_calls') {
					yield { toolCalls: this.parseToolCalls(toolCallMap), done: true };
					return;
				}
				if (finishReason) {
					yield { done: true };
					return;
				}
			}
			yield { done: true };
		} catch (err) {
			yield {
				content: localize('kcode.openai.requestFailed', 'OpenAI request failed: {0}', String(err)),
				done: true,
			};
		}
	}

	private toOpenAIMessage(message: ChatMessage): Record<string, unknown> {
		if (message.role === 'tool') {
			return {
				role: 'tool',
				tool_call_id: message.toolCallId ?? 'unknown',
				content: message.content,
			};
		}
		if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
			return {
				role: 'assistant',
				content: message.content || null,
				tool_calls: message.toolCalls.map((tc, i) => ({
					id: tc.id ?? `call_${i}`,
					type: 'function',
					function: {
						name: tc.name,
						arguments: JSON.stringify(tc.args),
					},
				})),
			};
		}
		return { role: message.role, content: message.content };
	}

	private parseToolCalls(toolCallMap: Map<number, ToolCallAccumulator>): AgentToolCall[] {
		const calls: AgentToolCall[] = [];
		for (const acc of toolCallMap.values()) {
			if (!acc.name) {
				continue;
			}
			let args: Record<string, string> = {};
			try {
				const parsed = JSON.parse(acc.arguments || '{}') as Record<string, unknown>;
				for (const [key, value] of Object.entries(parsed)) {
					args[key] = String(value);
				}
			} catch {
				args = {};
			}
			calls.push({
				id: acc.id,
				name: acc.name as AgentToolCall['name'],
				args,
			});
		}
		return calls;
	}

	private fallbackModels(): readonly ModelInfo[] {
		return OPENAI_MODELS.map(m => ({
			id: qualifiedModelId(KcodeProvider.OpenAI, m.id),
			label: m.label,
			provider: KcodeProvider.OpenAI,
		}));
	}

	private getBaseUrl(): string {
		const configured = this.configurationService.getValue<string>(KCODE_CONFIG_OPENAI_BASE_URL);
		return (configured ?? 'https://api.openai.com/v1').replace(/\/$/, '');
	}
}
