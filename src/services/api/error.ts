import {APIError} from "@/utils/errors.ts";

export class AnthropicAPIError extends APIError {
    readonly status: number
    readonly type: string
    constructor(status: number, type: string, message: string) {
        super(message)
        this.status = status
        this.type = type
    }
}

export function isRetryable(err: unknown): boolean {
    if (err instanceof AnthropicAPIError) {
        if (err.status === 429) return true         // rate limit
        if (err.status === 408) return true         // timeout
        if (err.status === 409) return true         // conflict
        if (err.status >= 500) return true          // server
        if (err.status === 529) return true         // overloaded
        return false
    }
    // 网络错误
    if (err instanceof Error) {
        if (err.message.includes('ECONNRESET')) return true
        if (err.message.includes('ETIMEDOUT')) return true
    }
    return false
}

export function getRetryAfter(err: unknown): number | undefined {
    if (err instanceof AnthropicAPIError) {
        return err.headers?.['retry-after']
            ? parseInt(err.headers['retry-after'], 10) * 1000
            : undefined
    }
    return undefined
}
