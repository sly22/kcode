/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Kcode contributors. MIT License.
 *--------------------------------------------------------------------------------------------*/

export enum KcodeProvider {
	OpenAI = 'openai',
	Anthropic = 'anthropic',
	Local = 'local',
}

export interface ModelInfo {
	readonly id: string;
	readonly label: string;
	readonly provider: KcodeProvider;
}

export function modelProviderPrefix(modelId: string): string {
	const colon = modelId.indexOf(':');
	return colon >= 0 ? modelId.substring(0, colon) : modelId;
}

export function qualifiedModelId(provider: KcodeProvider, modelId: string): string {
	return `${provider}:${modelId}`;
}
