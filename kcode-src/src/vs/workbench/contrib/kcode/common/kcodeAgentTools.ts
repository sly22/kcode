/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { ToolSpec } from './kcodeChatService.js';

export const KCODE_AGENT_TOOLS: readonly ToolSpec[] = [
	{
		name: 'read_file',
		description: 'Read the contents of a file in the workspace by path.',
	},
	{
		name: 'search',
		description: 'Search for text patterns across workspace files.',
	},
	{
		name: 'terminal',
		description: 'Run a shell command in the integrated terminal (requires user approval).',
	},
	{
		name: 'write_file',
		description: 'Create or overwrite a workspace file with the given content (requires user approval).',
	},
	{
		name: 'edit_file',
		description: 'Replace a unique old_string with new_string in a workspace file (requires user approval).',
	},
];

export type KcodeAgentToolName = 'read_file' | 'search' | 'terminal' | 'write_file' | 'edit_file';

export interface AgentToolCall {
	readonly id?: string;
	readonly name: KcodeAgentToolName;
	readonly args: Record<string, string>;
}

export interface AgentToolResult {
	readonly name: KcodeAgentToolName;
	readonly output: string;
	readonly approved: boolean;
}
