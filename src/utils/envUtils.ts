import {join} from "path";
import { homedir } from 'os'
import memoize from "memoize";

export const getLorConfigHomeDir = memoize(
    (): string => {
        return (
            process.env.Lor_CONFIG_DIR ?? join(homedir(), '.lor')
        ).normalize('NFC')
    }
)
