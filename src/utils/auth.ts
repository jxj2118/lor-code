import {getSettingsWithErrors} from "@/utils/settings/settings.ts";

export type ApiKeySource =
    | 'LOR_API_KEY'
    | 'settings'
    | 'none'

export function getApiKeyWithSource():{
    key: null | string
    source: ApiKeySource
}{
    const settingsWithErrors = getSettingsWithErrors()
    if (settingsWithErrors.settings.apiKey){
        return { key: settingsWithErrors.settings.apiKey, source: 'settings' }
    }
    if (process.env.LOR_API_KEY) {
        return { key: process.env.LOR_API_KEY, source: 'LOR_API_KEY' }
    }
    return {
        key: null,
        source: 'none',
    }
}
