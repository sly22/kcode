/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { KeyCode, KeyMod } from '../../../../../base/common/keyCodes.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { isCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { localize, localize2 } from '../../../../../nls.js';
import { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IKcodeChatService } from '../../common/kcodeChatService.js';
import { KCODE_CONFIG_DEFAULT_MODEL } from '../../common/kcodeConstants.js';

export function registerKcodeInlineEditActions(): void {
	registerAction2(class KcodeInlineEditAction extends Action2 {
		constructor() {
			super({
				id: 'workbench.action.kcode.inlineEdit',
				title: localize2('kcode.inlineEdit', 'Kcode Inline Edit'),
				f1: true,
				category: localize2('kcode.category', 'Kcode'),
				keybinding: {
					primary: KeyMod.CtrlCmd | KeyCode.KeyK,
					when: undefined,
					weight: 200,
				},
			});
		}

		override async run(accessor: ServicesAccessor): Promise<void> {
			const editorService = accessor.get(IEditorService);
			const quickInput = accessor.get(IQuickInputService);
			const notificationService = accessor.get(INotificationService);
			const chatService = accessor.get(IKcodeChatService);
			const configurationService = accessor.get(IConfigurationService);

			const control = editorService.activeTextEditorControl;
			if (!isCodeEditor(control)) {
				notificationService.info(localize('kcode.inlineEdit.noEditor', 'Open a file and select code to use Kcode inline edit.'));
				return;
			}

			const model = control.getModel();
			const selection = control.getSelection();
			if (!model || !selection || selection.isEmpty()) {
				notificationService.info(localize('kcode.inlineEdit.noSelection', 'Select code in the editor, then press Ctrl+K.'));
				return;
			}

			const selectedText = model.getValueInRange(selection);
			const instruction = await quickInput.input({
				prompt: localize('kcode.inlineEdit.prompt', 'Describe how to transform the selection'),
				placeHolder: localize('kcode.inlineEdit.placeholder', 'e.g. Add error handling, convert to async/await…'),
				ignoreFocusLost: true,
			});
			if (!instruction) {
				return;
			}

			const modelId = configurationService.getValue<string>(KCODE_CONFIG_DEFAULT_MODEL) ?? 'openai:gpt-4o';
			const cts = new CancellationTokenSource();
			let result = '';

			for await (const delta of chatService.sendMessage({
				model: modelId,
				messages: [
					{
						role: 'system',
						content: 'You are a code editing assistant. Return only the transformed code without markdown fences or explanation.',
					},
					{
						role: 'user',
						content: `Instruction:\n${instruction}\n\nSelected code:\n\`\`\`\n${selectedText}\n\`\`\``,
					},
				],
			}, cts.token)) {
				if (delta.content) {
					result += delta.content;
				}
				if (delta.done) {
					break;
				}
			}

			if (!result.trim()) {
				notificationService.warn(localize('kcode.inlineEdit.emptyResult', 'Kcode returned an empty edit.'));
				return;
			}

			notificationService.info(
				localize('kcode.inlineEdit.preview', 'Kcode inline edit (preview):\n{0}', result.slice(0, 500))
			);
		}
	});
}
