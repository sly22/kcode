/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Codicon } from '../../../../base/common/codicons.js';
import { KeyCode, KeyMod } from '../../../../base/common/keyCodes.js';
import { localize, localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ConfigurationScope, Extensions as ConfigurationExtensions, IConfigurationRegistry } from '../../../../platform/configuration/common/configurationRegistry.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IViewContainersRegistry, IViewsRegistry, ViewContainerLocation, Extensions as ViewExtensions } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { KcodeChatView } from './chat/kcodeChatView.js';
import { KcodeAgentService, IKcodeAgentService } from './agent/kcodeAgentService.js';
import { registerKcodeInlineEditActions } from './inlineEdit/kcodeInlineEdit.js';
import { KcodeChatService } from './kcodeChatServiceImpl.js';
import { KcodeSecretStorageService } from './kcodeSecretStorageServiceImpl.js';
import {
	KCODE_CHAT_VIEW_ID,
	KCODE_CONFIG_ANTHROPIC_BASE_URL,
	KCODE_CONFIG_DEFAULT_MODEL,
	KCODE_CONFIG_OPENAI_BASE_URL,
	KCODE_CONFIG_OLLAMA_BASE_URL,
	KCODE_CONFIG_PRIVACY_SEND_CODE,
	KCODE_CONFIG_AGENT_MODE,
	KCODE_VIEW_CONTAINER_ID,
} from '../common/kcodeConstants.js';
import { IKcodeChatService } from '../common/kcodeChatService.js';
import { IKcodeSecretStorageService } from '../common/kcodeSecretStorageService.js';
import { KcodeProvider } from '../common/kcodeModels.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';

registerSingleton(IKcodeChatService, KcodeChatService, InstantiationType.Delayed);
registerSingleton(IKcodeSecretStorageService, KcodeSecretStorageService, InstantiationType.Delayed);
registerSingleton(IKcodeAgentService, KcodeAgentService, InstantiationType.Delayed);

const kcodeViewIcon = registerIcon('kcode-view-icon', Codicon.sparkle, localize('kcodeViewIcon', 'View icon of the Kcode chat view.'));

const KCODE_VIEW_CONTAINER = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: KCODE_VIEW_CONTAINER_ID,
	title: localize2('kcode.viewContainer.label', 'Kcode'),
	icon: kcodeViewIcon,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [KCODE_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
	storageId: KCODE_VIEW_CONTAINER_ID,
	hideIfEmpty: false,
	order: 2,
}, ViewContainerLocation.AuxiliaryBar);

Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([{
	id: KCODE_CHAT_VIEW_ID,
	name: localize2('kcode.chat.view.name', 'Kcode Chat'),
	containerIcon: kcodeViewIcon,
	containerTitle: KCODE_VIEW_CONTAINER.title.value,
	singleViewPaneContainerTitle: KCODE_VIEW_CONTAINER.title.value,
	canToggleVisibility: true,
	canMoveView: true,
	ctorDescriptor: new SyncDescriptor(KcodeChatView),
	openCommandActionDescriptor: {
		id: 'workbench.action.kcode.openChat',
		title: localize2('kcode.openChat', 'Open Kcode Chat'),
		mnemonicTitle: localize({ key: 'miOpenKcodeChat', comment: ['&& denotes a mnemonic'] }, '&&Kcode Chat'),
		keybindings: {
			primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KeyL,
		},
		order: 2,
	},
}], KCODE_VIEW_CONTAINER);

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).registerConfiguration({
	id: 'kcode',
	order: 25,
	title: localize('kcodeConfigurationTitle', 'Kcode'),
	type: 'object',
	properties: {
		[KCODE_CONFIG_DEFAULT_MODEL]: {
			type: 'string',
			default: 'openai:gpt-4o',
			description: localize('kcode.models.default', 'Default model for Kcode chat.'),
		},
		[KCODE_CONFIG_OPENAI_BASE_URL]: {
			type: 'string',
			default: 'https://api.openai.com/v1',
			description: localize('kcode.providers.openai.baseUrl', 'OpenAI API base URL.'),
			scope: ConfigurationScope.APPLICATION,
		},
		[KCODE_CONFIG_ANTHROPIC_BASE_URL]: {
			type: 'string',
			default: 'https://api.anthropic.com',
			description: localize('kcode.providers.anthropic.baseUrl', 'Anthropic API base URL.'),
			scope: ConfigurationScope.APPLICATION,
		},
		[KCODE_CONFIG_OLLAMA_BASE_URL]: {
			type: 'string',
			default: 'http://127.0.0.1:11434',
			description: localize('kcode.providers.ollama.baseUrl', 'Ollama API base URL for local models.'),
			scope: ConfigurationScope.APPLICATION,
		},
		[KCODE_CONFIG_PRIVACY_SEND_CODE]: {
			type: 'boolean',
			default: false,
			description: localize('kcode.privacy.sendCode', 'Allow sending workspace code to external LLM providers.'),
			scope: ConfigurationScope.APPLICATION,
		},
		[KCODE_CONFIG_AGENT_MODE]: {
			type: 'boolean',
			default: false,
			description: localize('kcode.agent.enabled', 'Enable Kcode agent mode (tool calls with user approval).'),
			scope: ConfigurationScope.APPLICATION,
		},
	},
});

registerAction2(class OpenKcodeChatAction extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.kcode.focusChat',
			title: localize2('kcode.focusChat', 'Focus Kcode Chat'),
			f1: true,
			category: localize2('kcode.category', 'Kcode'),
		});
	}

	override async run(accessor: ServicesAccessor): Promise<void> {
		await accessor.get(IViewsService).openView(KCODE_CHAT_VIEW_ID, true);
	}
});

registerAction2(class SetOpenAIApiKeyAction extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.kcode.setOpenAIApiKey',
			title: localize2('kcode.setOpenAIApiKey', 'Set OpenAI API Key'),
			f1: true,
			category: localize2('kcode.category', 'Kcode'),
		});
	}

	override async run(accessor: ServicesAccessor): Promise<void> {
		const quickInput = accessor.get(IQuickInputService);
		const secretStorage = accessor.get(IKcodeSecretStorageService);
		const value = await quickInput.input({
			prompt: localize('kcode.setOpenAIApiKey.prompt', 'Enter your OpenAI API key'),
			password: true,
			ignoreFocusLost: true,
		});
		if (value) {
			await secretStorage.setApiKey(KcodeProvider.OpenAI, value);
		}
	}
});

registerAction2(class SetAnthropicApiKeyAction extends Action2 {
	constructor() {
		super({
			id: 'workbench.action.kcode.setAnthropicApiKey',
			title: localize2('kcode.setAnthropicApiKey', 'Set Anthropic API Key'),
			f1: true,
			category: localize2('kcode.category', 'Kcode'),
		});
	}

	override async run(accessor: ServicesAccessor): Promise<void> {
		const quickInput = accessor.get(IQuickInputService);
		const secretStorage = accessor.get(IKcodeSecretStorageService);
		const value = await quickInput.input({
			prompt: localize('kcode.setAnthropicApiKey.prompt', 'Enter your Anthropic API key'),
			password: true,
			ignoreFocusLost: true,
		});
		if (value) {
			await secretStorage.setApiKey(KcodeProvider.Anthropic, value);
		}
	}
});

registerKcodeInlineEditActions();
