/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IRequestService } from '../../../../../platform/request/common/request.js';
import { ChatDelta, ChatRequest } from '../../common/kcodeChatService.js';
import { KCODE_CONFIG_OLLAMA_BASE_URL } from '../../common/kcodeConstants.js';
import { KcodeProvider, ModelInfo, qualifiedModelId } from '../../common/kcodeModels.js';
import { IKcodeModelProvider } from './ikcodeProvider.js';
import { fetchJson, fetchNdjsonLines, stripProviderPrefix } from './kcodeHttpClient.js';

const OLLAMA_FALLBACK_MODELS: ReadonlyArray<{ id: string; label: string }> = [
	{ id: 'llama3.2', label: 'Llama 3.2' },
	{ id: 'codellama', label: 'Code Llama' },
	{ id: 'qwen2.5-coder', label: 'Qwen 2.5 Coder' },
];

interface OllamaTagsResponse {
	models?: Array<{ name: string }>;
}

interface OllamaChatChunk {
	message?: { content?: string };
	done?: boolean;
	error?: string;
}

export class OllamaProvider implements IKcodeModelProvider {
	readonly providerId = KcodeProvider.Local;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IRequestService private readonly requestService: IRequestService,
	) { }

	async listModels(): Promise<readonly ModelInfo[]> {
		const baseUrl = this.getBaseUrl();
		try {
			const json = await fetchJson<OllamaTagsResponse>(this.requestService, {
				method: 'GET',
				url: `${baseUrl}/api/tags`,
				callSite: 'OllamaProvider.listModels',
			}, CancellationToken.None);

			const remote = (json.models ?? [])
				.map(m => m.name.replace(/:latest$/, ''))
				.sort()
				.map(name => ({
					id: qualifiedModelId(KcodeProvider.Local, name),
					label: name,
					provider: KcodeProvider.Local,
				}));

			return remote.length > 0 ? remote : this.fallbackModels();
		} catch {
			return this.fallbackModels();
		}
	}

	async *sendMessage(request: ChatRequest, token: CancellationToken): AsyncIterable<ChatDelta> {
		const baseUrl = this.getBaseUrl();
		const model = stripProviderPrefix(request.model);

		try {
			for await (const line of fetchNdjsonLines(this.requestService, {
				method: 'POST',
				url: `${baseUrl}/api/chat`,
				body: {
					model,
					stream: true,
					messages: request.messages.map(m => ({ role: m.role, content: m.content })),
				},
				callSite: 'OllamaProvider.sendMessage',
			}, token)) {
				const chunk = JSON.parse(line) as OllamaChatChunk;
				if (chunk.error) {
					yield { content: chunk.error, done: true };
					return;
				}
				if (chunk.message?.content) {
					yield { content: chunk.message.content };
				}
				if (chunk.done) {
					yield { done: true };
					return;
				}
			}
			yield { done: true };
		} catch (err) {
			yield {
				content: localize(
					'kcode.ollama.requestFailed',
					'Ollama request failed. Is Ollama running at {0}? Error: {1}',
					baseUrl,
					String(err),
				),
				done: true,
			};
		}
	}

	private fallbackModels(): readonly ModelInfo[] {
		return OLLAMA_FALLBACK_MODELS.map(m => ({
			id: qualifiedModelId(KcodeProvider.Local, m.id),
			label: `${m.label} (local)`,
			provider: KcodeProvider.Local,
		}));
	}

	private getBaseUrl(): string {
		const configured = this.configurationService.getValue<string>(KCODE_CONFIG_OLLAMA_BASE_URL);
		return (configured ?? 'http://127.0.0.1:11434').replace(/\/$/, '');
	}
}
