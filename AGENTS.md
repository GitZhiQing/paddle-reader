# AGENTS.md

> 本文件面向 **AI 编程代理** 和 **新加入的人类贡献者**，提供项目导航和技术约定。读完这一份即可上手。

---

## 1. 项目概述

**Paddle Reader** 是一个基于 **Tauri v2 + React 19** 的桌面应用，用 **PaddleOCR-VL**（`PaddleOCR-VL-1.6`）把 PDF / 图片批量识别成 Markdown，供阅读和复制。

- 典型流程：新建会话 → 拖入/粘贴文件 → 后端调用 PaddleOCR async API 解析 → 每个 attachment 拼成 Markdown 在右侧文本面板渲染（含代码高亮、KaTeX 数学、GFM）。
- 单窗口、无边框（`decorations: false`），自定义 `TitleBar`。
- 首次启动若无凭据（`apiUrl` / `token`），强制进入设置页。

---

## 2. 技术栈

| 层 | 技术 |
| --- | --- |
| 桌面外壳 | Tauri v2（Rust 后端 + WebView 前端），端口 `1420` |
| 前端框架 | React 19 + TypeScript（Vite 7） |
| 样式 | Tailwind CSS v4（`@tailwindcss/vite`，`@theme inline` 变量写在 `src/globals.css`） |
| 组件库 | **shadcn/ui**（`new-york` style，base = radix，详见第 4 节） |
| 状态 | React Context（`src/state/SessionContext.tsx`） |
| 持久化 | SQLite（`@tauri-apps/plugin-sql`，文件 `paddle-reader.db`）+ store 插件（保存设置） |
| Markdown | `react-markdown` + `remark-gfm` / `remark-math` + `rehype-raw` / `rehype-katex` / `rehype-highlight` |
| 图标 | `lucide-react` |
| 通知 | `sonner`（`<Toaster richColors />` 挂在 App 根） |

> **注意包名**：依赖里既有 `radix-ui`（统一聚合包，v1.6）也有各 shadcn 组件。`react-resizable-panels` 锁 `^4`（API 与 v3 不同，见第 6 节）。

---

## 3. 目录结构

```
src/
  App.tsx                    # 根：TitleBar + 视图切换(workspace|settings) + Provider
  main.tsx
  globals.css                # Tailwind 入口 + 全部 @theme 颜色变量(明/暗)
  components/
    layout/TitleBar.tsx
    sidebar/                 # 会话列表、侧栏
    settings/SettingsPage.tsx
    workspace/
      Workspace.tsx          # 左右分栏(Resizable)：附件面板 | 文本面板
      attachments/           # 上传、批量组、剪贴板粘贴、行项
      text/                  # 文本面板、Markdown 渲染块
    ui/                      # shadcn 组件(见第 4 节)
  state/SessionContext.tsx   # 会话/批次/附件的 Context + 业务逻辑
  hooks/useUpload.ts
  lib/
    db.ts        # SQLite 封装(懒加载 + 建表 schema)
    ocr.ts       # 前端调 invoke('parse_document')
    store.ts     # 前端调 get/save/test_connection/hasCredentials
    types.ts     # 领域类型(Session/Batch/Attachment/Settings/ParseResult)
    assets.ts    # 资源/图片路径
    utils.ts     # cn() 等
src-tauri/
  src/
    lib.rs       # invoke_handler! 注册全部命令
    commands.rs  # parse_document / test_connection / get_settings / save_settings / write_temp_file
    ocr_client.rs# PaddleOCR async API 客户端(submit→poll→fetch jsonl, multipart, bearer)
    settings.rs / images.rs / error.rs
  tauri.conf.json
  capabilities/  # Tauri 权限清单
```

**数据模型（`lib/types.ts`，与 SQLite 表对齐）：** `Session 1—N Batch 1—N Attachment`。`Attachment.file_type`：`0=pdf, 1=image`（PaddleOCR 约定）。`status`：`pending|uploading|parsing|done|error`。

---

## 4. shadcn/ui 使用规范（重点）

### 4.1 配置（`components.json`）

- `style: new-york`，`base: radix`，`tailwind: v4`，`rsc: false`（Vite SPA，组件**不需要** `"use client"`）。
- 别名：`@/components`、`@/components/ui`、`@/lib/utils`、`@/hooks`。`@` 在 `vite.config.ts` 与 `tsconfig.json` 都解析到 `./src`。
- 图标库：`lucide`。
- 全局 CSS：`src/globals.css`（修改主题/颜色变量只动这个文件，不要新建）。

### 4.2 已安装组件（`src/components/ui/`）

`badge` `button` `card` `dialog` `dropdown-menu` `input` `label` `resizable` `scroll-area` `separator` `skeleton` `sonner` `toggle` `toggle-group` `tooltip`

