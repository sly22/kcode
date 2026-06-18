/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { Disposable, IDisposable } from '../../../../../base/common/lifecycle.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { InlineCompletion, InlineCompletionContext, InlineCompletions, InlineCompletionsProvider } from '../../../../../editor/common/languages.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IKcodeChatService } from '../../common/kcodeChatService.js';
import { stripMarkdownCodeFences } from '../../common/kcodeCodeUtils.js';
import {
	KCODE_CONFIG_DEFAULT_MODEL,
	KCODE_CONFIG_PRIVACY_SEND_CODE,
	KCODE_CONFIG_TAB_COMPLETION,
	KCODE_TAB_COMPLETION_DEBOUNCE_MS,
	KCODE_TAB_COMPLETION_MAX_GHOST_CHARS,
} from '../../common/kcodeConstants.js';
import { KCODE_TAB_COMPLETION_SYSTEM_PROMPT } from '../../common/kcodeSystemPrompt.js';

interface PendingCompletion {
	readonly cts: CancellationTokenSource;
	readonly timer: ReturnType<typeof setTimeout>;
}

/**
 * Tab inline completion — debounced LLM ghost text at cursor.
 */
export function registerKcodeInlineCompletion(
	languageFeaturesService: ILanguageFeaturesService,
	configurationService: IConfigurationService,
	chatService: IKcodeChatService,
): IDisposable {
	const pendingByModel = new Map<string, PendingCompletion>();

	const provider: InlineCompletionsProvider = {
		provideInlineCompletions: async (
			model: ITextModel,
			position: Position,
			_context: InlineCompletionContext,
			token: CancellationToken,
		): Promise<InlineCompletions | null> => {
			const enabled = configurationService.getValue<boolean>(KCODE_CONFIG_TAB_COMPLETION) ?? true;
			if (!enabled) {
				return null;
			}

			const sendCode = configurationService.getValue<boolean>(KCODE_CONFIG_PRIVACY_SEND_CODE) ?? false;
			if (!sendCode) {
				return null;
			}

			const line = model.getLineContent(position.lineNumber);
			const textBefore = line.substring(0, position.column - 1);
			if (textBefore.trim().length < 3) {
				return null;
			}

			const modelKey = model.uri.toString();
			const existing = pendingByModel.get(modelKey);
			if (existing) {
				clearTimeout(existing.timer);
				existing.cts.cancel();
			}

			const cts = new CancellationTokenSource();
			const linked = token.onCancellationRequested(() => cts.cancel());

			const insertText = await new Promise<string | null>(resolve => {
				const timer = setTimeout(() => {
					pendingByModel.delete(modelKey);
					void fetchGhostText(model, position, chatService, configurationService, cts.token)
						.then(resolve)
						.catch(() => resolve(null));
				}, KCODE_TAB_COMPLETION_DEBOUNCE_MS);
				pendingByModel.set(modelKey, { cts, timer });
			});

			linked.dispose();
			if (!insertText || cts.token.isCancellationRequested || token.isCancellationRequested) {
				return null;
			}

			const item: InlineCompletion = {
				insertText,
				range: new Range(position.lineNumber, position.column, position.lineNumber, position.column),
			};
			return { items: [item], enableForwardStability: true };
		},
		disposeInlineCompletions: () => { },
	};

	return languageFeaturesService.inlineCompletionsProvider.register({ pattern: '**' }, provider);
}

async function fetchGhostText(
	model: ITextModel,
	position: Position,
	chatService: IKcodeChatService,
	configurationService: IConfigurationService,
	token: CancellationToken,
): Promise<string | null> {
	const modelId = configurationService.getValue<string>(KCODE_CONFIG_DEFAULT_MODEL) ?? 'openai:gpt-4o';
	const contextStart = Math.max(1, position.lineNumber - 8);
	const contextEnd = Math.min(model.getLineCount(), position.lineNumber + 2);
	const lines: string[] = [];
	for (let line = contextStart; line <= contextEnd; line++) {
		const content = model.getLineContent(line);
		const marker = line === position.lineNumber ? ' /* cursor */' : '';
		lines.push(`${line}: ${content}${marker}`);
	}

	const languageId = model.getLanguageId();
	let result = '';
	for await (const delta of chatService.sendMessage({
		model: modelId,
		messages: [
			{ role: 'system', content: KCODE_TAB_COMPLETION_SYSTEM_PROMPT },
			{
				role: 'user',
				content: `Language: ${languageId}\nFile: ${model.uri.path}\n\nCode context:\n${lines.join('\n')}\n\nContinue from cursor with the next code fragment only:`,
			},
		],
	}, token)) {
		if (delta.content) {
			result += delta.content;
		}
		if (delta.done) {
			break;
		}
	}

	const cleaned = stripMarkdownCodeFences(result).replace(/\r?\n/g, ' ').trim();
	if (!cleaned) {
		return null;
	}
	return cleaned.slice(0, KCODE_TAB_COMPLETION_MAX_GHOST_CHARS);
}

export class KcodeInlineCompletionContribution extends Disposable {
	static readonly ID = 'workbench.contrib.kcodeInlineCompletion';

	constructor(
		@ILanguageFeaturesService languageFeaturesService: ILanguageFeaturesService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKcodeChatService chatService: IKcodeChatService,
	) {
		super();
		this._register(registerKcodeInlineCompletion(languageFeaturesService, configurationService, chatService));
	}
}
