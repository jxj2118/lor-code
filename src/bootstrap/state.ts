import { cwd } from 'process'
import { realpathSync } from 'fs'
import type {SettingSource} from "@/utils/settings/constants.ts";

type State = {
    originalCwd: string,
    allowedSettingSources: SettingSource[]
}

function getInitialState(): State {
    // Resolve symlinks in cwd to match behavior of shell.ts setCwd
    // This ensures consistency with how paths are sanitized for session storage
    let resolvedCwd = ''
    if (
        typeof process !== 'undefined' &&
        typeof process.cwd === 'function' &&
        typeof realpathSync === 'function'
    ) {
        const rawCwd = cwd()
        try {
            resolvedCwd = realpathSync(rawCwd).normalize('NFC')
        } catch {
            // File Provider EPERM on CloudStorage mounts (lstat per path component).
            resolvedCwd = rawCwd.normalize('NFC')
        }
    }
    return  {
        originalCwd: resolvedCwd,
        allowedSettingSources: [
            'userSettings',
            'projectSettings',
            'localSettings',
        ],
    }
}

const STATE: State = getInitialState()


export function getOriginalCwd(): string {
    return STATE.originalCwd
}

export function getAllowedSettingSources(): SettingSource[] {
    return STATE.allowedSettingSources
}

export function setAllowedSettingSources(sources: SettingSource[]): void {
    STATE.allowedSettingSources = sources
}
