export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

export interface LogContext {
    scope?: string
    sessionId?: string
    [key: string]: unknown
}

let currentLevel: LogLevel =
    (process.env.LOR_LOG_LEVEL as LogLevel) ?? 'info'

export function setLogLevel(level: LogLevel) {
    currentLevel = level
}

function shouldLog(level: LogLevel): boolean {
    const order: Record<LogLevel, number> = {
        debug: 0, info: 1, warn: 2, error: 3, silent: 4,
    }
    return order[level] >= order[currentLevel]
}

export function createLogger(scope: string) {
    return {
        debug: (msg: string, ctx?: LogContext) =>
            shouldLog('debug') && emit('debug', scope, msg, ctx),
        info: (msg: string, ctx?: LogContext) =>
            shouldLog('info') && emit('info', scope, msg, ctx),
        warn: (msg: string, ctx?: LogContext) =>
            shouldLog('warn') && emit('warn', scope, msg, ctx),
        error: (msg: string, ctx?: LogContext) =>
            shouldLog('error') && emit('error', scope, msg, ctx),
    }
}

function emit(
    level: LogLevel,
    scope: string,
    msg: string,
    ctx?: LogContext
) {
    const record = {
        t: new Date().toISOString(),
        level,
        scope,
        msg,
        ...ctx,
    }
    // 先用日志打印，后续再修改
    console.log(JSON.stringify(record))
}
