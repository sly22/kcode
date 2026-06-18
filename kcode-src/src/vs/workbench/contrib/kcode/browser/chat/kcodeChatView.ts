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
import { IKcodeAgentService } from '../agent/kcodeAgentService.js';
import { AgentToolCall } from '../../common/kcodeAgentTools.js';
import { KCODE_AGENT_TOOLS } from '../../common/kcodeAgentTools.js';
import { ChatMessage, ContextItem, IKcodeChatService } from '../../common/kcodeChatService.js';
import { KCODE_CONFIG_AGENT_MODE, KCODE_CONFIG_DEFAULT_MODEL } from '../../common/kcodeConstants.js';
import { getActiveMentionFilter, insertMentionAtCursor, parseMentions } from '../../common/kcodeMentionParser.js';
import { resolveMentions } from '../../common/kcodeMentionResolver.js';
import { KCODE_DEFAULT_SYSTEM_PROMPT } from '../../common/kcodeSystemPrompt.js';
import { loadWorkspaceRules } from '../../common/kcodeWorkspaceRules.js';
import { KcodeMentionPicker } from './kcodeMentionPicker.js';
import { KcodeModelPicker } from './kcodeModelPicker.js';

const MAX_AGENT_TURNS = 8;

interface ToolCallUiState {
	readonly call: AgentToolCall;
	readonly resolve: (approved: boolean) => void;
}

export class KcodeChatView extends ViewPane {

	private readonly localDisposables = this._register(new DisposableStore());
	private messagesContainer: HTMLElement | undefined;
	private inputElement: HTMLTextAreaElement | undefined;
	private inputArea: HTMLElement | undefined;
	private attachmentsContainer: HTMLElement | undefined;
	private agentBanner: HTMLElement | undefined;
	private modelPicker: KcodeModelPicker | undefined;
	private mentionPicker: KcodeMentionPicker | undefined;
	private readonly history: ChatMessage[] = [];
	private readonly attachments: ContextItem[] = [];
	private agentModeEnabled = false;
	private pendingToolUi: ToolCallUiState | undefined;

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
		@IKcodeAgentService private readonly agentService: IKcodeAgentService,
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
		this.inputArea = dom.append(root, dom.$('.kcode-chat-input-area'));
		this.attachmentsContainer = dom.append(this.inputArea, dom.$('.kcode-chat-attachments'));

		this.modelPicker = this.localDisposables.add(
			this.instantiationService.createInstance(KcodeModelPicker, header)
		);
		void this.modelPicker.render();

		this.mentionPicker = this.localDisposables.add(
			this.instantiationService.createInstance(KcodeMentionPicker, this.inputArea)
		);

		this.renderWelcome();
		this.renderAgentBanner();

		const toolbar = dom.append(this.inputArea, dom.$('.kcode-chat-toolbar'));
		this.addToolbarButton(toolbar, localize('kcode.chat.attachFile', 'Attach file'), () => this.attachActiveFile());
		this.addToolbarButton(toolbar, localize('kcode.chat.attachSelection', 'Attach selection'), () => this.attachSelection());
		this.addToolbarButton(toolbar, localize('kcode.chat.attachTerminal', 'Attach terminal'), () => this.attachTerminal());
		this.addToolbarButton(toolbar, localize('kcode.chat.attachProblems', 'Attach problems'), () => this.attachProblems());
		this.addToolbarButton(toolbar, localize('kcode.chat.agentMode', 'Agent mode'), () => this.toggleAgentMode());

