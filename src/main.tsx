import {Command} from "commander";
import {render} from "./ink.ts";
import React from "react";
import {App} from "./components/App.tsx";

const program = new Command()

program
    .name('lor')
    .description('AI coding agent in the terminal')
    .version('0.1.0')
    .argument('[prompt]', 'Initial prompt (non-interactive mode)')
    .option('-c, --continue', 'Continue the most recent conversation')
    .option('-r, --resume <id>', 'Resume a conversation by session ID')
    .option('--model <model>', 'Model to use', 'claude-sonnet-4-6')
    .option('--verbose', 'Enable verbose logging')
    .option('-d, --debug', 'Enable debug mode (includes verbose)')
    .option('--permission-mode <mode>', 'Permission mode: default|plan|auto|bypassPermissions')
    .allowUnknownOption() // 转发给 Ink/React

program.parse(process.argv)

const opts = program.opts()
const [prompt] = program.args

render(React.createElement(App, {
    version: '0.1.0',
    opts,
    ...(prompt ? { prompt } : {})
}))
