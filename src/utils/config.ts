import {type ExternalPermissionMode} from "@/types/permission.ts";

export interface CLIOptions {
    continue?: boolean
    resume?: string
    model?: string
    verbose?: boolean
    debug?: boolean
    permissionMode?: ExternalPermissionMode
}

