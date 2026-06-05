import type {ReactElement} from "react";
import type {CLIOptions} from "@/utils/config.ts";


/**
 * 斜杠命令接口.
 */
export interface Command {
    name: string
    description: string
    aliases?: string[]
    hidden?: boolean
    isEnabled?: (opts: CLIOptions) => boolean

    // 命令行为
    execute(args: CommandArgs): Promise<CommandResult>
}

export interface CommandArgs {
    raw: string
    args: string[]
    flags: Record<string, string | boolean>
    opts: CLIOptions
}

export type CommandResult =
    | { type: 'message'; content: string }
    | { type: 'exit' }
    | { type: 'redirect'; to: string }
    | { type: 'render'; element: ReactElement }
