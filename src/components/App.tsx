import React from 'react'
import { Text } from 'ink'

interface AppProps {
    version: string
    opts: Record<string, unknown>
    prompt?: string
}

export function App({ version, prompt }: AppProps) {
    return (
        <>
            <Text>Lor Code v{version}</Text>
            {prompt && <Text>Initial prompt: {prompt}</Text>}
            <Text dimColor>Skeleton mode.</Text>
        </>
    )
}
