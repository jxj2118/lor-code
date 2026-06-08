import {createLogger} from "@/utils/logger.ts";
import {addUsage, emptyUsage, type UsageRecord} from "@/services/api/usage.ts";
import {Anthropic} from "@anthropic-ai/sdk";
import {getAnthropicClient} from "@/services/api/client.ts";
import {withRetry} from "@/services/api/withRetry.ts";
import type {ContentBlockParam, Message, ThinkingConfigParam} from "@anthropic-ai/sdk/resources";
import type {MessageStreamEvent} from "@anthropic-ai/sdk/resources/messages";

const logger = createLogger('claude-api')

export interface StreamCallbacks {
    onContentBlockStart?: (index: number, block: ContentBlockParam) => void
    onContentBlockDelta?: (index: number, delta: unknown) => void
    onContentBlockStop?: (index: number) => void
    onText?: (text: string) => void
    onThinking?: (thinking: string) => void
    onToolUse?: (toolUse: { id: string; name: string; input: unknown }) => void
    onUsage?: (usage: Partial<UsageRecord>) => void
    onError?: (err: Error) => void
    onDone?: (finalMessage: Message, usage: UsageRecord) => void
}

export interface StreamRequest {
    model: string
    maxTokens: number
    system?: string | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral'; ttl?: '5m' | '1h'} }>
    tools?: Array<Anthropic.Tool>
    messages: Message[]
    thinking?: ThinkingConfigParam
    signal?: AbortSignal
}

export async function streamConversation(
    req: StreamRequest,
    cb: StreamCallbacks
): Promise<{ message: Message; usage: UsageRecord }> {
    const client = getAnthropicClient()
    logger.debug('Starting stream', { model: req.model, msgCount: req.messages.length })

    return withRetry(async () => {
        const stream = client.messages.stream({
            model: req.model,
            max_tokens: req.maxTokens,
            system: req.system,
            tools: req.tools,
            messages: req.messages,
            thinking: req.thinking,
            cache_control: {
                type: 'ephemeral',
                ttl: '5m',
            },
        })


        // 绑定 SDK 事件 → 业务回调
        let usage = emptyUsage()
        stream.on('streamEvent', (e: MessageStreamEvent, snapshot: Message) => {
           switch (e.type) {
               case "content_block_start":
                   cb.onContentBlockStart?.(e.index, e.content_block as ContentBlockParam)
                   if (e.content_block.type === 'tool_use') {
                       cb.onToolUse?.({
                           id: e.content_block.id,
                           name: e.content_block.name,
                           input: {},
                       })
                   }
                   break
               case "content_block_delta":
                   cb.onContentBlockDelta?.(e.index, e.delta)
                   if (e.delta.type === 'text_delta') {
                       cb.onText?.(e.delta.text)
                   } else if (e.delta.type === 'thinking_delta') {
                       cb.onThinking?.(e.delta.thinking)
                   }
                   break
               case "content_block_stop":
                   cb.onContentBlockStop?.(e.index)
                   break
               case "message_delta":
                   if (snapshot.usage) {
                       const u: Partial<UsageRecord> = {
                           outputTokens: snapshot.usage.output_tokens ?? 0,
                           cacheReadTokens: snapshot.usage.cache_read_input_tokens ?? 0,
                           cacheWriteTokens: snapshot.usage.cache_creation_input_tokens ?? 0,
                       }
                       usage = addUsage(usage, u)
                       cb.onUsage?.(u)
                   }
                   break

           }
        })


        const finalMessage = await stream.finalMessage()
        if (finalMessage.usage) {
            usage = addUsage(usage, {
                inputTokens: finalMessage.usage.input_tokens,
                outputTokens: finalMessage.usage.output_tokens,
                cacheReadTokens: finalMessage.usage.cache_read_input_tokens ?? 0,
                cacheWriteTokens: finalMessage.usage.cache_creation_input_tokens ?? 0,
                model: req.model,
                timestamp: Date.now(),
            })
        }

        cb.onDone?.(finalMessage as unknown as Message, usage)
        return { message: finalMessage as unknown as Message, usage }
    })
}
