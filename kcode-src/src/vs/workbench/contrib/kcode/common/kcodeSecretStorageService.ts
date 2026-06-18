/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { KcodeProvider } from './kcodeModels.js';

export const KCODE_SECRET_OPENAI_API_KEY = 'kcode.providers.openai.apiKey';
export const KCODE_SECRET_ANTHROPIC_API_KEY = 'kcode.providers.anthropic.apiKey';

export const IKcodeSecretStorageService = createDecorator<IKcodeSecretStorageService>('kcodeSecretStorageService');

export interface IKcodeSecretStorageService {
	readonly _serviceBrand: undefined;

	getApiKey(provider: KcodeProvider.OpenAI | KcodeProvider.Anthropic): Promise<string | undefined>;
	setApiKey(provider: KcodeProvider.OpenAI | KcodeProvider.Anthropic, value: string): Promise<void>;
	deleteApiKey(provider: KcodeProvider.OpenAI | KcodeProvider.Anthropic): Promise<void>;
}

export function secretKeyForProvider(provider: KcodeProvider.OpenAI | KcodeProvider.Anthropic): string {
	switch (provider) {
		case KcodeProvider.OpenAI:
			return KCODE_SECRET_OPENAI_API_KEY;
		case KcodeProvider.Anthropic:
			return KCODE_SECRET_ANTHROPIC_API_KEY;
	}
}
