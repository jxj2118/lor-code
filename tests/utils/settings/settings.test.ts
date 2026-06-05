import {describe, expect, test} from 'bun:test'
import {SettingsSchema} from "../../../src/schemas/settings";

describe('SettingsSchema', () => {
    test('默认值填充', () => {
        const r = SettingsSchema.parse({})
        expect(r.model).toBe('MiniMax-M3')
        expect(r.permissionMode).toBe('default')
    })
})
