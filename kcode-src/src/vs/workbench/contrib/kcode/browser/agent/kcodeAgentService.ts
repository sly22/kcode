/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { dirname } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { AgentToolCall, AgentToolResult, KcodeAgentToolName } from '../../common/kcodeAgentTools.js';
import { resolveWorkspaceFile, resolveWorkspaceFileUri } from '../../common/kcodeMentionResolver.js';
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
		@IEditorService private readonly editorService: IEditorService,
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
			case 'write_file':
				return this.writeFile(args.path ?? '', args.content ?? '');
			case 'edit_file':
				return this.editFile(args.path ?? '', args.old_string ?? '', args.new_string ?? '');
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

	private async ensureParentDirectories(uri: URI): Promise<void> {
		const parent = dirname(uri);
		if (parent.path.length > 0 && !await this.fileService.exists(parent)) {
			await this.fileService.createFolder(parent);
		}
	}

	private async openFileInEditor(uri: URI): Promise<void> {
		await this.editorService.openEditor({ resource: uri });
	}

	private async writeFile(path: string, content: string): Promise<string> {
		if (!path) {
			return localize('kcode.agent.writeFile.noPath', 'write_file requires a path argument.');
		}
		const uri = await resolveWorkspaceFileUri(path, this.fileService, this.workspaceService);
		if (!uri) {
			return localize('kcode.agent.writeFile.noWorkspace', 'No workspace folder open or invalid path: {0}', path);
		}
		await this.ensureParentDirectories(uri);
		await this.fileService.writeFile(uri, VSBuffer.fromString(content));
		await this.openFileInEditor(uri);
		return localize('kcode.agent.writeFile.ok', 'Wrote {0} ({1} bytes).', uri.toString(), String(content.length));
	}

	private async editFile(path: string, oldString: string, newString: string): Promise<string> {
		if (!path) {
			return localize('kcode.agent.editFile.noPath', 'edit_file requires a path argument.');
		}
		if (!oldString) {
			return localize('kcode.agent.editFile.noOldString', 'edit_file requires an old_string argument.');
		}
		const file = await resolveWorkspaceFile(path, this.fileService, this.workspaceService);
		if (!file) {
			return localize('kcode.agent.editFile.notFound', 'File not found: {0}', path);
		}
		const content = file.content;
		const firstIndex = content.indexOf(oldString);
		if (firstIndex === -1) {
			return localize('kcode.agent.editFile.noMatch', 'old_string not found in {0}', path);
		}
		const lastIndex = content.indexOf(oldString, firstIndex + oldString.length);
		if (lastIndex !== -1) {
			return localize('kcode.agent.editFile.multipleMatches', 'old_string appears multiple times in {0}. Provide more context.', path);
		}
		const updated = content.slice(0, firstIndex) + newString + content.slice(firstIndex + oldString.length);
		const uri = await resolveWorkspaceFileUri(path, this.fileService, this.workspaceService);
		if (!uri) {
			return localize('kcode.agent.editFile.resolveFailed', 'Could not resolve path: {0}', path);
		}
		await this.fileService.writeFile(uri, VSBuffer.fromString(updated));
		await this.openFileInEditor(uri);
		return localize('kcode.agent.editFile.ok', 'Edited {0} (replaced {1} characters).', uri.toString(), String(oldString.length));
	}
}
