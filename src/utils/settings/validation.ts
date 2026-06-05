import type {SettingsJson} from "@/schemas/settings.ts";
import type {ZodError} from "zod";
import * as z from "zod";
function isInvalidTypeIssue(issue: z.core.$ZodIssue): issue is z.core.$ZodIssue & {
    code: 'invalid_type'
    expected: string
    input: unknown
} {
    return issue.code === 'invalid_type'
}

function isInvalidValueIssue(issue: z.core.$ZodIssue): issue is z.core.$ZodIssue & {
    code: 'invalid_value'
    values: unknown[]
    input: unknown
} {
    return issue.code === 'invalid_value'
}

function isUnrecognizedKeysIssue(
    issue: z.core.$ZodIssue,
): issue is z.core.$ZodIssue & { code: 'unrecognized_keys'; keys: string[] } {
    return issue.code === 'unrecognized_keys'
}

function isTooSmallIssue(issue: z.core.$ZodIssue): issue is z.core.$ZodIssue & {
    code: 'too_small'
    minimum: number | bigint
    origin: string
} {
    return issue.code === 'too_small'
}

export type FieldPath = string

export type ValidationError = {
    /** Relative file path */
    file?: string
    /** Field path in dot notation */
    path: FieldPath
    /** Human-readable error message */
    message: string
    /** Expected value or type */
    expected?: string
    /** The actual invalid value that was provided */
    invalidValue?: unknown
}

/**
 * Format a Zod validation error into human-readable validation errors
 */
/**
 * Get the type string for an unknown value (for error messages)
 */
function getReceivedType(value: unknown): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (Array.isArray(value)) return 'array'
    return typeof value
}

export type SettingsWithErrors = {
    settings: Partial<SettingsJson>
    errors: ValidationError[]
}

function extractReceivedFromMessage(msg: string): string | undefined {
    const match = msg.match(/received (\w+)/)
    return match ? match[1] : undefined
}


export function formatZodError(
    error: ZodError,
    filePath: string,
): ValidationError[] {
    return error.issues.map((issue): ValidationError => {
        const path = issue.path.map(String).join('.')
        let message = issue.message
        let expected: string | undefined

        let enumValues: string[] | undefined
        let expectedValue: string | undefined
        let receivedValue: unknown
        let invalidValue: unknown

        if (isInvalidValueIssue(issue)) {
            enumValues = issue.values.map(v => String(v))
            expectedValue = enumValues.join(' | ')
            receivedValue = undefined
            invalidValue = undefined
        } else if (isInvalidTypeIssue(issue)) {
            expectedValue = issue.expected
            const receivedType = extractReceivedFromMessage(issue.message)
            receivedValue = receivedType ?? getReceivedType(issue.input)
            invalidValue = receivedType ?? getReceivedType(issue.input)
        } else if (isTooSmallIssue(issue)) {
            expectedValue = String(issue.minimum)
        } else if (issue.code === 'custom' && 'params' in issue) {
            const params = issue.params as { received?: unknown }
            receivedValue = params.received
            invalidValue = receivedValue
        }

        // claude code不仅给了错误信息，还给了修复建议和目标文件
        // 增加功能选择性过滤
        // const tip = getValidationTip({
        //     path,
        //     code: issue.code,
        //     expected: expectedValue,
        //     received: receivedValue,
        //     enumValues,
        //     message: issue.message,
        //     value: receivedValue,
        // })

        if (isInvalidValueIssue(issue)) {
            expected = enumValues?.map(v => `"${v}"`).join(', ')
            message = `Invalid value. Expected one of: ${expected}`
        } else if (isInvalidTypeIssue(issue)) {
            const receivedType =
                extractReceivedFromMessage(issue.message) ??
                getReceivedType(issue.input)
            if (
                issue.expected === 'object' &&
                receivedType === 'null' &&
                path === ''
            ) {
                message = 'Invalid or malformed JSON'
            } else {
                message = `Expected ${issue.expected}, but received ${receivedType}`
            }
        } else if (isUnrecognizedKeysIssue(issue)) {
            const keys = issue.keys.join(', ')
            message = `Unrecognized ${(issue.keys.length > 1 ? 'fields': 'field')}: ${keys}`
        } else if (isTooSmallIssue(issue)) {
            message = `Number must be greater than or equal to ${issue.minimum}`
            expected = String(issue.minimum)
        }

        return {
            file: filePath,
            path,
            message,
            expected,
            invalidValue
        }
    })
}
