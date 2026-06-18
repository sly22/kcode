/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService, IQuickPickItem } from '../../../../../platform/quickinput/common/quickInput.js';
import { AgentToolCall, AgentToolResult, KcodeAgentToolName } from '../../common/kcodeAgentTools.js';

export const IKcodeAgentService = createDecorator<IKcodeAgentService>('kcodeAgentService');

export interface IKcodeAgentService {
	readonly _serviceBrand: undefined;

	/** Stub: request user approval before executing a tool call. */
	requestToolApproval(call: AgentToolCall): Promise<boolean>;

	/** Stub: execute an approved tool (returns placeholder output). */
	executeTool(call: AgentToolCall, approved: boolean): Promise<AgentToolResult>;
}

export class KcodeAgentService extends Disposable implements IKcodeAgentService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@IQuickInputService private readonly quickInputService: IQuickInputService,
	) {
		super();
	}

	async requestToolApproval(call: AgentToolCall): Promise<boolean> {
		const items: IQuickPickItem[] = [
			{
				label: localize('kcode.agent.approve', 'Approve'),
				description: localize('kcode.agent.approve.desc', 'Allow Kcode to run {0}', call.name),
			},
			{
				label: localize('kcode.agent.deny', 'Deny'),
				description: localize('kcode.agent.deny.desc', 'Skip this tool call'),
			},
		];

		const picked = await this.quickInputService.pick(items, {
			placeHolder: localize('kcode.agent.approvalPlaceholder', 'Agent wants to call `{0}` — approve?', call.name),
			ignoreFocusLost: true,
		});

		return picked?.label === items[0].label;
	}

	async executeTool(call: AgentToolCall, approved: boolean): Promise<AgentToolResult> {
		if (!approved) {
			return {
				name: call.name,
				output: localize('kcode.agent.denied', 'Tool call denied by user.'),
				approved: false,
			};
		}

		const output = this.stubToolOutput(call.name, call.args);
		return { name: call.name, output, approved: true };
	}

	private stubToolOutput(name: KcodeAgentToolName, args: Record<string, string>): string {
		switch (name) {
			case 'read_file':
				return localize(
					'kcode.agent.stub.readFile',
					'[Agent stub] Would read file: {0}',
					args.path ?? '(no path)',
				);
			case 'search':
				return localize(
					'kcode.agent.stub.search',
					'[Agent stub] Would search for: {0}',
					args.query ?? '(no query)',
				);
			case 'terminal':
				return localize(
					'kcode.agent.stub.terminal',
					'[Agent stub] Would run command: {0}',
					args.command ?? '(no command)',
				);
		}
	}
}
