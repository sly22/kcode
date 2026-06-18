/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable, IDisposable } from '../../../../../base/common/lifecycle.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { InlineCompletionContext, InlineCompletions, InlineCompletionsProvider } from '../../../../../editor/common/languages.js';
import { ITextModel } from '../../../../../editor/common/model.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { KCODE_CONFIG_TAB_COMPLETION } from '../../common/kcodeConstants.js';

/**
 * Tab completion skeleton — registers an inline completion provider (returns no suggestions until LLM wiring).
 */
export function registerKcodeInlineCompletion(
	languageFeaturesService: ILanguageFeaturesService,
	configurationService: IConfigurationService,
): IDisposable {
	const provider: InlineCompletionsProvider = {
		provideInlineCompletions: async (
			model: ITextModel,
			position: Position,
			_context: InlineCompletionContext,
			_token: CancellationToken,
		): Promise<InlineCompletions | null> => {
			const enabled = configurationService.getValue<boolean>(KCODE_CONFIG_TAB_COMPLETION) ?? true;
			if (!enabled) {
				return null;
			}

			const line = model.getLineContent(position.lineNumber);
			const textBefore = line.substring(0, position.column - 1);
			if (textBefore.trim().length < 3) {
				return null;
			}

			// Skeleton: no ghost text yet — provider registered for future LLM integration.
			return { items: [] };
		},
		disposeInlineCompletions: () => { },
	};

	return languageFeaturesService.inlineCompletionsProvider.register({ pattern: '**' }, provider);
}

export class KcodeInlineCompletionContribution extends Disposable {
	static readonly ID = 'workbench.contrib.kcodeInlineCompletion';

	constructor(
		@ILanguageFeaturesService languageFeaturesService: ILanguageFeaturesService,
		@IConfigurationService configurationService: IConfigurationService,
	) {
		super();
		this._register(registerKcodeInlineCompletion(languageFeaturesService, configurationService));
	}
}
