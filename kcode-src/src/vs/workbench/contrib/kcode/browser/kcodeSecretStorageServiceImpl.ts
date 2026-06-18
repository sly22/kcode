/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { ISecretStorageService } from '../../../../platform/secrets/common/secrets.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import {
	IKcodeSecretStorageService,
	KCODE_SECRET_ANTHROPIC_API_KEY,
	KCODE_SECRET_OPENAI_API_KEY,
	secretKeyForProvider,
} from '../common/kcodeSecretStorageService.js';
import { KcodeProvider } from '../common/kcodeModels.js';
import {
	KCODE_CONFIG_ANTHROPIC_API_KEY,
	KCODE_CONFIG_OPENAI_API_KEY,
} from '../common/kcodeConstants.js';

export class KcodeSecretStorageService extends Disposable implements IKcodeSecretStorageService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@ISecretStorageService private readonly secretStorageService: ISecretStorageService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) {
		super();
	}

	async getApiKey(provider: KcodeProvider.OpenAI | KcodeProvider.Anthropic): Promise<string | undefined> {
		const secretKey = secretKeyForProvider(provider);
		const fromSecret = await this.secretStorageService.get(secretKey);
		if (fromSecret) {
			return fromSecret;
		}

		const configKey = provider === KcodeProvider.OpenAI
			? KCODE_CONFIG_OPENAI_API_KEY
			: KCODE_CONFIG_ANTHROPIC_API_KEY;
		const fromConfig = this.configurationService.getValue<string>(configKey);
		if (fromConfig) {
			await this.setApiKey(provider, fromConfig);
			await this.configurationService.updateValue(configKey, undefined);
			return fromConfig;
		}

		return undefined;
	}

	async setApiKey(provider: KcodeProvider.OpenAI | KcodeProvider.Anthropic, value: string): Promise<void> {
		const secretKey = secretKeyForProvider(provider);
		await this.secretStorageService.set(secretKey, value);
	}

	async deleteApiKey(provider: KcodeProvider.OpenAI | KcodeProvider.Anthropic): Promise<void> {
		const secretKey = secretKeyForProvider(provider);
		await this.secretStorageService.delete(secretKey);
	}
}

export { KCODE_SECRET_OPENAI_API_KEY, KCODE_SECRET_ANTHROPIC_API_KEY };
