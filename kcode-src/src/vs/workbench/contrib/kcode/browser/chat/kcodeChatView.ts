/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import './media/kcode.css';
import * as dom from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { isCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { ViewPane } from '../../../../browser/parts/views/viewPane.js';
import { IViewPaneOptions } from '../../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ChatMessage, ContextItem, IKcodeChatService } from '../../common/kcodeChatService.js';
import { KCODE_CONFIG_DEFAULT_MODEL } from '../../common/kcodeConstants.js';
import { parseMentions } from '../../common/kcodeMentionParser.js';
import { KcodeModelPicker } from './kcodeModelPicker.js';

export class KcodeChatView extends ViewPane {

	private readonly localDisposables = this._register(new DisposableStore());
	private messagesContainer: HTMLElement | undefined;
	private inputElement: HTMLTextAreaElement | undefined;
	private attachmentsContainer: HTMLElement | undefined;
	private modelPicker: KcodeModelPicker | undefined;
	private readonly history: ChatMessage[] = [];
	private readonly attachments: ContextItem[] = [];

	constructor(
		options: IViewPaneOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
		@IKcodeChatService private readonly chatService: IKcodeChatService,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		const root = dom.append(container, dom.$('.kcode-chat'));
		const header = dom.append(root, dom.$('.kcode-chat-header'));
		this.messagesContainer = dom.append(root, dom.$('.kcode-chat-messages'));
		const inputArea = dom.append(root, dom.$('.kcode-chat-input-area'));
		this.attachmentsContainer = dom.append(inputArea, dom.$('.kcode-chat-attachments'));

		this.modelPicker = this.localDisposables.add(
			this.instantiationService.createInstance(KcodeModelPicker, header)
		);
		void this.modelPicker.render();

		this.renderWelcome();

		const toolbar = dom.append(inputArea, dom.$('.kcode-chat-toolbar'));
		const attachButton = this.localDisposables.add(new Button(toolbar, defaultButtonStyles));
		attachButton.label = localize('kcode.chat.attachFile', 'Attach file');
		attachButton.element.classList.add('kcode-chat-attach');
		this.localDisposables.add(attachButton.onDidClick(() => this.attachActiveFile()));

		const attachSelectionButton = this.localDisposables.add(new Button(toolbar, defaultButtonStyles));
		attachSelectionButton.label = localize('kcode.chat.attachSelection', 'Attach selection');
		attachSelectionButton.element.classList.add('kcode-chat-attach');
		this.localDisposables.add(attachSelectionButton.onDidClick(() => this.attachSelection()));

		this.inputElement = dom.append(inputArea, dom.$('textarea.kcode-chat-input')) as HTMLTextAreaElement;
		this.inputElement.placeholder = localize('kcode.chat.inputPlaceholder', 'Ask Kcode… (@file, Enter to send, Shift+Enter for newline)');
		this.localDisposables.add(dom.addDisposableListener(this.inputElement, 'keydown', e => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.sendMessage();
			}
		}));

		const sendButton = this.localDisposables.add(new Button(inputArea, defaultButtonStyles));
		sendButton.label = localize('kcode.chat.send', 'Send');
		this.localDisposables.add(sendButton.onDidClick(() => this.sendMessage()));
		sendButton.element.classList.add('kcode-chat-send');
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
	}

	private renderWelcome(): void {
		if (!this.messagesContainer) {
			return;
		}
		dom.clearNode(this.messagesContainer);
		const welcome = dom.append(this.messagesContainer, dom.$('.kcode-chat-welcome'));
		welcome.textContent = localize(
			'kcode.chat.welcome',
			'Kcode AI 채팅입니다.\n상단에서 모델을 선택하고 메시지를 입력하세요.\n파일·선택 영역을 첨부하거나 @filename 으로 멘션할 수 있습니다.\nAPI 키: 명령 팔레트 → "Kcode: Set OpenAI API Key" / "Set Anthropic API Key"\n로컬: Ollama (기본 http://127.0.0.1:11434)'
		);
	}

	private renderAttachments(): void {
		if (!this.attachmentsContainer) {
			return;
		}
		dom.clearNode(this.attachmentsContainer);
		for (const item of this.attachments) {
			const chip = dom.append(this.attachmentsContainer, dom.$('.kcode-chat-attachment-chip'));
			chip.textContent = item.uri ?? item.kind;
		}
	}

	private renderMessages(streamingAssistant?: string): void {
		if (!this.messagesContainer) {
			return;
		}
		dom.clearNode(this.messagesContainer);
		for (const message of this.history) {
			const el = dom.append(this.messagesContainer, dom.$(`.kcode-chat-message.${message.role}`));
			el.textContent = message.content;
		}
		if (streamingAssistant !== undefined) {
			const el = dom.append(this.messagesContainer, dom.$('.kcode-chat-message.assistant.streaming'));
			el.textContent = streamingAssistant;
		}
	}

	private attachActiveFile(): void {
		const control = this.editorService.activeTextEditorControl;
		if (!isCodeEditor(control)) {
			return;
		}
		const model = control.getModel();
		if (!model) {
			return;
		}
		const uri = model.uri.toString();
		if (this.attachments.some(a => a.uri === uri)) {
			return;
		}
		this.attachments.push({
			kind: 'file',
			uri,
			content: model.getValue(),
		});
		this.renderAttachments();
	}

	private attachSelection(): void {
		const control = this.editorService.activeTextEditorControl;
		if (!isCodeEditor(control)) {
			return;
		}
		const model = control.getModel();
		const selection = control.getSelection();
		if (!model || !selection || selection.isEmpty()) {
			return;
		}
		const uri = model.uri.toString();
		const content = model.getValueInRange(selection);
		this.attachments.push({
			kind: 'selection',
			uri,
			content,
		});
		this.renderAttachments();
	}

	private buildContextPrompt(text: string, mentions: readonly ContextItem[]): string {
		const blocks: string[] = [];
		const allContext = [...this.attachments, ...mentions];
		for (const item of allContext) {
			if (!item.content) {
				continue;
			}
			const label = item.kind === 'selection' ? 'selection' : 'file';
			blocks.push(`[${label}: ${item.uri ?? 'unknown'}]\n${item.content}`);
		}
		if (blocks.length === 0) {
			return text;
		}
		return `${text}\n\n---\nContext:\n${blocks.join('\n\n')}`;
	}

	private async sendMessage(): Promise<void> {
		if (!this.inputElement) {
			return;
		}
		const rawText = this.inputElement.value.trim();
		if (!rawText) {
			return;
		}

		const { cleanText, mentions } = parseMentions(rawText);
		const contextItems = [...this.attachments, ...mentions];
		const promptText = this.buildContextPrompt(cleanText, mentions);

		this.inputElement.value = '';
		this.history.push({ role: 'user', content: rawText });
		this.attachments.length = 0;
		this.renderAttachments();
		this.renderMessages();

		const model = this.modelPicker?.selectedModel
			|| this.configurationService.getValue<string>(KCODE_CONFIG_DEFAULT_MODEL)
			|| '';

		const cts = new CancellationTokenSource();
		let assistantText = '';
		this.history.push({ role: 'assistant', content: '' });

		for await (const delta of this.chatService.sendMessage({
			messages: [
				...this.history.slice(0, -1),
				{ role: 'user', content: promptText },
			],
			model,
			context: contextItems,
		}, cts.token)) {
			if (delta.content) {
				assistantText += delta.content;
				this.history[this.history.length - 1] = { role: 'assistant', content: assistantText };
				this.renderMessages(assistantText);
			}
			if (delta.done) {
				break;
			}
		}

		this.history[this.history.length - 1] = { role: 'assistant', content: assistantText };
		this.renderMessages();
	}
}
