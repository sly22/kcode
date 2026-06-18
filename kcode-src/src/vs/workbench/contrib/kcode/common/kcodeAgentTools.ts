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
];

export type KcodeAgentToolName = 'read_file' | 'search' | 'terminal';

export interface AgentToolCall {
	readonly name: KcodeAgentToolName;
	readonly args: Record<string, string>;
}

export interface AgentToolResult {
	readonly name: KcodeAgentToolName;
	readonly output: string;
	readonly approved: boolean;
}
