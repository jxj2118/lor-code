import type {SettingsJson} from "@/schemas/settings.ts";
import type {SettingsWithErrors, ValidationError} from "@/utils/settings/validation.ts";

let sessionSettingsCache: SettingsWithErrors | null = null

export function getSessionSettingsCache(): SettingsWithErrors | null {
    return sessionSettingsCache
}

export function setSessionSettingsCache(value: SettingsWithErrors): void {
    sessionSettingsCache = value
}

/**
 * 路径缓存-配置
 */
type ParsedSettings = {
    settings: Partial<SettingsJson> | null
    errors: ValidationError[]
}
const parseFileCache = new Map<string, ParsedSettings>()
export function getCachedParsedFile(path: string): ParsedSettings | undefined {
    return parseFileCache.get(path)
}

export function setCachedParsedFile(path: string, value: ParsedSettings): void {
    parseFileCache.set(path, value)
}
