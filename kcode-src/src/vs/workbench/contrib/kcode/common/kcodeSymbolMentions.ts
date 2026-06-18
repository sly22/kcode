/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { resolveWorkspaceFile } from './kcodeMentionResolver.js';

const SYMBOL_PATTERNS = [
	/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g,
	/(?:export\s+)?class\s+(\w+)/g,
	/(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=/g,
	/(?:export\s+)?interface\s+(\w+)/g,
	/(?:export\s+)?type\s+(\w+)\s*=/g,
];

export interface SymbolMentionCandidate {
	readonly label: string;
	readonly detail: string;
	readonly insertText: string;
}

/**
 * Stub symbol resolver: regex scan of active editor + shallow workspace file search.
 */
export async function resolveSymbolMention(
	symbolName: string,
	editorService: IEditorService,
	fileService: IFileService,
	workspaceService: IWorkspaceContextService,
): Promise<string | undefined> {
	const fromEditor = findSymbolInActiveEditor(symbolName, editorService);
	if (fromEditor) {
		return fromEditor;
	}

	const folders = workspaceService.getWorkspace().folders;
	for (const folder of folders) {
		const shallowTargets = ['kcode-src', 'src'];
		for (const sub of shallowTargets) {
			const file = await resolveWorkspaceFile(`${sub}/${symbolName}.ts`, fileService, workspaceService);
			if (file) {
				const snippet = extractSymbolSnippet(file.content, symbolName);
				if (snippet) {
					return `[symbol ${symbolName} in ${file.uri}]\n${snippet}`;
				}
			}
		}
	}

	return undefined;
}

export function listSymbolCandidates(
	filter: string,
	editorService: IEditorService,
): SymbolMentionCandidate[] {
	const symbols = new Set<string>();
	collectSymbolsFromActiveEditor(symbols, editorService);
	const lower = filter.toLowerCase();
	const items: SymbolMentionCandidate[] = [];
	for (const name of symbols) {
		if (!lower || name.toLowerCase().includes(lower)) {
			items.push({
				label: name,
				detail: 'symbol (active file)',
				insertText: `@symbol:${name}`,
			});
		}
	}
	return items.slice(0, 20);
}

function findSymbolInActiveEditor(symbolName: string, editorService: IEditorService): string | undefined {
	const control = editorService.activeTextEditorControl;
	if (!isCodeEditor(control)) {
		return undefined;
	}
	const model = control.getModel();
	if (!model) {
		return undefined;
	}
	const snippet = extractSymbolSnippet(model.getValue(), symbolName);
	if (!snippet) {
		return undefined;
	}
	return `[symbol ${symbolName} in ${model.uri.path}]\n${snippet}`;
}

function collectSymbolsFromActiveEditor(symbols: Set<string>, editorService: IEditorService): void {
	const control = editorService.activeTextEditorControl;
	if (!isCodeEditor(control)) {
		return;
	}
	const model = control.getModel();
	if (!model) {
		return;
	}
	scanSymbols(model.getValue(), symbols);
}

function scanSymbols(text: string, symbols: Set<string>): void {
	for (const pattern of SYMBOL_PATTERNS) {
		pattern.lastIndex = 0;
		let match: RegExpExecArray | null;
		while ((match = pattern.exec(text)) !== null) {
			symbols.add(match[1]);
		}
	}
}

function extractSymbolSnippet(text: string, symbolName: string): string | undefined {
	const lines = text.split(/\r?\n/);
	for (let i = 0; i < lines.length; i++) {
		if (new RegExp(`\\b${escapeRegExp(symbolName)}\\b`).test(lines[i])) {
			return lines.slice(i, Math.min(i + 12, lines.length)).join('\n');
		}
	}
	return undefined;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
