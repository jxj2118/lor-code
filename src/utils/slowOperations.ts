import { feature } from 'bun:bundle'
import worker_threads from "node:worker_threads";
import {createLogger} from "@/utils/logger.ts";

const logger = createLogger('SlowOperation')

// --- Slow operation logging infrastructure ---

/**
 * Threshold in milliseconds for logging slow JSON/clone operations.
 * Operations taking longer than this will be logged for debugging.
 * - Override: set CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS to a number
 * - Dev builds: 20ms (lower threshold for development)
 * - Ants: 300ms (enabled for all internal users)
 */
const SLOW_OPERATION_THRESHOLD_MS = (() => {
    const envValue = process.env.CLAUDE_CODE_SLOW_OPERATION_THRESHOLD_MS
    if (envValue !== undefined) {
        const parsed = Number(envValue)
        if (!Number.isNaN(parsed) && parsed >= 0) {
            return parsed
        }
    }
    if (process.env.NODE_ENV === 'development') {
        return 20
    }
    if (process.env.USER_TYPE === 'ant') {
        return 300
    }
    return Infinity
})()

// Re-export for callers that still need the threshold value directly
export { SLOW_OPERATION_THRESHOLD_MS }

// Module-level re-entrancy guard. logForDebugging writes to a debug file via
// appendFileSync, which goes through slowLogging again. Without this guard,
// a slow appendFileSync → dispose → logForDebugging → appendFileSync → dispose → ...
let isLogging = false

/**
 * Extract the first stack frame outside this file, so the DevBar warning
 * points at the actual caller instead of a useless `Object{N keys}`.
 * Only called when an operation was actually slow — never on the fast path.
 */
export function callerFrame(stack: string | undefined): string {
    if (!stack) return ''
    for (const line of stack.split('\n')) {
        if (line.includes('slowOperations')) continue
        const m = line.match(/([^/\\]+?):(\d+):\d+\)?$/)
        if (m) return ` @ ${m[1]}:${m[2]}`
    }
    return ''
}
/**
 * Builds a human-readable description from tagged template arguments.
 * Only called when an operation was actually slow — never on the fast path.
 *
 * args[0] = TemplateStringsArray, args[1..n] = interpolated values
 */
function buildDescription(args: IArguments): string {
    const strings = args[0] as TemplateStringsArray
    let result = ''
    for (let i = 0; i < strings.length; i++) {
        result += strings[i]
        if (i + 1 < args.length) {
            const v = args[i + 1]
            if (Array.isArray(v)) {
                result += `Array[${(v as unknown[]).length}]`
            } else if (v !== null && typeof v === 'object') {
                result += `Object{${Object.keys(v as Record<string, unknown>).length} keys}`
            } else if (typeof v === 'string') {
                result += v.length > 80 ? `${v.slice(0, 80)}…` : v
            } else {
                result += String(v)
            }
        }
    }
    return result
}

class AntSlowLogger {
    startTime: number
    args: IArguments
    err: Error

    constructor(args: IArguments) {
        this.startTime = performance.now()
        this.args = args
        // V8/JSC capture the stack at construction but defer the expensive string
        // formatting until .stack is read — so this stays off the fast path.
        this.err = new Error()
    }

    [Symbol.dispose](): void {
        const duration = performance.now() - this.startTime
        if (duration > SLOW_OPERATION_THRESHOLD_MS && !isLogging) {
            isLogging = true
            try {
                const description =
                    buildDescription(this.args) + callerFrame(this.err.stack)
                // logForDebugging(
                //     `[SLOW OPERATION DETECTED] ${description} (${duration.toFixed(1)}ms)`,
                // )
                // addSlowOperation(description, duration)
                logger.debug(`[SLOW OPERATION DETECTED] ${description} (${duration.toFixed(1)}ms)`)
            } finally {
                isLogging = false
            }
        }
    }
}

const NOOP_LOGGER: Disposable = { [Symbol.dispose]() {} }

// Must be regular functions (not arrows) to access `arguments`
function slowLoggingAnt(
    _strings: TemplateStringsArray,
    ..._values: unknown[]
): AntSlowLogger {
    // eslint-disable-next-line prefer-rest-params
    return new AntSlowLogger(arguments)
}

function slowLoggingExternal(): Disposable {
    return NOOP_LOGGER
}

export const slowLogging: {
    (strings: TemplateStringsArray, ...values: unknown[]): Disposable
} = feature('SLOW_OPERATION_LOGGING') ? slowLoggingAnt : slowLoggingExternal

export function clone<T>(value: T, options?: worker_threads.StructuredSerializeOptions): T {
    using _ = slowLogging`structuredClone(${value})`
    return structuredClone(value, options)
}
