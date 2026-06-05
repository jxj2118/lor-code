# Lor-Code

### V1
- [x] **建立工程边界**: 锁定运行时 (Bun)、语言版本 (TS strict)、包管理器、构建工具
- [x] **建立启动流程**: Commander 解析 CLI → 加载配置 → 启动 React/Ink 应用

### V2
- [x] **配置读取**: 仅读取保留 local project user 3种配置
- [x] **初版日志**: 封装了统一入口，方便拓展
- [x] **错误定义**: errors.ts
- [x] **长时操作包装**: 原装 slowOperations.ts 用于检测暴露长耗时带来的性能问题
- [x] **增加测试**: settings.test.ts
