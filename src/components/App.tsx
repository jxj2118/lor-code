import React, {useState} from 'react'
import { Text } from 'ink'
import type {CLIOptions} from "@/utils/config.ts";
import {Box} from "@/ink.ts";
import {runQuery} from "@/QueryEngine.ts";

interface AppProps {
    version: string
    opts: CLIOptions
    prompt?: string
    settings: { model: string; maxTokens: number }
}

export function App({ version, prompt, settings }: AppProps) {
    const [text, setText] = useState('')
    const [thinking, setThinking] = useState('')
    const [streaming, setStreaming] = useState(false)
    const [done, setDone] = useState(false)

    React.useEffect(() => {
        if (!prompt) return
        setStreaming(true)
        runQuery(
            [{ role: 'user', content: [{"type": "text", "text": prompt}] }],
            { model: settings.model, maxTokens: settings.maxTokens },
            async (name) => `[stub] ${name} called`,
            (e) => {
                if (e.type === 'text') setText(prev => prev + e.text)
                if (e.type === 'thinking') setThinking(prev => prev + e.thinking)
                if (e.type === 'done') { setStreaming(false); setDone(true) }
                if (e.type === 'error') { setText(prev => prev + `\n[error] ${e.error.message}`); setStreaming(false) }
            }
        ).catch(console.error)
    }, [])

    if (!prompt) {
        return (
            <Box flexDirection="column">
                <Text>Lor Code v{version}</Text>
                <Text dimColor>V03: API client ready. Pass a prompt to start.</Text>
            </Box>
        )
    }

    return (
        <Box flexDirection="column" paddingX={1}>
            {thinking && <Text color="gray" dimColor>{thinking}</Text>}
            <Text>{text}</Text>
            {streaming && <Text dimColor>█</Text>}
            {done && <Text dimColor>— done</Text>}
        </Box>
    )
}
