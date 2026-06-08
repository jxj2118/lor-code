export interface UsageRecord {
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
    webSearchRequests: number
    costUsd: number
    model: string
    timestamp: number
}

export function emptyUsage(): UsageRecord {
    return {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        webSearchRequests: 0,
        costUsd: 0,
        model: '',
        timestamp: 0,
    }
}

export function addUsage(a: UsageRecord, b: Partial<UsageRecord>): UsageRecord {
    return {
        inputTokens: a.inputTokens + (b.inputTokens ?? 0),
        outputTokens: a.outputTokens + (b.outputTokens ?? 0),
        cacheReadTokens: a.cacheReadTokens + (b.cacheReadTokens ?? 0),
        cacheWriteTokens: a.cacheWriteTokens + (b.cacheWriteTokens ?? 0),
        webSearchRequests: a.webSearchRequests + (b.webSearchRequests ?? 0),
        costUsd: a.costUsd + (b.costUsd ?? 0),
        model: b.model ?? a.model,
        timestamp: b.timestamp ?? a.timestamp,
    }
}