> 用之前先确认已安装；不要 import 未安装的组件，也不要重复 `add` 已有的。

### 4.3 核心原则（务必遵守）

1. **优先用现有组件**，不要手写带样式的 `div` 替代。
2. **`className` 只管布局，不要覆盖组件的颜色/字号/字重等视觉**。用内置 `variant` / `size` 而非自定义。
3. **用语义色 token**：`bg-primary`、`text-muted-foreground`、`bg-background`…… 禁止裸色 `bg-blue-500`、禁止手写 `dark:` 颜色覆盖。
4. **间距用 `gap-*`**（`flex` 配 `gap`），不用 `space-x/space-y`。
5. **等宽等高用 `size-*`**：`size-10` 而非 `w-10 h-10`。
6. **条件类名用 `cn()`**，不要手写字符串三元。
7. **图标在 Button 等组件内不加尺寸类**，统一通过组件自身 CSS 控制。

### 4.4 改组件：永远走 CLI，绝不手抓 GitHub 原文件

- 安装/重装：`npx shadcn@latest add <component>`（用 `--overwrite` 覆盖既有文件）。
- 改前先看 diff：`npx shadcn@latest add <component> --diff <file>`，只 `--dry-run` 预览影响范围。
- 看文档：`npx shadcn@latest docs <component>` 取官方文档/示例 URL。
- **不要从 GitHub 手动复制组件源码**——以 CLI 落地的版本为准（文档站 demo 的截图可能与落地源码外观有差异，以源码为准）。

> 历史教训：`resizable.tsx` 曾被手改成「加粗短线」(`h-8 w-1 rounded-full`)、并把方向覆盖写反（基于 `aria-orientation=vertical` 而官方是 `horizontal`），导致 handle 显示成横线。最终用 `npx shadcn@latest add resizable --overwrite` 还原官方默认（小方块 grip + `GripVerticalIcon`），并由调用处 `<ResizableHandle withHandle />` 决定是否显示 grip。

---

## 5. 开发流程

```bash
npm run dev        # 仅前端(Vite, :1420)
npm run build      # tsc 类型检查 + vite build
npm run tauri dev  # 桌面应用开发模式(会自动起前端)
npm run tauri build# 打包发行版
```

- Tauri 开发固定端口 `1420`（`strictPort: true`）。
- Vite 配置已忽略监听 `src-tauri/**`；改 Rust 代码后 `tauri dev` 会自动重编译。
- 类型检查是构建的一部分（`tsc && vite build`）——保持零 TS 错误。

### 数据流速记

- 前端 → `lib/ocr.ts` 的 `parseDocument()` → `invoke("parse_document", {...})` → Rust `commands.rs::parse_document` → `ocr_client.rs` 走 PaddleOCR async API（submit→poll→fetch JSONL，multipart 上传，bearer 鉴权）→ 返回 `{ markdown, page_count }`。
- 设置：前端 `lib/store.ts` → `invoke` 各命令 → store 插件（token 不直接常驻渲染层）。
- 持久化：SQLite，`lib/db.ts` 首次加载时建表，`PRAGMA foreign_keys = ON`，`session` 删除会级联删 `batches`。

---

## 6. 已知 API 陷阱

- **`react-resizable-panels` v4**：用 `Group` / `Panel` / `Separator`（不是 v3 的 `PanelGroup` / `PanelResizeHandle`），方向用 `orientation`（不是 `direction`），`defaultSize` 接百分比字符串（`"25%"`），separator 的方向体现在 `aria-orientation`。shadcn 的包装组件名不变（`ResizablePanelGroup` 等）。
- **Tauri `invoke` 参数**：JS 传 `camelCase`，Rust 命令参数 `snake_case`，Tauri 自动转换（如 `apiUrl` ↔ `api_url`）。
- **无边框窗口**：`decorations: false`，拖拽靠自定义 `TitleBar`；文件拖放 `dragDropEnabled: false`（走插件而非原生）。

---

## 7. 给代理的工作准则

1. 改 shadcn 组件前，先 `npx shadcn@latest add <x> --diff` 比对，倾向保留官方默认样式。
2. 新增 UI 先查已安装组件；没有的用 CLI `add`，不要手写。
3. 写类型：领域类型集中在 `src/lib/types.ts`，与 SQLite schema 对齐。
4. 调后端：前端只通过 `lib/ocr.ts` / `lib/store.ts` / `lib/db.ts` 封装调用，不要散落 `invoke`。
5. 完成改动后跑 `npm run build`（含 `tsc`）确认无类型错误。

---

> 本项目采用 [MIT 许可证](./LICENSE)。
