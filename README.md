# PaddleReader

[![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)](https://v2.tauri.app/) [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/) [![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/) [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/) [![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-radix--nova-black)](https://ui.shadcn.com/) [![PaddleOCR](https://img.shields.io/badge/PaddleOCR-VL%201.6-2962FF)](https://www.paddleocr.ai/) [![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

基于 PaddleOCR API 的桌面文档解析工具 —— 将 PDF 和图片转换为结构化 Markdown，支持会话管理和批量处理。

## 功能

- **文档解析** — 通过 PaddleOCR VL 1.6 模型识别 PDF / 图片并输出 Markdown
- **批量处理** — 拖拽或粘贴多个文件，自动分批并发解析
- **会话管理** — 按会话组织历史记录，随时切换查看
- **富文本渲染** — 支持 GFM 表格、KaTeX 数学公式、代码语法高亮
- **渲染 / 原始切换** — 在富文本和原始 Markdown 之间一键切换
- **自定义标题栏** — 无边框窗口，原生观感的自定义标题栏
- **剪贴板粘贴** — 支持 Ctrl+V 直接粘贴图片和 PDF
- **图片嵌入** — API 返回的图片自动下载到本地并渲染

## 前置要求

- **PaddleOCR API Key**（免费注册获取，见下方）
- **Node.js** 18+
- **Rust 工具链**（[rustup](https://rustup.rs/) 安装）
- **系统依赖**（Tauri 要求，详见 [Tauri 前置条件](https://v2.tauri.app/start/prerequisites/)）

### 获取 API Key

1. 访问 [PaddleOCR 官网](https://aistudio.baidu.com/paddleocr/task)
2. 注册/登录百度 AI Studio 账号
3. 在 API 调用示例中获取你的 **API URL** 和 **Access Token**
4. 每个用户每日可免费解析 3000 页

## 安装

从 [Releases](../../releases) 页面下载对应平台的安装包。支持 Windows、macOS、Linux。

或从源码构建：

```bash
# 克隆仓库
git clone https://github.com/GitZhiQing/paddle-reader.git
cd paddle-reader

# 安装依赖
npm install

# 构建桌面应用
npm run tauri build
```

## 快速开始

1. 启动 PaddleReader
2. 首次使用会强制进入 **设置页面**，填入你的 API URL 和 Token
   - 默认 API URL: `https://paddleocr.aistudio-app.com/api/v2/ocr/jobs`
   - Token 从 [AI Studio](https://aistudio.baidu.com/) 获取
3. 点击「测试连接」验证凭据
4. 创建会话，拖入 PDF 或图片文件
5. 右侧面板查看解析后的 Markdown 富文本

## 技术栈

React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui，Tauri 2 桌面框架，Rust 后端处理文件读写与 API 调用，SQLite 本地存储。

### 架构概览

```
前端 (React/TS)              后端 (Rust/Tauri)
┌──────────────┐    invoke    ┌─────────────────────┐
│  UI 组件      │ ──────────→ │  commands.rs         │
│  SessionCtx  │ ←────────── │  5 个 Tauri 命令     │
│  SQLite (db) │             └─────────┬───────────┘
└──────────────┘                       │
                                       ▼
                            ┌─────────────────────┐
                            │  ocr_client.rs       │
                            │  submit → poll →     │
                            │  fetch JSONL         │
                            └─────────┬───────────┘
                                      │ HTTP
                                      ▼
                            ┌─────────────────────┐
                            │  PaddleOCR API       │
                            │  (async jobs)        │
                            └─────────────────────┘
```

### 项目结构

```
src/                    # React 前端
  components/
    layout/TitleBar.tsx
    sidebar/            # 会话列表、侧栏
    settings/           # 设置页面
    workspace/          # 左右分栏：附件面板 | 文本面板
      attachments/      # 上传、批量组、剪贴板粘贴
      text/             # Markdown 渲染、原始文本
    ui/                 # shadcn/ui 组件
  lib/                  # 工具函数、类型、数据库封装
  state/                # React Context 状态管理
src-tauri/              # Tauri Rust 后端
  src/
    commands.rs         # Tauri 命令
    ocr_client.rs       # PaddleOCR async API 客户端
    images.rs           # 图片持久化
    settings.rs         # 设置存储
```

## 开发

```bash
npm install
npm run tauri dev        # 桌面应用开发模式
npm run dev              # 仅前端 (Vite, :1420)
npm run build            # tsc 类型检查 + Vite 构建
```

- Tauri 开发固定端口 `1420`（`strictPort: true`）
- 改 Rust 代码后 `tauri dev` 会自动重编译
- 类型检查是构建的一部分（`tsc && vite build`）

## 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解开发设置和提交流程。

更多项目架构和开发约定见 [AGENTS.md](./AGENTS.md)。

## API 文档

本项目使用 PaddleOCR 异步 API。官方文档及调用示例见 [.docs/](./.docs/) 目录。

## 致谢

- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) — 百度 PaddlePaddle 团队
- [Tauri](https://tauri.app/) — 桌面应用框架
- [shadcn/ui](https://ui.shadcn.com/) — 组件系统

## License

[MIT](./LICENSE)
