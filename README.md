# PaddleReader

[![Tauri](https://img.shields.io/badge/Tauri-2-FFC131?logo=tauri&logoColor=white)](https://v2.tauri.app/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-radix--nova-black)](https://ui.shadcn.com/)
[![PaddleOCR](https://img.shields.io/badge/PaddleOCR-VL%201.6-2962FF)](https://www.paddleocr.ai/)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

桌面文档解析工具，调用 PaddleOCR API 将 PDF 和图片转为结构化 Markdown。

支持拖拽或粘贴批量导入，自动分批并发处理。解析结果按会话归档，可随时回看。内置 GFM 表格、KaTeX 公式和代码高亮渲染，也能一键切回 Markdown 源码。API 返回的图片会自动下载到本地嵌入。窗口采用无边框设计，带原生风格的自定义标题栏。

## 前置要求

需要 **PaddleOCR API Key**（[免费注册](https://aistudio.baidu.com/paddleocr)，每日 20000 页额度）、**Node.js** 18+、**Rust 工具链**（通过 [rustup](https://rustup.rs/) 安装），以及 Tauri 所需的[系统依赖](https://v2.tauri.app/start/prerequisites/)。

注册后登录百度 AI Studio，在 API 调用示例中即可获取 **API URL** 和 **Access Token**。默认 API URL 为 `https://paddleocr.aistudio-app.com/api/v2/ocr/jobs`。

## 安装

暂未提供预构建安装包，从源码构建：

```bash
git clone https://github.com/GitZhiQing/paddle-reader.git
cd paddle-reader
npm install
npm run tauri build
```

## 快速开始

首次启动会进入设置页面，填入 API URL 和 Token 后点击「测试连接」验证。通过后创建会话，拖入 PDF 或图片即可在右侧面板看到 Markdown 解析结果。

## 技术栈

前端 React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui，Tauri 2 桌面框架，Rust 后端处理文件读写与 API 调用，SQLite 本地存储。

## 开发

```bash
npm install
npm run tauri dev     # 桌面应用开发模式
npm run dev           # 仅前端（Vite，端口 1420）
npm run build         # 类型检查 + Vite 构建
```

Tauri 开发固定端口 `1420`，改 Rust 代码会自动重编译，构建包含 TypeScript 类型检查（`tsc && vite build`）。

## 致谢

[PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)、[Tauri](https://tauri.app/)、[shadcn/ui](https://ui.shadcn.com/)。

## License

[MIT](./LICENSE)
