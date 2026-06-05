import {stripBOM} from "@/utils/jsonRead.ts";
import {memoizeWithLRU} from "@/utils/memoize.ts";
import {createLogger} from "@/utils/logger.ts";

type CachedParse = { ok: true; value: unknown } | { ok: false }

const logger = createLogger('util-json')
const PARSE_CACHE_MAX_KEY_BYTES = 8 * 1024

function parseJSONUncached(json: string, shouldLogError: boolean): CachedParse {
    try {
        return { ok: true, value: JSON.parse(stripBOM(json)) }
    } catch (e) {
        if (shouldLogError) {
            logger.error("parseJSONUncached error", {e})
        }
        return { ok: false }
    }
}

const parseJSONCached = memoizeWithLRU(parseJSONUncached, json => json, 50)


// Important: memoized for performance (LRU-bounded to 50 entries, small inputs only).
export const safeParseJSON = Object.assign(
    function safeParseJSON(
        json: string | null | undefined,
        shouldLogError: boolean = true,
    ): unknown {
        if (!json) return null
        const result =
            json.length > PARSE_CACHE_MAX_KEY_BYTES
                ? parseJSONUncached(json, shouldLogError)
                : parseJSONCached(json, shouldLogError)
        return result.ok ? result.value : null
    },
    { cache: parseJSONCached.cache },
)
