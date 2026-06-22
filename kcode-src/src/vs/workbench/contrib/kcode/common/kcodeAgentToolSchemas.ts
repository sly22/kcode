/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { ToolSpec } from './kcodeChatService.js';
import { KcodeAgentToolName } from './kcodeAgentTools.js';

const TOOL_PARAMETERS: Record<KcodeAgentToolName, object> = {
	read_file: {
		type: 'object',
		properties: {
			path: { type: 'string', description: 'Workspace-relative file path.' },
		},
		required: ['path'],
	},
	search: {
		type: 'object',
		properties: {
			query: { type: 'string', description: 'Text pattern to search for in workspace files.' },
		},
		required: ['query'],
	},
	terminal: {
		type: 'object',
		properties: {
			command: { type: 'string', description: 'Shell command to run in the integrated terminal.' },
		},
		required: ['command'],
	},
	write_file: {
		type: 'object',
		properties: {
			path: { type: 'string', description: 'Workspace-relative file path.' },
			content: { type: 'string', description: 'Full file content to write.' },
		},
		required: ['path', 'content'],
	},
	edit_file: {
		type: 'object',
		properties: {
			path: { type: 'string', description: 'Workspace-relative file path.' },
			old_string: { type: 'string', description: 'Exact text to replace (must appear exactly once).' },
			new_string: { type: 'string', description: 'Replacement text.' },
		},
		required: ['path', 'old_string', 'new_string'],
	},
};

export function toOpenAITools(tools: readonly ToolSpec[]): object[] {
	return tools.map(t => ({
		type: 'function',
		function: {
			name: t.name,
			description: t.description,
			parameters: TOOL_PARAMETERS[t.name as KcodeAgentToolName] ?? { type: 'object', properties: {} },
		},
	}));
}

export function toAnthropicTools(tools: readonly ToolSpec[]): object[] {
	return tools.map(t => ({
		name: t.name,
		description: t.description,
		input_schema: TOOL_PARAMETERS[t.name as KcodeAgentToolName] ?? { type: 'object', properties: {} },
	}));
}
