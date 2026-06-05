import { join,resolve } from 'path'
import mergeWith from 'lodash-es/mergeWith.js'
import {getEnabledSettingSources, type SettingSource} from "@/utils/settings/constants.ts";
import {getLorConfigHomeDir} from "@/utils/envUtils.ts";
import {getOriginalCwd} from "@/bootstrap/state.ts";
import {
    getCachedParsedFile,
    getSessionSettingsCache,
    setCachedParsedFile,
    setSessionSettingsCache
} from "@/utils/settings/settingsCache.ts";
import {createLogger} from "@/utils/logger.ts";
import {type SettingsJson, SettingsSchema} from "@/schemas/settings.ts";
import {clone} from "@/utils/slowOperations.ts";
import {formatZodError, type SettingsWithErrors, type ValidationError} from "@/utils/settings/validation.ts";
import {readFileSync} from "@/utils/fileRead.ts";
import {getFsImplementation, safeResolvePath} from "@/utils/fsOperations.ts";
import {safeParseJSON} from "@/utils/json.ts";

// Flag to prevent infinite recursion when loading settings
let isLoadingSettings = false

const logger = createLogger('settings')

/**
 * Handles file system errors appropriately
 * @param error The error to handle
 * @param path The file path that caused the error
 */
function handleFileSystemError(error: unknown, path: string): void {
    if (
        typeof error === 'object' &&
        error &&
        'code' in error &&
        error.code === 'ENOENT'
    ) {
        logger.debug(
            `Broken symlink or missing file encountered for settings.json at path: ${path}`,
        )
    } else {
        logger.error("[handleFileSystemError]", {error})
    }
}

/**
 * Parses a settings file into a structured format
 * @param path The path to the permissions file
 * @param source The source of the settings (optional, for error reporting)
 * @returns Parsed settings data and validation errors
 */
export function parseSettingsFile(path: string): {
    settings: Partial<SettingsJson> | null
    errors: ValidationError[]
} {
    const cached = getCachedParsedFile(path)
    if (cached) {
        // Clone so callers (e.g. mergeWith in getSettingsForSourceUncached,
        // updateSettingsForSource) can't mutate the cached entry.
        return {
            settings: cached.settings ? clone(cached.settings) : null,
            errors: cached.errors,
        }
    }
    const result = parseSettingsFileUncached(path)
    setCachedParsedFile(path, result)
    // Clone the first return too — the caller may mutate before
    // another caller reads the same cache entry.
    return {
        settings: result.settings ? clone(result.settings) : null,
        errors: result.errors,
    }
}

function parseSettingsFileUncached(path: string): {
    settings: Partial<SettingsJson> | null
    errors: ValidationError[]
} {
    try {
        const { resolvedPath } = safeResolvePath(getFsImplementation(), path)
        const content = readFileSync(resolvedPath)

        if (content.trim() === '') {
            return { settings: {}, errors: [] }
        }

        const data = safeParseJSON(content, false)

        const result = SettingsSchema.safeParse(data)

        if (!result.success) {
            const errors = formatZodError(result.error, path)
            return { settings: null, errors: [...errors] }
        }

        return { settings: result.data, errors: [] }
    } catch (error) {
        handleFileSystemError(error, path)
        return { settings: null, errors: [] }
    }
}

/**
 * Get the absolute path to the associated file root for a given settings source
 * (e.g. for $PROJ_DIR/.claude/settings.json, returns $PROJ_DIR)
 * @param source The source of the settings
 * @returns The root path of the settings file
 */
export function getSettingsRootPathForSource(source: SettingSource): string {
    switch (source) {
        case 'userSettings':
            return resolve(getLorConfigHomeDir())
        case 'projectSettings':
        case 'localSettings': {
            return resolve(getOriginalCwd())
        }
    }
}

export function getSettingsFilePathForSource(
    source: SettingSource,
): string | undefined {
    switch (source) {
        case 'userSettings':
            return join(
                getSettingsRootPathForSource(source),
                'settings.json',
            )
        case 'projectSettings':
        case 'localSettings': {
            return join(
                getSettingsRootPathForSource(source),
                getRelativeSettingsFilePathForSource(source),
            )
        }
    }
}
export function getRelativeSettingsFilePathForSource(
    source: 'projectSettings' | 'localSettings',
): string {
    switch (source) {
        case 'projectSettings':
            return join('.lor', 'settings.json')
        case 'localSettings':
            return join('.lor', 'settings.local.json')
    }
}


export function getSettingsWithErrors(): SettingsWithErrors {
    // Use cached result if available
    const cached = getSessionSettingsCache()
    if (cached !== null) {
        return cached
    }

    // Load from disk and cache the result
    const result = loadSettingsFromDisk()
    setSessionSettingsCache(result)
    return result
}

function loadSettingsFromDisk(): SettingsWithErrors {
    // Prevent recursive calls to loadSettingsFromDisk
    if (isLoadingSettings) {
        return { settings: {}, errors: [] }
    }

    const startTime = Date.now()
    logger.info('settings_load_started')

    isLoadingSettings = true
    try {
        // Start with plugin settings as the lowest priority base.
        // All file-based sources (user, project, local) override these.
        let mergedSettings: Partial<SettingsJson> = {}

        const allErrors: ValidationError[] = []
        const seenErrors = new Set<string>()
        const seenFiles = new Set<string>()

        // Merge settings from each source in priority order with deep merging
        for (const source of getEnabledSettingSources()) {
            const filePath = getSettingsFilePathForSource(source)
            if (filePath) {
                const resolvedPath = resolve(filePath)

                // Skip if we've already loaded this file from another source
                if (!seenFiles.has(resolvedPath)) {
                    seenFiles.add(resolvedPath)

                    const { settings, errors } = parseSettingsFile(filePath)

                    // Add unique errors (deduplication)
                    for (const error of errors) {
                        const errorKey = `${error.file}:${error.path}:${error.message}`
                        if (!seenErrors.has(errorKey)) {
                            seenErrors.add(errorKey)
                            allErrors.push(error)
                        }
                    }

                    if (settings) {
                        mergedSettings = mergeWith(
                            mergedSettings,
                            settings,
                            settingsMergeCustomizer,
                        )
                    }
                }
            }
        }

        logger.info('settings_load_completed', {
            duration_ms: Date.now() - startTime,
            source_count: seenFiles.size,
            error_count: allErrors.length,
        })

        return { settings: mergedSettings, errors: allErrors }
    } finally {
        isLoadingSettings = false
    }
}


/**
 * Custom merge function for arrays - concatenate and deduplicate
 */
function mergeArrays<T>(targetArray: T[], sourceArray: T[]): T[] {
    return [...new Set([...targetArray, ...sourceArray])]
}

/**
 * Custom merge function for lodash mergeWith when merging settings.
 * Arrays are concatenated and deduplicated; other values use default lodash merge behavior.
 * Exported for testing.
 */
export function settingsMergeCustomizer(
    objValue: unknown,
    srcValue: unknown,
): unknown {
    if (Array.isArray(objValue) && Array.isArray(srcValue)) {
        return mergeArrays(objValue, srcValue)
    }
    // Return undefined to let lodash handle default merge behavior
    return undefined
}
