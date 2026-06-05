import {z} from "zod";
import {EXTERNAL_PERMISSION_MODES} from "@/types/permission.ts";


export const SettingsSchema = z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().optional().default("https://api.minimaxi.com/anthropic"),
    model: z.string().default('MiniMax-M3'),
    maxTokens: z.number().int().positive().default(524288),
    temperature: z.number().min(0).max(1).default(1),
    permissionMode: z.enum(EXTERNAL_PERMISSION_MODES).default('default'),
    enableAllProjectMcpServers: z.boolean().default(false),
    // 钩子列表
    hooks: z.record(z.string(), z.array(z.any())).default({}),
})

export type SettingsJson = z.infer<typeof SettingsSchema>
