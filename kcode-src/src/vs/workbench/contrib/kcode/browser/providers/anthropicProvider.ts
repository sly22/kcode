/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IRequestService } from '../../../../../platform/request/common/request.js';
import { AgentToolCall } from '../../common/kcodeAgentTools.js';
import { toAnthropicTools } from '../../common/kcodeAgentToolSchemas.js';
import { ChatDelta, ChatMessage, ChatRequest } from '../../common/kcodeChatService.js';
import { KCODE_CONFIG_ANTHROPIC_BASE_URL } from '../../common/kcodeConstants.js';
import { KcodeProvider, ModelInfo, qualifiedModelId } from '../../common/kcodeModels.js';
import { IKcodeSecretStorageService } from '../../common/kcodeSecretStorageService.js';
import { IKcodeModelProvider } from './ikcodeProvider.js';
import { fetchSseData, stripProviderPrefix } from './kcodeHttpClient.js';

const ANTHROPIC_MODELS: ReadonlyArray<{ id: string; label: string }> = [
	{ id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
	{ id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
	{ id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
];

interface AnthropicStreamEvent {
	type?: string;
	delta?: { type?: string; text?: string; partial_json?: string };
	content_block?: { type?: string; id?: string; name?: string };
	index?: number;
	error?: { message?: string };
}

export class AnthropicProvider implements IKcodeModelProvider {
	readonly providerId = KcodeProvider.Anthropic;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IKcodeSecretStorageService private readonly secretStorage: IKcodeSecretStorageService,
		@IRequestService private readonly requestService: IRequestService,
	) { }

	async listModels(): Promise<readonly ModelInfo[]> {
		return ANTHROPIC_MODELS.map(m => ({
			id: qualifiedModelId(KcodeProvider.Anthropic, m.id),
			label: m.label,
			provider: KcodeProvider.Anthropic,
		}));
	}

	async *sendMessage(request: ChatRequest, token: CancellationToken): AsyncIterable<ChatDelta> {
		const apiKey = await this.secretStorage.getApiKey(KcodeProvider.Anthropic);
		if (!apiKey) {
			yield {
				content: localize(
					'kcode.anthropic.noApiKey',
					'Anthropic API key is not configured. Use the command "Kcode: Set Anthropic API Key".',
				),
				done: true,
			};
			return;
		}

		const baseUrl = this.getBaseUrl();
		const model = stripProviderPrefix(request.model);
		const body: Record<string, unknown> = {
			model,
			max_tokens: 4096,
			stream: true,
			messages: request.messages
				.filter(m => m.role !== 'system' && m.role !== 'tool')
				.map(m => this.toAnthropicMessage(m)),
			system: request.messages.find(m => m.role === 'system')?.content,
		};
		if (request.tools && request.tools.length > 0) {
			body.tools = toAnthropicTools(request.tools);
		}

		let currentToolId: string | undefined;
		let currentToolName: string | undefined;
		let toolInputJson = '';

		try {
			for await (const data of fetchSseData(this.requestService, {
				method: 'POST',
				url: `${baseUrl}/v1/messages`,
				headers: {
					'x-api-key': apiKey,
					'anthropic-version': '2023-06-01',
				},
				body,
				callSite: 'AnthropicProvider.sendMessage',
			}, token)) {
				const event = JSON.parse(data) as AnthropicStreamEvent;
				if (event.error?.message) {
					yield { content: event.error.message, done: true };
					return;
				}

				if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
					currentToolId = event.content_block.id;
					currentToolName = event.content_block.name;
					toolInputJson = '';
				}

				if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta' && event.delta.text) {
					yield { content: event.delta.text };
				}

				if (event.type === 'content_block_delta' && event.delta?.type === 'input_json_delta' && event.delta.partial_json) {
					toolInputJson += event.delta.partial_json;
				}

				if (event.type === 'message_stop') {
					if (currentToolName) {
						const toolCalls = this.parseAnthropicToolCall(currentToolId, currentToolName, toolInputJson);
						if (toolCalls.length > 0) {
							yield { toolCalls, done: true };
							return;
						}
					}
					yield { done: true };
					return;
				}
			}
			yield { done: true };
		} catch (err) {
			yield {
				content: localize('kcode.anthropic.requestFailed', 'Anthropic request failed: {0}', String(err)),
				done: true,
			};
		}
	}

	private toAnthropicMessage(message: ChatMessage): Record<string, unknown> {
		if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
			const content: object[] = [];
			if (message.content) {
				content.push({ type: 'text', text: message.content });
			}
			for (const tc of message.toolCalls) {
				content.push({
					type: 'tool_use',
					id: tc.id ?? `tool_${tc.name}`,
					name: tc.name,
					input: tc.args,
				});
			}
			return { role: 'assistant', content };
		}
		return { role: message.role, content: message.content };
	}

	private parseAnthropicToolCall(id: string | undefined, name: string, inputJson: string): AgentToolCall[] {
		let args: Record<string, string> = {};
		try {
			const parsed = JSON.parse(inputJson || '{}') as Record<string, unknown>;
			for (const [key, value] of Object.entries(parsed)) {
				args[key] = String(value);
			}
		} catch {
			args = {};
		}
		return [{
			id: id ?? `tool_${name}`,
			name: name as AgentToolCall['name'],
			args,
		}];
	}

	private getBaseUrl(): string {
		const configured = this.configurationService.getValue<string>(KCODE_CONFIG_ANTHROPIC_BASE_URL);
		return (configured ?? 'https://api.anthropic.com').replace(/\/$/, '');
	}
}
