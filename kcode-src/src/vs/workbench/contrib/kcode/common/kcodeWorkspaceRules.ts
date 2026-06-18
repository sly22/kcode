/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';

const MAX_RULE_BYTES = 32 * 1024;

/**
 * Loads workspace rules from `.kcode/rules/*.md` and `*.mdc` into chat context.
 */
export async function loadWorkspaceRules(
	fileService: IFileService,
	workspaceService: IWorkspaceContextService,
): Promise<string> {
	const folders = workspaceService.getWorkspace().folders;
	if (folders.length === 0) {
		return '';
	}

	const blocks: string[] = [];

	for (const folder of folders) {
		const rulesDir = URI.joinPath(folder.uri, '.kcode', 'rules');
		try {
			const stat = await fileService.resolve(rulesDir);
			if (!stat.isDirectory || !stat.children) {
				continue;
			}
			for (const child of stat.children) {
				if (!child.isFile) {
					continue;
				}
				if (!child.name.endsWith('.md') && !child.name.endsWith('.mdc')) {
					continue;
				}
				const file = await fileService.readFile(child.resource);
				let content = file.value.toString();
				if (content.length > MAX_RULE_BYTES) {
					content = content.slice(0, MAX_RULE_BYTES) + '\n… (truncated)';
				}
				blocks.push(`### ${child.name}\n${content}`);
			}
		} catch {
			// no .kcode/rules directory
		}
	}

	if (blocks.length === 0) {
		return '';
	}

	return `## Workspace rules (.kcode/rules/)\n\n${blocks.join('\n\n')}`;
}
