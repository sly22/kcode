/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IRequestService } from '../../../../../platform/request/common/request.js';
import { ChatDelta, ChatRequest } from '../../common/kcodeChatService.js';
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
	delta?: { type?: string; text?: string };
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

		try {
			for await (const data of fetchSseData(this.requestService, {
				method: 'POST',
				url: `${baseUrl}/v1/messages`,
				headers: {
					'x-api-key': apiKey,
					'anthropic-version': '2023-06-01',
				},
				body: {
					model,
					max_tokens: 4096,
					stream: true,
					messages: request.messages
						.filter(m => m.role !== 'system')
						.map(m => ({ role: m.role, content: m.content })),
					system: request.messages.find(m => m.role === 'system')?.content,
				},
				callSite: 'AnthropicProvider.sendMessage',
			}, token)) {
				const event = JSON.parse(data) as AnthropicStreamEvent;
				if (event.error?.message) {
					yield { content: event.error.message, done: true };
					return;
				}
				if (event.type === 'content_block_delta' && event.delta?.text) {
					yield { content: event.delta.text };
				}
				if (event.type === 'message_stop') {
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

	private getBaseUrl(): string {
		const configured = this.configurationService.getValue<string>(KCODE_CONFIG_ANTHROPIC_BASE_URL);
		return (configured ?? 'https://api.anthropic.com').replace(/\/$/, '');
	}
}
