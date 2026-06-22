/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { URI } from '../../../../../base/common/uri.js';
import Severity from '../../../../../base/common/severity.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IRequestService } from '../../../../../platform/request/common/request.js';
import { asText } from '../../../../../platform/request/common/request.js';
import { KCODE_CONFIG_UPDATE_CHECK, KCODE_CONFIG_UPDATE_FEED_URL } from '../../common/kcodeConstants.js';
import { registerWorkbenchContribution2, WorkbenchPhase } from '../../../../common/contributions.js';

interface KcodeUpdateFeed {
	readonly version?: string;
	readonly name?: string;
	readonly url?: string;
	readonly notes?: string;
}

export class KcodeUpdateContribution extends Disposable {
	static readonly ID = 'workbench.contrib.kcodeUpdate';

	constructor(
		@IRequestService private readonly requestService: IRequestService,
		@INotificationService private readonly notificationService: INotificationService,
		@IOpenerService private readonly openerService: IOpenerService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IProductService private readonly productService: IProductService,
	) {
		super();
		const enabled = this.configurationService.getValue<boolean>(KCODE_CONFIG_UPDATE_CHECK) ?? true;
		if (enabled) {
			setTimeout(() => void this.checkForUpdates(), 30_000);
		}
	}

	private async checkForUpdates(): Promise<void> {
		const feedUrl = this.configurationService.getValue<string>(KCODE_CONFIG_UPDATE_FEED_URL)
			?? 'https://kcode.dev/api/updates.json';

		try {
			const response = await this.requestService.request({
				type: 'GET',
				url: feedUrl,
				headers: { Accept: 'application/json' },
				callSite: 'KcodeUpdateContribution.checkForUpdates',
			}, CancellationToken.None);

			const text = await asText(response);
			if (!text || (response.res.statusCode && response.res.statusCode >= 400)) {
				return;
			}

			const feed = JSON.parse(text) as KcodeUpdateFeed;
			const remoteVersion = feed.version ?? feed.name;
			const currentVersion = this.productService.version;
			if (!remoteVersion || remoteVersion === currentVersion) {
				return;
			}

			const notes = feed.notes ? `\n${feed.notes}` : '';
			this.notificationService.prompt(
				Severity.Info,
				localize(
					'kcode.update.available',
					'Kcode update available: {0} (current {1}).{2}',
					remoteVersion,
					currentVersion,
					notes,
				),
				feed.url ? [{
					label: localize('kcode.update.download', 'View release'),
					run: () => this.openerService.open(URI.parse(feed.url!)),
				}] : [],
			);
		} catch {
			// silent — feed is best-effort
		}
	}
}

registerWorkbenchContribution2(
	KcodeUpdateContribution.ID,
	KcodeUpdateContribution,
	WorkbenchPhase.Eventually,
);
