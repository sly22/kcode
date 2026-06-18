/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ChatDelta, ChatRequest } from '../../common/kcodeChatService.js';
import { KCODE_CONFIG_OPENAI_API_KEY, KCODE_CONFIG_OPENAI_BASE_URL } from '../../common/kcodeConstants.js';
import { KcodeProvider, ModelInfo, qualifiedModelId } from '../../common/kcodeModels.js';
import { IKcodeModelProvider } from './ikcodeProvider.js';

const OPENAI_MODELS: ReadonlyArray<{ id: string; label: string }> = [
	{ id: 'gpt-4o', label: 'GPT-4o' },
	{ id: 'gpt-4.1', label: 'GPT-4.1' },
	{ id: 'o3', label: 'o3' },
];

export class OpenAIProvider implements IKcodeModelProvider {
	readonly providerId = KcodeProvider.OpenAI;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) { }

	async listModels(): Promise<readonly ModelInfo[]> {
		return OPENAI_MODELS.map(m => ({
			id: qualifiedModelId(KcodeProvider.OpenAI, m.id),
			label: m.label,
			provider: KcodeProvider.OpenAI,
		}));
	}

	async *sendMessage(request: ChatRequest, _token: CancellationToken): AsyncIterable<ChatDelta> {
		const apiKey = this.configurationService.getValue<string>(KCODE_CONFIG_OPENAI_API_KEY);
		const baseUrl = this.configurationService.getValue<string>(KCODE_CONFIG_OPENAI_BASE_URL);

		if (!apiKey) {
			yield {
				content: localize(
					'kcode.openai.noApiKey',
					'OpenAI API key is not configured. Set `{0}` in settings.',
					KCODE_CONFIG_OPENAI_API_KEY
				),
				done: true,
			};
			return;
		}

		const lastUser = [...request.messages].reverse().find(m => m.role === 'user');
		yield {
			content: localize(
				'kcode.openai.stubResponse',
				'[OpenAI stub · {0}] {1}',
				baseUrl ?? 'default',
				lastUser?.content ?? ''
			),
			done: true,
		};
	}
}
