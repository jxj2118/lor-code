import { describe, expect, test, mock } from 'bun:test'
import {withRetry} from "../../../src/services/api/withRetry";
import {AnthropicAPIError} from "../../../src/services/api/error";

describe('withRetry', () => {
    test('成功不重试', async () => {
        const fn = mock(() => Promise.resolve('ok'))
        const r = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 })
        expect(r).toBe('ok')
        expect(fn).toHaveBeenCalledTimes(1)
    })

    test('500 错误重试', async () => {
        const err = new AnthropicAPIError(500, 'server_error', 'oops')
        const fn = mock()
            .mockRejectedValueOnce(err)
            .mockRejectedValueOnce(err)
            .mockResolvedValueOnce('ok')
        const r = await withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 })
        expect(r).toBe('ok')
        expect(fn).toHaveBeenCalledTimes(3)
    })

    test('400 错误不重试', async () => {
        const err = new AnthropicAPIError(400, 'invalid_request', 'bad')
        const fn = mock().mockRejectedValue(err)
        await expect(withRetry(fn, { maxAttempts: 3, baseDelayMs: 1 })).rejects.toThrow()
        expect(fn).toHaveBeenCalledTimes(1)
    })

    test('超过 maxAttempts 后抛出最后错误', async () => {
        const err = new AnthropicAPIError(500, 'server', 'oops')
        const fn = mock().mockRejectedValue(err)
        await expect(withRetry(fn, { maxAttempts: 2, baseDelayMs: 1 })).rejects.toThrow()
        expect(fn).toHaveBeenCalledTimes(2)
    })
})
