/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

/** Strip markdown code fences from LLM output when applying inline edits. */
export function stripMarkdownCodeFences(text: string): string {
	const trimmed = text.trim();
	const fenceMatch = trimmed.match(/^```[\w-]*\n?([\s\S]*?)```\s*$/);
	if (fenceMatch) {
		return fenceMatch[1].trim();
	}
	return trimmed;
}
