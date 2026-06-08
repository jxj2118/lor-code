/**
 * CLI 启动编排.
 * V1 版本的 main.tsx 仅做 argv 解析，实际初始化委托由本文件完成
 */
import {createLogger} from "@/utils/logger.ts";
import {Command} from "commander";
import {type CLIOptions} from "@/utils/config.ts";
import {render} from "@/ink.ts";
import React from "react";
import {App} from "@/components/App.tsx";
import {getSettingsWithErrors} from "@/utils/settings/settings.ts";

const logger = createLogger('cli')

export async function runCli(argv: string[]) {
    // 1. 解析 CLI
    const program = new Command()
    program
        .name('lor-code')
        .version('0.1.0')
        .argument('[prompt]')
        .option('-c, --continue')
        .option('-r, --resume <id>')
        .option('--model <model>')
        .option('--verbose')
        .option('-d, --debug')
        .option('--permission-mode <mode>')
        .allowUnknownOption()

    program.parse(argv)
    const opts = program.opts<CLIOptions>()
    const [prompt] = program.args

    // 2. 加载配置
    const settingsWithErrors = getSettingsWithErrors()

    // 3. 决定日志级别
    if (opts.debug) {
        // logger.setLogLevel('debug')
    }

    // 4. 启动 UI
    render(
        React.createElement(App, {version: '0.1.0', opts, prompt, settings: settingsWithErrors.settings})
    )
}
