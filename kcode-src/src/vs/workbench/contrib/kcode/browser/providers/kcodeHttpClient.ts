/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from '../../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { DeferredPromise } from '../../../../../base/common/async.js';
import { listenStream } from '../../../../../base/common/stream.js';
import { IRequestService, asText } from '../../../../../platform/request/common/request.js';

export interface JsonRequestOptions {
	readonly method: 'GET' | 'POST';
	readonly url: string;
	readonly headers?: Record<string, string>;
	readonly body?: unknown;
	readonly callSite: string;
}

export async function fetchJson<T>(
	requestService: IRequestService,
	options: JsonRequestOptions,
	token: CancellationToken,
): Promise<T> {
	const response = await requestService.request({
		type: options.method,
		url: options.url,
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
		data: options.body !== undefined ? JSON.stringify(options.body) : undefined,
		callSite: options.callSite,
	}, token);

	const text = await asText(response);
	if (!text) {
		throw new Error(`Empty response from ${options.url}`);
	}

	if (response.res.statusCode && response.res.statusCode >= 400) {
		throw new Error(`HTTP ${response.res.statusCode}: ${text.slice(0, 500)}`);
	}

	return JSON.parse(text) as T;
}

export async function* fetchSseData(
	requestService: IRequestService,
	options: JsonRequestOptions,
	token: CancellationToken,
): AsyncIterable<string> {
	const response = await requestService.request({
		type: options.method,
		url: options.url,
		headers: {
			'Content-Type': 'application/json',
			Accept: 'text/event-stream',
			...options.headers,
		},
		data: options.body !== undefined ? JSON.stringify(options.body) : undefined,
		callSite: options.callSite,
	}, token);

	if (response.res.statusCode && response.res.statusCode >= 400) {
		const text = await asText(response);
		throw new Error(`HTTP ${response.res.statusCode}: ${text?.slice(0, 500) ?? ''}`);
	}

	const queue: string[] = [];
	let pending: DeferredPromise<void> | undefined;
	let finished = false;
	let streamError: Error | undefined;
	let lineBuffer = '';

	const notify = (): void => {
		if (pending) {
			pending.complete();
			pending = undefined;
		}
	};

	const pushLine = (line: string): void => {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith(':')) {
			return;
		}
		if (trimmed.startsWith('data:')) {
			const data = trimmed.slice(5).trim();
			if (data && data !== '[DONE]') {
				queue.push(data);
				notify();
			}
		}
	};

	listenStream(response.stream, {
		onData: (chunk: VSBuffer) => {
			lineBuffer += chunk.toString();
			let newlineIndex = lineBuffer.indexOf('\n');
			while (newlineIndex >= 0) {
				const line = lineBuffer.slice(0, newlineIndex);
				lineBuffer = lineBuffer.slice(newlineIndex + 1);
				pushLine(line);
				newlineIndex = lineBuffer.indexOf('\n');
			}
		},
		onError: (error: Error) => {
			streamError = error;
			notify();
		},
		onEnd: () => {
			if (lineBuffer.trim()) {
				pushLine(lineBuffer);
				lineBuffer = '';
			}
			finished = true;
			notify();
		},
	}, token);

	while (!finished || queue.length > 0) {
		if (streamError) {
			throw streamError;
		}
		if (queue.length > 0) {
			yield queue.shift()!;
		} else if (!finished) {
			pending = new DeferredPromise<void>();
			await pending.p;
		} else {
			break;
		}
	}
}

export async function* fetchNdjsonLines(
	requestService: IRequestService,
	options: JsonRequestOptions,
	token: CancellationToken,
): AsyncIterable<string> {
	const response = await requestService.request({
		type: options.method,
		url: options.url,
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
		data: options.body !== undefined ? JSON.stringify(options.body) : undefined,
		callSite: options.callSite,
	}, token);

	if (response.res.statusCode && response.res.statusCode >= 400) {
		const text = await asText(response);
		throw new Error(`HTTP ${response.res.statusCode}: ${text?.slice(0, 500) ?? ''}`);
	}

	const queue: string[] = [];
	let pending: DeferredPromise<void> | undefined;
	let finished = false;
	let streamError: Error | undefined;
	let lineBuffer = '';

	const notify = (): void => {
		if (pending) {
			pending.complete();
			pending = undefined;
		}
	};

	listenStream(response.stream, {
		onData: (chunk: VSBuffer) => {
			lineBuffer += chunk.toString();
			let newlineIndex = lineBuffer.indexOf('\n');
			while (newlineIndex >= 0) {
				const line = lineBuffer.slice(0, newlineIndex).trim();
				lineBuffer = lineBuffer.slice(newlineIndex + 1);
				if (line) {
					queue.push(line);
					notify();
				}
				newlineIndex = lineBuffer.indexOf('\n');
			}
		},
		onError: (error: Error) => {
			streamError = error;
			notify();
		},
		onEnd: () => {
			const tail = lineBuffer.trim();
			if (tail) {
				queue.push(tail);
			}
			finished = true;
			notify();
		},
	}, token);

	while (!finished || queue.length > 0) {
		if (streamError) {
			throw streamError;
		}
		if (queue.length > 0) {
			yield queue.shift()!;
		} else if (!finished) {
			pending = new DeferredPromise<void>();
			await pending.p;
		} else {
			break;
		}
	}
}

export function stripProviderPrefix(modelId: string): string {
	const colon = modelId.indexOf(':');
	return colon >= 0 ? modelId.substring(colon + 1) : modelId;
}
