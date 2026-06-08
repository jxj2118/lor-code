//定义所有 Tool 必须实现的契约
import {z} from "zod";
import type {ImageBlockParam, TextBlockParam} from "@anthropic-ai/sdk/resources";

/**
 * 工具调用结果 (Anthropic 协议).
 */
export interface ToolResult {
    type: 'tool_result'
    tool_use_id: string
    content: ToolResultContent
    is_error?: boolean
}

export type ToolResultContent =
    | string
    | Array<TextBlockParam | ImageBlockParam>

/**
 * 工具进度状态 (用于 UI 展示).
 */
export type ToolUseStatus =
    | 'pending'        // 等待 LLM 决策
    | 'streaming'      // LLM 正在生成参数
    | 'awaiting_permission'  // 等待用户授权
    | 'running'        // 正在执行
    | 'completed'      // 完成
    | 'failed'         // 失败
    | 'cancelled'      // 用户取消

/**
 * 工具接口.
 */
export interface Tool<InputSchema extends z.ZodTypeAny = z.ZodTypeAny> {
    name: string
    description: string
    inputSchema: InputSchema
    // V2仅声明接口
    call(
        input: z.infer<InputSchema>,
        context: ToolCallContext
    ): Promise<ToolResult>
}

export interface ToolCallContext {
    sessionId: string
    abortController: AbortController
    workingDirectory: string
}
