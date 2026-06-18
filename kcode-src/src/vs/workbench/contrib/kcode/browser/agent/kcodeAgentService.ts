/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { AgentToolCall, AgentToolResult, KcodeAgentToolName } from '../../common/kcodeAgentTools.js';
import { resolveWorkspaceFile } from '../../common/kcodeMentionResolver.js';
import { searchWorkspaceText } from '../../common/kcodeWorkspaceSearch.js';

export const IKcodeAgentService = createDecorator<IKcodeAgentService>('kcodeAgentService');

export interface IKcodeAgentService {
	readonly _serviceBrand: undefined;

	executeTool(call: AgentToolCall, approved: boolean): Promise<AgentToolResult>;
}

const MAX_READ_BYTES = 64 * 1024;

export class KcodeAgentService extends Disposable implements IKcodeAgentService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceService: IWorkspaceContextService,
		@ITerminalService private readonly terminalService: ITerminalService,
	) {
		super();
	}

	async executeTool(call: AgentToolCall, approved: boolean): Promise<AgentToolResult> {
		if (!approved) {
			return {
				name: call.name,
				output: localize('kcode.agent.denied', 'Tool call denied by user.'),
				approved: false,
			};
		}

		try {
			const output = await this.runTool(call.name, call.args);
			return { name: call.name, output, approved: true };
		} catch (err) {
			return {
				name: call.name,
				output: localize('kcode.agent.toolError', 'Tool error: {0}', String(err)),
				approved: true,
			};
		}
	}

	private async runTool(name: KcodeAgentToolName, args: Record<string, string>): Promise<string> {
		switch (name) {
			case 'read_file':
				return this.readFile(args.path ?? '');
			case 'search':
				return this.search(args.query ?? '');
			case 'terminal':
				return this.runTerminal(args.command ?? '');
		}
	}

	private async readFile(path: string): Promise<string> {
		if (!path) {
			return localize('kcode.agent.readFile.noPath', 'read_file requires a path argument.');
		}
		const file = await resolveWorkspaceFile(path, this.fileService, this.workspaceService);
		if (!file) {
			return localize('kcode.agent.readFile.notFound', 'File not found: {0}', path);
		}
		let content = file.content;
		if (content.length > MAX_READ_BYTES) {
			content = content.slice(0, MAX_READ_BYTES) + '\n… (truncated)';
		}
		return localize('kcode.agent.readFile.result', 'Contents of {0}:\n{1}', file.uri, content);
	}

	private async search(query: string): Promise<string> {
		if (!query) {
			return localize('kcode.agent.search.noQuery', 'search requires a query argument.');
		}
		const folders = this.workspaceService.getWorkspace().folders;
		if (folders.length === 0) {
			return localize('kcode.agent.search.noWorkspace', 'No workspace folder open.');
		}

		const allMatches: string[] = [];
		for (const folder of folders) {
			const matches = await searchWorkspaceText(folder.uri, query, this.fileService);
			allMatches.push(...matches);
			if (allMatches.length >= 40) {
				break;
			}
		}

		if (allMatches.length === 0) {
			return localize('kcode.agent.search.noMatches', 'No matches for: {0}', query);
		}
		return localize(
			'kcode.agent.search.result',
			'Search results for "{0}" ({1} matches):\n{2}',
			query,
			allMatches.length,
			allMatches.slice(0, 40).join('\n'),
		);
	}

	private async runTerminal(command: string): Promise<string> {
		if (!command) {
			return localize('kcode.agent.terminal.noCommand', 'terminal requires a command argument.');
		}
		let instance = this.terminalService.activeInstance;
		if (!instance) {
			instance = await this.terminalService.createTerminal({ config: { name: 'Kcode Agent' } });
			await this.terminalService.revealTerminal(instance);
		}
		await instance.sendText(command, true);
		return localize('kcode.agent.terminal.sent', 'Command sent to terminal: {0}', command);
	}
}
