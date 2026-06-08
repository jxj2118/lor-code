import {createLogger} from "@/utils/logger.ts";
import {Anthropic} from "@anthropic-ai/sdk";
import {APIError} from "@/utils/errors.ts";
import {getApiKeyWithSource} from "@/utils/auth.ts";
import {getSettingsWithErrors} from "@/utils/settings/settings.ts";

const logger = createLogger('api-client')

let cachedClient: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
    if (cachedClient) return cachedClient

    const settingsWithErrors = getSettingsWithErrors()
    const apiKey = getApiKeyWithSource()
    if (!apiKey.key) {
        throw new APIError(
            'No API key found',
            '未找到 API Key'
        )
    }

    cachedClient = new Anthropic({
        apiKey: apiKey.key,
        baseURL: settingsWithErrors.settings.baseUrl,
        authToken: undefined,
        maxRetries: 0, // 由 withRetry 接管
    })

    return cachedClient
}

export function clearCachedClient() {
    cachedClient = null
}
