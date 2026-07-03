# 贡献指南

感谢你对 PaddleReader 的关注！欢迎任何形式的贡献。

## 行为准则

请遵守 [Contributor Covenant](https://www.contributor-covenant.org/zh-cn/version/2/1/code_of_conduct/) 行为准则。

## 如何贡献

### 报告 Bug

1. 使用 [Bug Report](../../issues/new?template=bug_report.md) 模板创建 Issue
2. 包含以下信息：
   - 操作系统和版本
   - PaddleReader 版本
   - 复现步骤
   - 预期行为 vs 实际行为
   - 如可能，附上截图或日志

### 建议新功能

1. 使用 [Feature Request](../../issues/new?template=feature_request.md) 模板创建 Issue
2. 描述该功能解决什么问题
3. 描述你期望的方案

### 提交代码

1. Fork 本仓库
2. 创建特性分支：`git checkout -b feature/your-feature`
3. 进行你的改动
4. 确保构建通过：`npm run build`（含 tsc 类型检查）
5. 确保 Rust 编译通过：`cd src-tauri && cargo check && cargo clippy && cargo fmt --check`
6. 提交改动（使用 [Conventional Commits](https://www.conventionalcommits.org/)）：
   ```
   feat: add some feature
   fix: fix some bug
   ```
7. 推送到你的 fork 并创建 Pull Request

### PR 检查清单

在提交 PR 前，确认：

- [ ] `npm run build` 通过（含 TypeScript 类型检查）
- [ ] `cargo check` 和 `cargo clippy` 无警告
- [ ] `cargo fmt` 格式一致
- [ ] 手动测试了你的改动
- [ ] UI 改动附上截图
- [ ] 无新的 TypeScript 或 Rust 警告

## 开发环境

### 前置要求

- Node.js 18+
- Rust 工具链（通过 [rustup](https://rustup.rs/) 安装）
- 系统依赖见 [Tauri 前置条件](https://v2.tauri.app/start/prerequisites/)
- 一个 PaddleOCR API Key（用于测试，免费注册）

### 设置

```bash
git clone https://github.com/GitZhiQing/paddle-reader.git
cd paddle-reader
npm install
npm run tauri dev
```

详细的架构说明、技术约定和数据模型见 [AGENTS.md](./AGENTS.md) 和 [.docs/DEV.md](./.docs/DEV.md)。

## 代码规范

- **TypeScript**：严格模式，`noUnusedLocals` / `noUnusedParameters` 启用
- **Rust**：Edition 2021，使用 `cargo fmt` 和 `cargo clippy`
- **shadcn/ui**：永远走 CLI 安装组件（`npx shadcn@latest add <component>`），不要手动复制
- **样式**：使用语义色 token（`bg-primary` 等），禁止裸色值和手写 `dark:` 覆盖
- **类型**：领域类型集中在 `src/lib/types.ts`，与 SQLite schema 对齐
- **接口**：前端只通过 `lib/ocr.ts` / `lib/store.ts` / `lib/db.ts` 调用后端

## 项目结构

```
paddle-reader/
  src/               # React 前端 (TypeScript + Tailwind CSS v4)
  src-tauri/         # Tauri Rust 后端
  .docs/             # 开发文档和 API 参考
```

详见 [.docs/DEV.md](./.docs/DEV.md) 获取完整目录结构。

## License

本项目使用 [MIT 许可证](./LICENSE)。你的贡献也将在此许可证下发布。
