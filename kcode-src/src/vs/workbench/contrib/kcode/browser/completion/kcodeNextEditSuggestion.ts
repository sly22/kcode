/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { KCODE_CONFIG_NEXT_EDIT_SUGGESTION } from '../../common/kcodeConstants.js';

/**
 * Next Edit Suggestion placeholder — setting registered; full LLM jump-to-edit wiring is Phase 3+.
 */
export class KcodeNextEditSuggestionContribution extends Disposable {
	static readonly ID = 'workbench.contrib.kcodeNextEditSuggestion';

	constructor(
		@IConfigurationService configurationService: IConfigurationService,
	) {
		super();
		// Reserved for future: cursor jump suggestions when kcode.nextEditSuggestion.enabled is true.
		void configurationService.getValue<boolean>(KCODE_CONFIG_NEXT_EDIT_SUGGESTION);
	}
}
