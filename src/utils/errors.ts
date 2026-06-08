export class LorCodeError extends Error {
    readonly userFacingMessage: string
    constructor(message: string, userFacingMessage?: string) {
        super(message)
        this.name = this.constructor.name
        this.userFacingMessage = userFacingMessage ?? message
    }
}
export class ToolError extends LorCodeError {}
export class PermissionError extends LorCodeError {}
export class APIError extends LorCodeError {
     headers: Record<string, string> | undefined
}
export class ConfigError extends LorCodeError {}
export class InputError extends LorCodeError {}
export class CancellationError extends LorCodeError {}


export function getErrnoCode(e: unknown): string | undefined {
    if (e && typeof e === 'object' && 'code' in e && typeof e.code === 'string') {
        return e.code
    }
    return undefined
}
