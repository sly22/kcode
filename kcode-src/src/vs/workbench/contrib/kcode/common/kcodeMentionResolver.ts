/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ContextItem } from './kcodeChatService.js';
import { resolveSymbolMention } from './kcodeSymbolMentions.js';

/**
 * Resolves @-mention targets to workspace file content.
 * Tries relative paths from each workspace folder, then basename-only fallbacks.
 */
export async function resolveWorkspaceFile(
	target: string,
	fileService: IFileService,
	workspaceService: IWorkspaceContextService,
): Promise<{ uri: string; content: string } | undefined> {
	return resolveMentionTarget(target, fileService, workspaceService);
}

export async function resolveMentions(
	mentions: readonly ContextItem[],
	fileService: IFileService,
	workspaceService: IWorkspaceContextService,
	editorService?: IEditorService,
): Promise<ContextItem[]> {
	const resolved: ContextItem[] = [];

	for (const mention of mentions) {
		if (mention.kind !== 'mention' || !mention.uri) {
			resolved.push(mention);
			continue;
		}

		if (mention.uri.startsWith('symbol:') && editorService) {
			const symbolName = mention.uri.slice('symbol:'.length);
			const content = await resolveSymbolMention(symbolName, editorService, fileService, workspaceService);
			resolved.push({
				kind: 'mention',
				uri: mention.uri,
				content: content ?? `[Could not resolve @symbol:${symbolName}]`,
			});
			continue;
		}

		if (mention.uri.startsWith('docs:')) {
			const topic = mention.uri.slice('docs:'.length);
			resolved.push({
				kind: 'mention',
				uri: mention.uri,
				content: resolveDocsMention(topic),
			});
			continue;
		}

		if (mention.uri.startsWith('web:')) {
			const query = mention.uri.slice('web:'.length);
			resolved.push({
				kind: 'mention',
				uri: mention.uri,
				content: resolveWebMention(query),
			});
			continue;
		}

		const file = await resolveMentionTarget(mention.uri, fileService, workspaceService);
		if (file) {
			resolved.push({
				kind: 'mention',
				uri: file.uri,
				content: file.content,
			});
		} else {
			resolved.push({
				kind: 'mention',
				uri: mention.uri,
				content: `[Could not resolve @${mention.uri}]`,
			});
		}
	}

	return resolved;
}

async function resolveMentionTarget(
	target: string,
	fileService: IFileService,
	workspaceService: IWorkspaceContextService,
): Promise<{ uri: string; content: string } | undefined> {
	const normalized = target.replace(/\\/g, '/').replace(/^\.\//, '');
	const folders = workspaceService.getWorkspace().folders;
	if (folders.length === 0) {
		return undefined;
	}

	const candidates: URI[] = [];
	for (const folder of folders) {
		candidates.push(URI.joinPath(folder.uri, normalized));
		if (!normalized.includes('/')) {
			candidates.push(URI.joinPath(folder.uri, 'src', normalized));
			candidates.push(URI.joinPath(folder.uri, 'kcode-src', normalized));
		}
	}

	for (const uri of candidates) {
		const result = await tryReadFile(uri, fileService);
		if (result) {
			return result;
		}
	}

	if (!normalized.includes('/')) {
		for (const folder of folders) {
			const found = await findByBasename(folder.uri, normalized, fileService, 4);
			if (found) {
				return found;
			}
		}
	}

	return undefined;
}

async function tryReadFile(
	uri: URI,
	fileService: IFileService,
): Promise<{ uri: string; content: string } | undefined> {
	try {
		const stat = await fileService.resolve(uri);
		if (!stat.isFile) {
			return undefined;
		}
		const file = await fileService.readFile(uri);
		return { uri: uri.toString(), content: file.value.toString() };
	} catch {
		return undefined;
	}
}

async function findByBasename(
	root: URI,
	basename: string,
	fileService: IFileService,
	maxDepth: number,
): Promise<{ uri: string; content: string } | undefined> {
	if (maxDepth <= 0) {
		return undefined;
	}

	try {
		const stat = await fileService.resolve(root);
		if (stat.isFile && stat.name === basename) {
			return tryReadFile(root, fileService);
		}
		if (!stat.isDirectory || !stat.children) {
			return undefined;
		}

		for (const child of stat.children) {
			if (child.name === basename && child.isFile) {
				return tryReadFile(child.resource, fileService);
			}
		}
		for (const child of stat.children) {
			if (child.isDirectory && !child.name.startsWith('.') && child.name !== 'node_modules') {
				const found = await findByBasename(child.resource, basename, fileService, maxDepth - 1);
				if (found) {
					return found;
				}
			}
		}
	} catch {
		// ignore
	}

	return undefined;
}

/** Stub: @docs mention — links to Kcode documentation (web fetch not implemented). */
function resolveDocsMention(topic: string): string {
	const base = 'https://kcode.dev/docs';
	const path = topic ? `/${topic.replace(/^\//, '')}` : '';
	return [
		'[Kcode Docs — stub]',
		`Topic: ${topic || '(general)'}`,
		`URL: ${base}${path}`,
		'Full documentation indexing is not yet implemented. Use @file or attach context for now.',
	].join('\n');
}

/** Stub: @web mention — web search placeholder. */
function resolveWebMention(query: string): string {
	return [
		'[Web search — stub]',
		`Query: ${query || '(no query)'}`,
		'Live web search is not yet implemented. Paste URLs or attach files for external context.',
	].join('\n');
}
