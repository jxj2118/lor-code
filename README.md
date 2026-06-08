# Lor-Code

### V1
- [x] **建立工程边界**: 锁定运行时 (Bun)、语言版本 (TS strict)、包管理器、构建工具
- [x] **建立启动流程**: Commander 解析 CLI → 加载配置 → 启动 React/Ink 应用

### V2
- [x] **配置读取**: 仅读取保留 local project user 3种配置
- [x] **初版日志**: 封装了统一入口，方便拓展
- [x] **错误定义**: `errors.ts`
- [x] **长时操作包装**: 原装 `slowOperations.ts` 用于检测暴露长耗时带来的性能问题
- [x] **增加测试**: `settings.test.ts`

### V3
- [x] **接入`@anthropic-ai/sdk`实现claude client**: claude.ts client.ts
- [x] **流式 SSE 解析**
- [x] **工具调用循环**: 暂时还没真正接入工具
- [x] **Prompt Caching**: Anthropic `cache_control` 字段
- [x] **Thinking 模式**: extended thinking 的协议层，QueryEngineConfig 的 thinking 参数，默认开启
- [x] **用量统计**: `usage.ts`
- [x] **增加测试**: `withRetry.test.ts`
