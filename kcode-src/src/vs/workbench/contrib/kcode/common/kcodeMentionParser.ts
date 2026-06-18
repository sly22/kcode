/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { ContextItem } from './kcodeChatService.js';

export interface ParsedMentions {
	readonly cleanText: string;
	readonly mentions: readonly ContextItem[];
}

const MENTION_PATTERN = /@([\w./\\-]+)/g;

/**
 * Parses `@filename` tokens from chat input. File content is resolved separately
 * via {@link resolveMentions} in kcodeMentionResolver.ts.
 */
export function parseMentions(text: string): ParsedMentions {
	const mentions: ContextItem[] = [];
	let match: RegExpExecArray | null;

	MENTION_PATTERN.lastIndex = 0;
	while ((match = MENTION_PATTERN.exec(text)) !== null) {
		const target = match[1];
		mentions.push({
			kind: 'mention',
			uri: target,
			content: `@${target}`,
		});
	}

	const cleanText = text.replace(MENTION_PATTERN, (full, target: string) => {
		return `[mention:${target}]`;
	}).trim();

	return { cleanText, mentions };
}
