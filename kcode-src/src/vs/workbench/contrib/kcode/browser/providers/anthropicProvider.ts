/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ChatDelta, ChatRequest } from '../../common/kcodeChatService.js';
import { KCODE_CONFIG_ANTHROPIC_API_KEY, KCODE_CONFIG_ANTHROPIC_BASE_URL } from '../../common/kcodeConstants.js';
import { KcodeProvider, ModelInfo, qualifiedModelId } from '../../common/kcodeModels.js';
import { IKcodeModelProvider } from './ikcodeProvider.js';

const ANTHROPIC_MODELS: ReadonlyArray<{ id: string; label: string }> = [
	{ id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
	{ id: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
	{ id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
];

export class AnthropicProvider implements IKcodeModelProvider {
	readonly providerId = KcodeProvider.Anthropic;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) { }

	async listModels(): Promise<readonly ModelInfo[]> {
		return ANTHROPIC_MODELS.map(m => ({
			id: qualifiedModelId(KcodeProvider.Anthropic, m.id),
			label: m.label,
			provider: KcodeProvider.Anthropic,
		}));
	}

	async *sendMessage(request: ChatRequest, _token: CancellationToken): AsyncIterable<ChatDelta> {
		const apiKey = this.configurationService.getValue<string>(KCODE_CONFIG_ANTHROPIC_API_KEY);

		if (!apiKey) {
			yield {
				content: localize(
					'kcode.anthropic.noApiKey',
					'Anthropic API key is not configured. Set `{0}` in settings.',
					KCODE_CONFIG_ANTHROPIC_API_KEY
				),
				done: true,
			};
			return;
		}

		const baseUrl = this.configurationService.getValue<string>(KCODE_CONFIG_ANTHROPIC_BASE_URL);
		const lastUser = [...request.messages].reverse().find(m => m.role === 'user');
		yield {
			content: localize(
				'kcode.anthropic.stubResponse',
				'[Anthropic stub · {0}] {1}',
				baseUrl ?? 'default',
				lastUser?.content ?? ''
			),
			done: true,
		};
	}
}