		this.inputElement = dom.append(this.inputArea, dom.$('textarea.kcode-chat-input')) as HTMLTextAreaElement;
		this.inputElement.placeholder = localize('kcode.chat.inputPlaceholder', 'Ask Kcode… (@file, @symbol:name, @docs, @web — Enter to send, Shift+Enter for newline)');
		this.localDisposables.add(dom.addDisposableListener(this.inputElement, 'keydown', e => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault();
				this.mentionPicker?.hide();
				this.sendMessage();
			}
			if (e.key === 'Escape') {
				this.mentionPicker?.hide();
			}
		}));
		this.localDisposables.add(dom.addDisposableListener(this.inputElement, 'input', () => this.onInputChanged()));
		this.localDisposables.add(dom.addDisposableListener(this.inputElement, 'blur', () => {
			setTimeout(() => this.mentionPicker?.hide(), 150);
		}));

		const sendButton = this.localDisposables.add(new Button(this.inputArea, defaultButtonStyles));
		sendButton.label = localize('kcode.chat.send', 'Send');
		this.localDisposables.add(sendButton.onDidClick(() => this.sendMessage()));
		sendButton.element.classList.add('kcode-chat-send');
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
	}

	private onInputChanged(): void {
		if (!this.inputElement || !this.mentionPicker) {
			return;
		}
		const filter = getActiveMentionFilter(this.inputElement.value, this.inputElement.selectionStart);
		if (filter === undefined) {
			this.mentionPicker.hide();
			return;
		}
		this.mentionPicker.show(filter, item => {
			if (!this.inputElement) {
				return;
			}
			const { text, cursor } = insertMentionAtCursor(
				this.inputElement.value,
				this.inputElement.selectionStart,
				item.insertText,
			);
			this.inputElement.value = text;
			this.inputElement.selectionStart = cursor;
			this.inputElement.selectionEnd = cursor;
			this.inputElement.focus();
		});
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
			'Kcode AI 채팅입니다.\n상단에서 모델을 선택하고 메시지를 입력하세요.\n@filename · @symbol:name · @docs · @web 멘션, 파일·선택·터미널·문제 첨부\nCtrl+K: 선택 영역 인라인 편집 · Tab: LLM 고스트 자동완성 (kcode.privacy.sendCode 필요)\nAgent mode: read_file / search / terminal (채팅에서 승인)\n워크스페이스 룰: .kcode/rules/*.md\nAPI 키: 명령 팔레트 → "Kcode: Set OpenAI API Key" / "Set Anthropic API Key"\n로컬: Ollama (기본 http://127.0.0.1:11434)'
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
			'Agent mode — tool calls appear in chat with Approve / Reject buttons.',
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
			if (message.role === 'tool') {
				const el = dom.append(this.messagesContainer, dom.$('.kcode-chat-message.tool'));
				el.textContent = localize('kcode.chat.toolResult', '[Tool result]\n{0}', message.content);
				continue;
			}
			const el = dom.append(this.messagesContainer, dom.$(`.kcode-chat-message.${message.role}`));
			el.textContent = message.content;
		}
		if (streamingAssistant !== undefined) {
			const el = dom.append(this.messagesContainer, dom.$('.kcode-chat-message.assistant.streaming'));
			el.textContent = streamingAssistant;
		}
		if (this.pendingToolUi) {
			this.renderToolApprovalCard(this.pendingToolUi);
		}
		this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
	}

	private renderToolApprovalCard(state: ToolCallUiState): void {
		if (!this.messagesContainer) {
			return;
		}
		const card = dom.append(this.messagesContainer, dom.$('.kcode-chat-tool-call'));
		const title = dom.append(card, dom.$('.kcode-chat-tool-call-title'));
		title.textContent = localize('kcode.chat.toolCall', 'Agent tool call: {0}', state.call.name);

		const args = dom.append(card, dom.$('.kcode-chat-tool-call-args'));
		args.textContent = JSON.stringify(state.call.args, null, 2);

		const actions = dom.append(card, dom.$('.kcode-chat-tool-call-actions'));
		const approve = dom.append(actions, dom.$('button.kcode-chat-tool-approve')) as HTMLButtonElement;
		approve.textContent = localize('kcode.agent.approve', 'Approve');
		const reject = dom.append(actions, dom.$('button.kcode-chat-tool-reject')) as HTMLButtonElement;
		reject.textContent = localize('kcode.agent.deny', 'Deny');

		approve.onclick = () => state.resolve(true);
		reject.onclick = () => state.resolve(false);
	}

	private promptToolApproval(call: AgentToolCall): Promise<boolean> {
		return new Promise(resolve => {
			this.pendingToolUi = {
				call,
				resolve: approved => {
					this.pendingToolUi = undefined;
					resolve(approved);
					this.renderMessages();
				},
			};
			this.renderMessages();
		});
	}

	private async buildSystemMessage(): Promise<ChatMessage> {
		const rules = await loadWorkspaceRules(this.fileService, this.workspaceService);
		const content = rules
			? `${KCODE_DEFAULT_SYSTEM_PROMPT}\n\n${rules}`
			: KCODE_DEFAULT_SYSTEM_PROMPT;
		return { role: 'system', content };
	}

	private withSystemMessage(messages: ChatMessage[]): ChatMessage[] {
		const withoutSystem = messages.filter(m => m.role !== 'system');
		// system message is prepended async in callers via buildSystemMessage
		return withoutSystem;
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
		const resolvedMentions = await resolveMentions(mentions, this.fileService, this.workspaceService, this.editorService);
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

		const conversationMessages: ChatMessage[] = [
			...this.history.slice(0, -1),
			{ role: 'user', content: promptText },
		];

		const systemMessage = await this.buildSystemMessage();
		const messagesWithSystem = [systemMessage, ...this.withSystemMessage(conversationMessages)];

		if (this.agentModeEnabled) {
			await this.runAgentLoop(messagesWithSystem, model);
		} else {
			await this.runSingleTurn(messagesWithSystem, model);
		}
	}

	private async runSingleTurn(messages: ChatMessage[], model: string): Promise<void> {
		const cts = new CancellationTokenSource();
		let assistantText = '';
		this.history.push({ role: 'assistant', content: '' });

		try {
			for await (const delta of this.chatService.sendMessage({ messages, model }, cts.token)) {
				if (delta.content) {
					assistantText += delta.content;
					this.history[this.history.length - 1] = { role: 'assistant', content: assistantText };
					this.renderMessages(assistantText);
				}
				if (delta.done) {
					break;
				}
			}
		} catch (err) {
			assistantText = localize('kcode.chat.streamError', 'Chat error: {0}', String(err));
		}

		this.history[this.history.length - 1] = { role: 'assistant', content: assistantText };
		this.renderMessages();
	}

	private async runAgentLoop(initialMessages: ChatMessage[], model: string): Promise<void> {
		const cts = new CancellationTokenSource();
		let messages = [...initialMessages];

		for (let turn = 0; turn < MAX_AGENT_TURNS; turn++) {
			let assistantText = '';
			let toolCalls: AgentToolCall[] = [];
			this.history.push({ role: 'assistant', content: '' });

			try {
				for await (const delta of this.chatService.sendMessage({
					messages,
					model,
					tools: KCODE_AGENT_TOOLS,
				}, cts.token)) {
					if (delta.content) {
						assistantText += delta.content;
						this.history[this.history.length - 1] = { role: 'assistant', content: assistantText };
						this.renderMessages(assistantText);
					}
					if (delta.toolCalls && delta.toolCalls.length > 0) {
						toolCalls = [...delta.toolCalls];
					}
					if (delta.done) {
						break;
					}
				}
			} catch (err) {
				this.history[this.history.length - 1] = {
					role: 'assistant',
					content: localize('kcode.agent.streamError', 'Agent error: {0}', String(err)),
				};
				this.renderMessages();
				return;
			}

			if (toolCalls.length === 0) {
				this.history[this.history.length - 1] = { role: 'assistant', content: assistantText };
				this.renderMessages();
				return;
			}

			const assistantWithTools: ChatMessage = {
				role: 'assistant',
				content: assistantText,
				toolCalls,
			};
			this.history[this.history.length - 1] = assistantWithTools;
			messages = [...messages, assistantWithTools];

			let rejectedBatch = false;
			for (const call of toolCalls) {
				let approved: boolean;
				if (rejectedBatch) {
					approved = false;
				} else {
					approved = await this.promptToolApproval(call);
					if (!approved) {
						rejectedBatch = true;
					}
				}
				const result = await this.agentService.executeTool(call, approved);
				const toolMessage: ChatMessage = {
					role: 'tool',
					content: result.output,
					toolCallId: call.id ?? `call_${call.name}`,
				};
				this.history.push(toolMessage);
				messages = [...messages, toolMessage];
				this.renderMessages();
			}
		}

		this.history.push({
			role: 'assistant',
			content: localize('kcode.agent.maxTurns', 'Agent stopped after maximum tool turns.'),
		});
		this.renderMessages();
	}
}
