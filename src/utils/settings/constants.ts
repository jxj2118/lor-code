import {getAllowedSettingSources} from "@/bootstrap/state.ts";

/**
 * Claude Code 原始定义
 * All possible sources where settings can come from
 * Order matters - later sources override earlier ones
 */
export const SETTING_SOURCES = [
    // User settings (global)
    'userSettings',

    // Project settings (shared per-directory)
    'projectSettings',

    // Local settings (gitignored)
    'localSettings',

] as const

export type SettingSource = (typeof SETTING_SOURCES)[number]

export function getSettingSourceName(source: SettingSource): string {
    switch (source) {
        case 'userSettings':
            return 'user'
        case 'projectSettings':
            return 'project'
        case 'localSettings':
            return 'project, gitignored'
    }
}

/**
 * Get short display name for a setting source (capitalized, for context/skills UI)
 * @param source The setting source or 'plugin'/'built-in'
 * @returns Short capitalized display name like 'User', 'Project', 'Plugin'
 */
export function getSourceDisplayName(
    source: SettingSource | 'plugin' | 'built-in',
): string {
    switch (source) {
        case 'userSettings':
            return 'User'
        case 'projectSettings':
            return 'Project'
        case 'localSettings':
            return 'Local'
        case 'plugin':
            return 'Plugin'
        case 'built-in':
            return 'Built-in'
    }
}

/**
 * Get enabled setting sources with policy/flag always included
 * @returns Array of enabled SettingSource values
 */
export function getEnabledSettingSources(): SettingSource[] {
    const allowed = getAllowedSettingSources()

    // Always include policy and flag settings
    const result = new Set<SettingSource>(allowed)
    return Array.from(result)
}
