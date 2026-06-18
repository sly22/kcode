/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import * as dom from '../../../../../base/browser/dom.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { listSymbolCandidates } from '../../common/kcodeSymbolMentions.js';

export interface MentionPickerItem {
	readonly label: string;
	readonly detail: string;
	readonly insertText: string;
}

export class KcodeMentionPicker extends Disposable {
	private container: HTMLElement | undefined;
	private listElement: HTMLElement | undefined;
	private visible = false;
	private onPick: ((item: MentionPickerItem) => void) | undefined;

	constructor(
		private readonly parent: HTMLElement,
		@IEditorService private readonly editorService: IEditorService,
		@IFileService private readonly fileService: IFileService,
		@IWorkspaceContextService private readonly workspaceService: IWorkspaceContextService,
	) {
		super();
		this.container = dom.append(parent, dom.$('.kcode-mention-picker'));
		this.container.style.display = 'none';
		this.listElement = dom.append(this.container, dom.$('.kcode-mention-picker-list'));
	}

	show(filter: string, onPick: (item: MentionPickerItem) => void): void {
		this.onPick = onPick;
		void this.refreshItems(filter);
		if (this.container) {
			this.container.style.display = 'block';
		}
		this.visible = true;
	}

	hide(): void {
		if (this.container) {
			this.container.style.display = 'none';
			dom.clearNode(this.listElement!);
		}
		this.visible = false;
		this.onPick = undefined;
	}

	isVisible(): boolean {
		return this.visible;
	}

	private async refreshItems(filter: string): Promise<void> {
		if (!this.listElement) {
			return;
		}
		dom.clearNode(this.listElement);

		const items = await this.collectItems(filter);
		if (items.length === 0) {
			const empty = dom.append(this.listElement, dom.$('.kcode-mention-picker-item.empty'));
			empty.textContent = localize('kcode.mention.noResults', 'No matches');
			return;
		}

		for (const item of items) {
			const row = dom.append(this.listElement, dom.$('.kcode-mention-picker-item'));
			const label = dom.append(row, dom.$('.kcode-mention-picker-label'));
			label.textContent = item.label;
			const detail = dom.append(row, dom.$('.kcode-mention-picker-detail'));
			detail.textContent = item.detail;
			row.onmousedown = (e: MouseEvent) => {
				e.preventDefault();
				this.onPick?.(item);
				this.hide();
			};
		}
	}

	private async collectItems(filter: string): Promise<MentionPickerItem[]> {
		const items: MentionPickerItem[] = [];
		const lower = filter.toLowerCase();

		if (!filter || 'docs'.startsWith(lower) || lower.startsWith('docs')) {
			items.push({
				label: '@docs',
				detail: localize('kcode.mention.docs', 'Kcode documentation (stub)'),
				insertText: '@docs',
			});
			if (lower.startsWith('docs:') || lower === 'docs') {
				items.push({
					label: '@docs:api',
					detail: localize('kcode.mention.docsApi', 'API reference stub'),
					insertText: '@docs:api',
				});
			}
		}

		if (!filter || 'web'.startsWith(lower) || lower.startsWith('web')) {
			items.push({
				label: '@web',
				detail: localize('kcode.mention.web', 'Web search (stub)'),
				insertText: '@web',
			});
		}

		for (const sym of listSymbolCandidates(filter, this.editorService)) {
			items.push(sym);
		}

		const files = await this.collectFileCandidates(filter);
		items.push(...files);

		return items.slice(0, 25);
	}

	private async collectFileCandidates(filter: string): Promise<MentionPickerItem[]> {
		const folders = this.workspaceService.getWorkspace().folders;
		if (folders.length === 0) {
			return [];
		}

		const results: MentionPickerItem[] = [];
		const lower = filter.toLowerCase();

		for (const folder of folders) {
			await this.walkForFiles(folder.uri, lower, results, 3);
			if (results.length >= 15) {
				break;
			}
		}
		return results;
	}

	private async walkForFiles(
		dir: import('../../../../../base/common/uri.js').URI,
		filter: string,
		results: MentionPickerItem[],
		maxDepth: number,
	): Promise<void> {
		if (maxDepth <= 0 || results.length >= 15) {
			return;
		}
		try {
			const stat = await this.fileService.resolve(dir);
			if (!stat.isDirectory || !stat.children) {
				return;
			}
			for (const child of stat.children) {
				if (results.length >= 15) {
					return;
				}
				if (child.isFile && child.name.toLowerCase().includes(filter)) {
					results.push({
						label: child.name,
						detail: child.resource.path,
						insertText: `@${child.resource.path.replace(/^\/+/, '')}`,
					});
				} else if (child.isDirectory && !child.name.startsWith('.') && child.name !== 'node_modules') {
					await this.walkForFiles(child.resource, filter, results, maxDepth - 1);
				}
			}
		} catch {
			// ignore
		}
	}
}
