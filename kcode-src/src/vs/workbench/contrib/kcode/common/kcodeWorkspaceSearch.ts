/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';

const MAX_MATCHES = 40;
const MAX_FILES_SCANNED = 300;
const MAX_FILE_BYTES = 256 * 1024;

/**
 * Simple workspace text search (grep-like) without ISearchService dependency.
 */
export async function searchWorkspaceText(
	root: URI,
	query: string,
	fileService: IFileService,
	maxDepth = 5,
): Promise<string[]> {
	const results: string[] = [];
	let filesScanned = 0;
	await scanDirectory(root, query, fileService, results, maxDepth, () => {
		filesScanned++;
		return filesScanned >= MAX_FILES_SCANNED || results.length >= MAX_MATCHES;
	});
	return results;
}

async function scanDirectory(
	dir: URI,
	query: string,
	fileService: IFileService,
	results: string[],
	maxDepth: number,
	shouldStop: () => boolean,
): Promise<void> {
	if (maxDepth <= 0 || shouldStop()) {
		return;
	}

	try {
		const stat = await fileService.resolve(dir);
		if (!stat.isDirectory || !stat.children) {
			return;
		}

		for (const child of stat.children) {
			if (shouldStop()) {
				return;
			}
			if (child.isDirectory) {
				if (child.name.startsWith('.') || child.name === 'node_modules' || child.name === 'out') {
					continue;
				}
				await scanDirectory(child.resource, query, fileService, results, maxDepth - 1, shouldStop);
			} else if (child.isFile && isSearchableFile(child.name)) {
				await searchFile(child.resource, query, fileService, results, shouldStop);
			}
		}
	} catch {
		// ignore unreadable directories
	}
}

function isSearchableFile(name: string): boolean {
	const lower = name.toLowerCase();
	if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.gif')
		|| lower.endsWith('.ico') || lower.endsWith('.woff') || lower.endsWith('.zip')) {
		return false;
	}
	return true;
}

async function searchFile(
	uri: URI,
	query: string,
	fileService: IFileService,
	results: string[],
	shouldStop: () => boolean,
): Promise<void> {
	if (shouldStop()) {
		return;
	}

	try {
		const stat = await fileService.resolve(uri);
		if (!stat.isFile || (stat.size ?? 0) > MAX_FILE_BYTES) {
			return;
		}
		const file = await fileService.readFile(uri);
		const text = file.value.toString();
		const lines = text.split(/\r?\n/);
		const rel = uri.path;

		for (let i = 0; i < lines.length; i++) {
			if (lines[i].includes(query)) {
				results.push(`${rel}:${i + 1}: ${lines[i].trim().slice(0, 200)}`);
				if (shouldStop()) {
					return;
				}
			}
		}
	} catch {
		// ignore unreadable files
	}
}
