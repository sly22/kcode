/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ChatDelta, ChatRequest, IKcodeChatService } from '../../common/kcodeChatService.js';
import { modelProviderPrefix, ModelInfo } from '../../common/kcodeModels.js';
import { AnthropicProvider } from './providers/anthropicProvider.js';
import { IKcodeModelProvider } from './providers/ikcodeProvider.js';
import { OpenAIProvider } from './providers/openaiProvider.js';

export class KcodeChatService extends Disposable implements IKcodeChatService {
	declare readonly _serviceBrand: undefined;

	private readonly providers: readonly IKcodeModelProvider[];

	constructor(
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();
		this.providers = [
			instantiationService.createInstance(OpenAIProvider),
			instantiationService.createInstance(AnthropicProvider),
		];
	}

	async listModels(): Promise<readonly ModelInfo[]> {
		const lists = await Promise.all(this.providers.map(p => p.listModels()));
		return lists.flat();
	}

	async *sendMessage(request: ChatRequest, token: CancellationToken): AsyncIterable<ChatDelta> {
		const provider = this.resolveProvider(request.model);
		if (!provider) {
			yield { content: `Unknown model: ${request.model}`, done: true };
			return;
		}
		yield* provider.sendMessage(request, token);
	}

	private resolveProvider(modelId: string): IKcodeModelProvider | undefined {
		const prefix = modelProviderPrefix(modelId);
		return this.providers.find(p => p.providerId === prefix);
	}
}
