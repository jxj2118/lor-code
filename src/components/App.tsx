import React from 'react'
import { Text } from 'ink'
import type {CLIOptions} from "@/utils/config.ts";

interface AppProps {
    version: string
    opts: CLIOptions
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
