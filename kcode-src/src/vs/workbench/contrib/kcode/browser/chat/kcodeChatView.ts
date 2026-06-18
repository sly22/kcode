/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import './media/kcode.css';
import * as dom from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
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
import { ChatMessage, IKcodeChatService } from '../../common/kcodeChatService.js';
import { KCODE_CONFIG_DEFAULT_MODEL } from '../../common/kcodeConstants.js';
import { KcodeModelPicker } from './kcodeModelPicker.js';

export class KcodeChatView extends ViewPane {

	private readonly localDisposables = this._register(new DisposableStore());
	private messagesContainer: HTMLElement | undefined;
	private inputElement: HTMLTextAreaElement | undefined;
	private modelPicker: KcodeModelPicker | undefined;
	private readonly history: ChatMessage[] = [];

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
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		const root = dom.append(container, dom.$('.kcode-chat'));
		const header = dom.append(root, dom.$('.kcode-chat-header'));
		this.messagesContainer = dom.append(root, dom.$('.kcode-chat-messages'));
		const inputArea = dom.append(root, dom.$('.kcode-chat-input-area'));

		this.modelPicker = this.localDisposables.add(
			this.instantiationService.createInstance(KcodeModelPicker, header)
		);
		void this.modelPicker.render();

		this.renderWelcome();

		this.inputElement = dom.append(inputArea, dom.$('textarea.kcode-chat-input')) as HTMLTextAreaElement;
		this.inputElement.placeholder = localize('kcode.chat.inputPlaceholder', 'Ask Kcode… (Enter to send, Shift+Enter for newline)');
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
			'Kcode AI 채팅입니다.\n상단에서 모델을 선택하고 메시지를 입력하세요.\nAPI 키는 설정(kcode.providers.*)에서 구성할 수 있습니다.'
		);
	}

	private renderMessages(): void {
		if (!this.messagesContainer) {
			return;
		}
		dom.clearNode(this.messagesContainer);
		for (const message of this.history) {
			const el = dom.append(this.messagesContainer, dom.$(`.kcode-chat-message.${message.role}`));
			el.textContent = message.content;
		}
	}

	private async sendMessage(): Promise<void> {
		if (!this.inputElement) {
			return;
		}
		const text = this.inputElement.value.trim();
		if (!text) {
			return;
		}

		this.inputElement.value = '';
		this.history.push({ role: 'user', content: text });
		this.renderMessages();

		const model = this.modelPicker?.selectedModel
			|| this.configurationService.getValue<string>(KCODE_CONFIG_DEFAULT_MODEL)
			|| '';

		const cts = new CancellationTokenSource();
		let assistantText = '';
		for await (const delta of this.chatService.sendMessage({
			messages: [...this.history],
			model,
		}, cts.token)) {
			if (delta.content) {
				assistantText += delta.content;
			}
			if (delta.done) {
				break;
			}
		}

		this.history.push({ role: 'assistant', content: assistantText });
		this.renderMessages();
	}
}
