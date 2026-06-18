/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IRequestService } from '../../../../../platform/request/common/request.js';
import { ChatDelta, ChatRequest } from '../../common/kcodeChatService.js';
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

interface OpenAIStreamChunk {
	choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
	error?: { message?: string };
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

		try {
			for await (const data of fetchSseData(this.requestService, {
				method: 'POST',
				url: `${baseUrl}/chat/completions`,
				headers: { Authorization: `Bearer ${apiKey}` },
				body: {
					model,
					messages: request.messages.map(m => ({ role: m.role, content: m.content })),
					stream: true,
				},
				callSite: 'OpenAIProvider.sendMessage',
			}, token)) {
				const chunk = JSON.parse(data) as OpenAIStreamChunk;
				if (chunk.error?.message) {
					yield { content: chunk.error.message, done: true };
					return;
				}
				const delta = chunk.choices?.[0]?.delta?.content;
				if (delta) {
					yield { content: delta };
				}
				if (chunk.choices?.[0]?.finish_reason) {
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
