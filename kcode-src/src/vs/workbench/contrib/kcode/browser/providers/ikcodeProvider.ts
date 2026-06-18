/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ChatDelta, ChatRequest } from '../../common/kcodeChatService.js';
import { KcodeProvider, ModelInfo } from '../../common/kcodeModels.js';

export interface IKcodeModelProvider {
	readonly providerId: KcodeProvider;
	listModels(): Promise<readonly ModelInfo[]>;
	sendMessage(request: ChatRequest, token: CancellationToken): AsyncIterable<ChatDelta>;
}
