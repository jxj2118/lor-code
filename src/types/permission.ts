/**
 * Claude Code 原始定义
 * Pure permission type definitions extracted to break import cycles.
 */


export const EXTERNAL_PERMISSION_MODES = [
    'acceptEdits',
    'bypassPermissions',
    'default',
    'dontAsk',
    'plan',
] as const

export type ExternalPermissionMode = (typeof EXTERNAL_PERMISSION_MODES)[number]

export type InternalPermissionMode = ExternalPermissionMode | 'auto' | 'bubble'

export type PermissionMode = InternalPermissionMode

export type PermissionBehavior = 'allow' | 'deny' | 'ask'
