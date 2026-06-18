/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { ContextItem } from './kcodeChatService.js';

export interface ParsedMentions {
	readonly cleanText: string;
	readonly mentions: readonly ContextItem[];
}

const SYMBOL_MENTION = /@symbol:([\w]+)/g;
const DOCS_MENTION = /@docs(?::([\w./\\-]*))?/g;
const WEB_MENTION = /@web(?::([\w./\\-]*))?/g;
const FILE_MENTION = /@([\w./\\-]+)/g;

/**
 * Parses `@filename` and `@symbol:name` tokens from chat input.
 */
export function parseMentions(text: string): ParsedMentions {
	const mentions: ContextItem[] = [];

	SYMBOL_MENTION.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = SYMBOL_MENTION.exec(text)) !== null) {
		const target = match[1];
		mentions.push({
			kind: 'mention',
			uri: `symbol:${target}`,
			content: `@symbol:${target}`,
		});
	}

	DOCS_MENTION.lastIndex = 0;
	while ((match = DOCS_MENTION.exec(text)) !== null) {
		const topic = match[1] ?? '';
		mentions.push({
			kind: 'mention',
			uri: topic ? `docs:${topic}` : 'docs:',
			content: match[0],
		});
	}

	WEB_MENTION.lastIndex = 0;
	while ((match = WEB_MENTION.exec(text)) !== null) {
		const query = match[1] ?? '';
		mentions.push({
			kind: 'mention',
			uri: query ? `web:${query}` : 'web:',
			content: match[0],
		});
	}

	FILE_MENTION.lastIndex = 0;
	while ((match = FILE_MENTION.exec(text)) !== null) {
		const full = match[0];
		if (full.startsWith('@symbol:') || full.startsWith('@docs') || full.startsWith('@web')) {
			continue;
		}
		const target = match[1];
		mentions.push({
			kind: 'mention',
			uri: target,
			content: full,
		});
	}

	let cleanText = text.replace(SYMBOL_MENTION, (_full, target: string) => `[mention:symbol:${target}]`);
	cleanText = cleanText.replace(DOCS_MENTION, (_full, topic: string | undefined) => `[mention:docs:${topic ?? ''}]`);
	cleanText = cleanText.replace(WEB_MENTION, (_full, query: string | undefined) => `[mention:web:${query ?? ''}]`);
	cleanText = cleanText.replace(FILE_MENTION, (full, target: string) => {
		if (full.startsWith('@symbol:') || full.startsWith('@docs') || full.startsWith('@web')) {
			return full;
		}
		return `[mention:${target}]`;
	}).trim();

	return { cleanText, mentions };
}

/** Returns @-mention filter text at cursor, or undefined if not in a mention. */
export function getActiveMentionFilter(text: string, cursorPos: number): string | undefined {
	const before = text.slice(0, cursorPos);
	const atIndex = before.lastIndexOf('@');
	if (atIndex < 0) {
		return undefined;
	}
	const fragment = before.slice(atIndex + 1);
	if (/\s/.test(fragment)) {
		return undefined;
	}
	return fragment;
}

/** Inserts a mention at the active @ position. */
export function insertMentionAtCursor(text: string, cursorPos: number, insertText: string): { text: string; cursor: number } {
	const before = text.slice(0, cursorPos);
	const atIndex = before.lastIndexOf('@');
	if (atIndex < 0) {
		const next = text.slice(0, cursorPos) + insertText + ' ' + text.slice(cursorPos);
		return { text: next, cursor: cursorPos + insertText.length + 1 };
	}
	const next = text.slice(0, atIndex) + insertText + ' ' + text.slice(cursorPos);
	return { text: next, cursor: atIndex + insertText.length + 1 };
}
