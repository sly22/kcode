/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { KeyCode, KeyMod } from '../../../../../base/common/keyCodes.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { isCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { localize, localize2 } from '../../../../../nls.js';
import { ServicesAccessor } from '../../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService, IQuickPickItem } from '../../../../../platform/quickinput/common/quickInput.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IKcodeChatService } from '../../common/kcodeChatService.js';
import { stripMarkdownCodeFences } from '../../common/kcodeCodeUtils.js';
import { KCODE_CONFIG_DEFAULT_MODEL } from '../../common/kcodeConstants.js';
import { KCODE_DEFAULT_SYSTEM_PROMPT } from '../../common/kcodeSystemPrompt.js';

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
						content: `${KCODE_DEFAULT_SYSTEM_PROMPT}\n\n선택된 코드만 변환한 결과를 반환하세요. 마크다운 펜스나 설명 없이 코드만 출력합니다.`,
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

			const cleaned = stripMarkdownCodeFences(result);
			if (!cleaned) {
				notificationService.warn(localize('kcode.inlineEdit.emptyResult', 'Kcode returned an empty edit.'));
				return;
			}

			const preview = cleaned.length > 400 ? `${cleaned.slice(0, 400)}…` : cleaned;
			const items: IQuickPickItem[] = [
				{
					label: localize('kcode.inlineEdit.apply', 'Apply edit'),
					description: preview.replace(/\n/g, ' '),
				},
				{
					label: localize('kcode.inlineEdit.discard', 'Discard'),
					description: localize('kcode.inlineEdit.discard.desc', 'Keep the original selection'),
				},
			];

			const picked = await quickInput.pick(items, {
				placeHolder: localize('kcode.inlineEdit.review', 'Review Kcode inline edit'),
				ignoreFocusLost: true,
			});

			if (picked?.label === items[0].label) {
				control.executeEdits('kcode-inline-edit', [{
					range: selection,
					text: cleaned,
				}]);
				control.focus();
				notificationService.info(localize('kcode.inlineEdit.applied', 'Kcode inline edit applied.'));
			}
		}
	});
}
