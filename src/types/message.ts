/**
 * Anthropic Messages API 协议类型.
 * 与官方 SDK 字段一致
 */

export type Role = 'user' | 'assistant' | 'system'

export type ContentBlock =
    | TextBlock
    | ToolUseBlock
    | ToolResultBlock
    | ImageBlock
    | ThinkingBlock
    | { type: 'document'; source: DocumentSource }

export interface TextBlock {
    type: 'text'
    text: string
}

export interface ImageBlock {
    type: 'image'
    source: { type: 'base64'; media_type: string; data: string }
}

export interface ThinkingBlock {
    type: 'thinking'
    thinking: string
    signature?: string  // 用于多轮 thinking 校验
}

export interface ToolUseBlock {
    type: 'tool_use'
    id: string
    name: string
    input: unknown  // 实际类型由 tool.inputSchema 决定
}

export interface ToolResultBlock {
    type: 'tool_result'
    tool_use_id: string
    content: string | Array<TextBlock | ImageBlock>
    is_error?: boolean
}

export interface DocumentSource {
    type: 'base64'
    media_type: string
    data: string
}

export interface Message {
    role: Role
    content: string | Array<ContentBlock>
}
