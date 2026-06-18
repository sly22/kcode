/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as dom from '../../../../../base/browser/dom.js';
import { ISelectOptionItem, SelectBox } from '../../../../../base/browser/ui/selectBox/selectBox.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextViewService } from '../../../../../platform/contextview/browser/contextView.js';
import { getSelectBoxStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IKcodeChatService } from '../../common/kcodeChatService.js';
import { KCODE_CONFIG_DEFAULT_MODEL } from '../../common/kcodeConstants.js';
import { ModelInfo } from '../../common/kcodeModels.js';

export class KcodeModelPicker extends Disposable {

	private readonly _onDidChangeModel = this._register(new Emitter<string>());
	readonly onDidChangeModel = this._onDidChangeModel.event;

	private selectBox: SelectBox | undefined;
	private models: ModelInfo[] = [];
	private selectedModelId = '';

	constructor(
		private readonly parent: HTMLElement,
		@IKcodeChatService private readonly chatService: IKcodeChatService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IContextViewService private readonly contextViewService: IContextViewService,
	) {
		super();
	}

	get selectedModel(): string {
		return this.selectedModelId;
	}

	async render(): Promise<void> {
		const container = dom.append(this.parent, dom.$('.kcode-model-picker'));
		this.models = [...await this.chatService.listModels()];

		const configuredDefault = this.configurationService.getValue<string>(KCODE_CONFIG_DEFAULT_MODEL);
		this.selectedModelId = configuredDefault && this.models.some(m => m.id === configuredDefault)
			? configuredDefault
			: (this.models[0]?.id ?? '');

		const options: ISelectOptionItem[] = this.models.map(m => ({
			text: m.label,
			detail: m.provider,
		}));

		const selectedIndex = Math.max(0, this.models.findIndex(m => m.id === this.selectedModelId));
		this.selectBox = this._register(new SelectBox(
			options,
			selectedIndex,
			this.contextViewService,
			getSelectBoxStyles(),
			{ ariaLabel: localize('kcode.modelPicker.aria', 'Select AI model') }
		));
		this.selectBox.render(container);

		this._register(this.selectBox.onDidSelect(e => {
			const model = this.models[e.index];
			if (!model) {
				return;
			}
			this.selectedModelId = model.id;
			this.configurationService.updateValue(KCODE_CONFIG_DEFAULT_MODEL, model.id);
			this._onDidChangeModel.fire(model.id);
		}));
	}

	override dispose(): void {
		this.selectBox = undefined;
		super.dispose();
	}
}
