import {createLogger} from "@/utils/logger.ts";
import {getRetryAfter, isRetryable} from "@/services/api/error.ts";

const logger = createLogger('api-retry')

interface RetryOptions {
    maxAttempts?: number
    baseDelayMs?: number
    maxDelayMs?: number
    jitter?: boolean
}

/**
 * 加抖动防止惊群效应
 * @param fn
 * @param opts
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    opts: RetryOptions = {}
): Promise<T> {
    const {
        maxAttempts = 5,
        baseDelayMs = 500,
        maxDelayMs = 32_000,
        jitter = true,
    } = opts

    let lastErr: unknown
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn()
        } catch (err) {
            lastErr = err
            if (!isRetryable(err) || attempt === maxAttempts) {
                throw err
            }

            // 计算退避时间
            const retryAfter = getRetryAfter(err)
            const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
            const delay = retryAfter ?? exp
            const jittered = jitter ? delay * (0.5 + Math.random() * 0.5) : delay

            logger.warn('Retrying API call', {
                attempt,
                maxAttempts,
                delayMs: Math.round(jittered),
                error: err instanceof Error ? err.message : String(err),
            })

            await sleep(jittered)
        }
    }
    throw lastErr
}

function sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms))
}
