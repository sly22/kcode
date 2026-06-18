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
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { IMarkerService } from '../../../../../platform/markers/common/markers.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { defaultButtonStyles } from '../../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { ViewPane } from '../../../../browser/parts/views/viewPane.js';
import { IViewPaneOptions } from '../../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { KCODE_AGENT_TOOLS } from '../../common/kcodeAgentTools.js';
import { ChatMessage, ContextItem, IKcodeChatService } from '../../common/kcodeChatService.js';
import { KCODE_CONFIG_AGENT_MODE, KCODE_CONFIG_DEFAULT_MODEL } from '../../common/kcodeConstants.js';
import { parseMentions } from '../../common/kcodeMentionParser.js';
import { resolveMentions } from '../../common/kcodeMentionResolver.js';
import { KcodeModelPicker } from './kcodeModelPicker.js';

export class KcodeChatView extends ViewPane {

	private readonly localDisposables = this._register(new DisposableStore());
	private messagesContainer: HTMLElement | undefined;
	private inputElement: HTMLTextAreaElement | undefined;
	private attachmentsContainer: HTMLElement | undefined;
	private agentBanner: HTMLElement | undefined;
	private modelPicker: KcodeModelPicker | undefined;
	private readonly history: ChatMessage[] = [];
	private readonly attachments: ContextItem[] = [];
	private agentModeEnabled = false;

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
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceService: IWorkspaceContextService,
		@ITerminalService private readonly terminalService: ITerminalService,
		@IMarkerService private readonly markerService: IMarkerService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
		this.agentModeEnabled = this.configurationService.getValue<boolean>(KCODE_CONFIG_AGENT_MODE) ?? false;
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		const root = dom.append(container, dom.$('.kcode-chat'));
		const header = dom.append(root, dom.$('.kcode-chat-header'));
		this.messagesContainer = dom.append(root, dom.$('.kcode-chat-messages'));
		this.agentBanner = dom.append(root, dom.$('.kcode-chat-agent-banner'));
		const inputArea = dom.append(root, dom.$('.kcode-chat-input-area'));
		this.attachmentsContainer = dom.append(inputArea, dom.$('.kcode-chat-attachments'));

		this.modelPicker = this.localDisposables.add(
			this.instantiationService.createInstance(KcodeModelPicker, header)
		);
		void this.modelPicker.render();

		this.renderWelcome();
		this.renderAgentBanner();

		const toolbar = dom.append(inputArea, dom.$('.kcode-chat-toolbar'));
		this.addToolbarButton(toolbar, localize('kcode.chat.attachFile', 'Attach file'), () => this.attachActiveFile());
		this.addToolbarButton(toolbar, localize('kcode.chat.attachSelection', 'Attach selection'), () => this.attachSelection());
		this.addToolbarButton(toolbar, localize('kcode.chat.attachTerminal', 'Attach terminal'), () => this.attachTerminal());
		this.addToolbarButton(toolbar, localize('kcode.chat.attachProblems', 'Attach problems'), () => this.attachProblems());
		this.addToolbarButton(toolbar, localize('kcode.chat.agentMode', 'Agent mode'), () => this.toggleAgentMode());

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

	private addToolbarButton(parent: HTMLElement, label: string, handler: () => void): void {
		const button = this.localDisposables.add(new Button(parent, defaultButtonStyles));
		button.label = label;
		button.element.classList.add('kcode-chat-attach');
		this.localDisposables.add(button.onDidClick(handler));
	}

	private renderWelcome(): void {
		if (!this.messagesContainer) {
			return;
		}
		dom.clearNode(this.messagesContainer);
		const welcome = dom.append(this.messagesContainer, dom.$('.kcode-chat-welcome'));
		welcome.textContent = localize(
			'kcode.chat.welcome',
			'Kcode AI 채팅입니다.\n상단에서 모델을 선택하고 메시지를 입력하세요.\n파일·선택·터미널·문제를 첨부하거나 @filename 으로 멘션할 수 있습니다.\nCtrl+K: 선택 영역 인라인 편집 (적용 확인 후 반영)\nAgent mode: read_file / search / terminal 도구 (승인 필요)\nAPI 키: 명령 팔레트 → "Kcode: Set OpenAI API Key" / "Set Anthropic API Key"\n로컬: Ollama (기본 http://127.0.0.1:11434)'
		);
	}

	private renderAgentBanner(): void {
		if (!this.agentBanner) {
			return;
		}
		dom.clearNode(this.agentBanner);
		if (!this.agentModeEnabled) {
			this.agentBanner.style.display = 'none';
			return;
		}
		this.agentBanner.style.display = 'block';
		this.agentBanner.textContent = localize(
			'kcode.chat.agentBanner',
			'Agent mode — tools (read_file, search, terminal) require approval before execution.',
		);
	}

	private toggleAgentMode(): void {
		this.agentModeEnabled = !this.agentModeEnabled;
		void this.configurationService.updateValue(KCODE_CONFIG_AGENT_MODE, this.agentModeEnabled);
		this.renderAgentBanner();
	}

	private renderAttachments(): void {
		if (!this.attachmentsContainer) {
			return;
		}
		dom.clearNode(this.attachmentsContainer);
		for (const item of this.attachments) {
			const chip = dom.append(this.attachmentsContainer, dom.$('.kcode-chat-attachment-chip'));
			chip.textContent = `${item.kind}: ${item.uri ?? 'unknown'}`;
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

	private attachTerminal(): void {
		const instance = this.terminalService.activeInstance;
		if (!instance) {
			return;
		}

		let content = instance.selection;
		if (!content && instance.xterm) {
			const buffer = instance.xterm.raw.buffer.active;
			const lines: string[] = [];
			const start = Math.max(0, buffer.length - 200);
			for (let i = start; i < buffer.length; i++) {
				lines.push(buffer.getLine(i)?.translateToString(true) ?? '');
			}
			content = lines.join('\n');
		}

		if (!content?.trim()) {
			return;
		}

		this.attachments.push({
			kind: 'terminal',
			uri: instance.title,
			content,
		});
		this.renderAttachments();
	}

	private attachProblems(): void {
		const markers = this.markerService.read({
			severities: MarkerSeverity.Error | MarkerSeverity.Warning,
		});

		if (markers.length === 0) {
			return;
		}

		const content = markers.slice(0, 100).map(m =>
			`${m.resource.path}:${m.startLineNumber}:${m.startColumn} [${MarkerSeverity.toString(m.severity)}] ${m.message}`
		).join('\n');

		this.attachments.push({
			kind: 'problems',
			uri: 'problems',
			content,
		});
		this.renderAttachments();
	}

	private buildContextPrompt(text: string, contextItems: readonly ContextItem[]): string {
		const blocks: string[] = [];
		for (const item of contextItems) {
			if (!item.content) {
				continue;
			}
			blocks.push(`[${item.kind}: ${item.uri ?? 'unknown'}]\n${item.content}`);
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
		const resolvedMentions = await resolveMentions(mentions, this.fileService, this.workspaceService);
		const contextItems = [...this.attachments, ...resolvedMentions];
		const promptText = this.buildContextPrompt(cleanText, contextItems);

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
			tools: this.agentModeEnabled ? KCODE_AGENT_TOOLS : undefined,
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
