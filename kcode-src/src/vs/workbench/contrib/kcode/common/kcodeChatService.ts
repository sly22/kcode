/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../../base/common/cancellation.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ModelInfo } from './kcodeModels.js';

export interface ChatMessage {
	readonly role: 'user' | 'assistant' | 'system';
	readonly content: string;
}

export interface ChatDelta {
	readonly content?: string;
	readonly done?: boolean;
}

export interface ToolSpec {
	readonly name: string;
	readonly description: string;
}

export interface ContextItem {
	readonly kind: 'file' | 'selection' | 'terminal' | 'problems' | 'mention';
	readonly uri?: string;
	readonly content?: string;
}

export interface ChatRequest {
	readonly messages: readonly ChatMessage[];
	readonly model: string;
	readonly tools?: readonly ToolSpec[];
	readonly context?: readonly ContextItem[];
}

export const IKcodeChatService = createDecorator<IKcodeChatService>('kcodeChatService');

export interface IKcodeChatService {
	readonly _serviceBrand: undefined;

	sendMessage(request: ChatRequest, token: CancellationToken): AsyncIterable<ChatDelta>;
	listModels(): Promise<readonly ModelInfo[]>;
}
