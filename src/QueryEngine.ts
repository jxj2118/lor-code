import {createLogger} from "@/utils/logger.ts";
import type {
    ContentBlockParam,
    Message, MessageParam,
    ThinkingConfigParam,
    ToolResultBlockParam
} from "@anthropic-ai/sdk/resources";
import {addUsage, emptyUsage, type UsageRecord} from "@/services/api/usage.ts";
import {streamConversation, type StreamRequest} from "@/services/api/claude.ts";
import {Anthropic} from "@anthropic-ai/sdk";

const logger = createLogger('query-engine')

export interface QueryEngineConfig {
    model: string
    maxTokens?: number
    system?: string
    tools?: Array<Anthropic.Tool>
    thinking?: ThinkingConfigParam
    maxToolIterations?: number
}

export type QueryEvent =
| { type: 'text'; text: string }
| { type: 'thinking'; thinking: string }
| { type: 'tool_use'; id: string; name: string; input: unknown }
| { type: 'usage'; usage: UsageRecord }
| { type: 'done'; stopReason: string }
| { type: 'error'; error: Error }

export interface QueryResult {
    messages: LorMessage[]
    finalUsage: UsageRecord
    stopReason: string
}

export type ToolExecutor = (
    name: string,
    input: unknown
) => Promise<string | ToolResultBlockParam>

export type LorMessage = MessageParam | Message

/**
 * 工具调用循环:
 * 1. 调 LLM
 * 2. 若 LLM 返回 tool_use, 执行所有 tool
 * 3. 把 tool_result 追加回 messages
 * 4. 跳回 1, 直到 LLM 返回 end_turn / max_tokens
 */
export async function runQuery(
    initialMessages: LorMessage[],
    config: QueryEngineConfig,
    executeTool: ToolExecutor,
    onEvent: (e: QueryEvent) => void
): Promise<QueryResult> {
    const messages: LorMessage[] = [...initialMessages]
    let totalUsage = emptyUsage()
    const maxIter = config.maxToolIterations ?? 50
    let stopReason = 'end_turn'

    for (let iter = 0; iter < maxIter; iter++) {
        const req: StreamRequest = {
            model: config.model,
            maxTokens: config.maxTokens ?? 8192,
            system: config.system,
            tools: config.tools,
            // @ts-ignore
            messages,
            thinking: config.thinking,
        }

        // 收集本轮 assistant 消息
        const assistantContent: ContentBlockParam[] = []
        let currentText = ''
        const toolUses: Array<{ id: string; name: string; input: unknown; rawInput: string }> = []
        let currentToolUse: { id: string; name: string; input: string } | null = null

        await new Promise<void>((resolve, reject) => {
            streamConversation(req, {
                onContentBlockStart: (_i, block) => {
                    assistantContent.push(block)
                    if (block.type === 'text') currentText = ''
                    if (block.type === 'tool_use') {
                        currentToolUse = { id: block.id, name: block.name, input: '' }
                    }
                },
                onText: (text) => {
                    currentText += text
                    onEvent({ type: 'text', text })
                },
                onThinking: (thinking) => {
                    onEvent({ type: 'thinking', thinking })
                },
                onContentBlockDelta: (_i, delta: any) => {
                    if (delta?.type === 'input_json_delta' && currentToolUse) {
                        currentToolUse.input += delta.partial_json
                    }
                },
                onContentBlockStop: () => {
                    if (currentToolUse) {
                        let parsed: unknown = {}
                        try { parsed = JSON.parse(currentToolUse.input) } catch {}
                        toolUses.push({ ...currentToolUse, rawInput: currentToolUse.input })
                        onEvent({ type: 'tool_use', id: currentToolUse.id, name: currentToolUse.name, input: parsed })
                        currentToolUse = null
                    }
                },
                onUsage: (u) => {
                    totalUsage = addUsage(totalUsage, u)
                    onEvent({ type: 'usage', usage: totalUsage })
                },
                onDone: (msg) => {
                    messages.push(msg)
                    stopReason = (msg as any).stop_reason ?? 'end_turn'
                    resolve()
                },
                onError: (err) => reject(err),
            })
        })

        // 工具调用循环
        if (toolUses.length === 0) {
            onEvent({ type: 'done', stopReason })
            break
        }

        // 并行执行所有 tool_use
        const toolResults = await Promise.all(
            toolUses.map(async (tu) => {
                const result = await executeTool(tu.name, tu.input)
                const block: ToolResultBlockParam = {
                    type: 'tool_result',
                    tool_use_id: tu.id,
                    content: typeof result === 'string' ? result : result.content,
                    is_error: typeof result === 'string' ? false : (result as ToolResultBlockParam).is_error,
                }
                return block
            })
        )

        // @ts-ignore
        messages.push({ role: 'user', content: toolResults })
    }

    return { messages, finalUsage: totalUsage, stopReason }
}
