# PaddleReader 开发文档

一个基于 PaddleOCR API 的桌面应用，使用 Tauri 技术栈构建。

## 布局设计

类似于很多 AI Chat 应用，左边侧边栏 + 右边内容区的布局。

### 侧边栏

左边侧边栏完成会话管理（创建，删除，编辑）。

- **创建**：创建会话
- **删除**：删除会话（级联删除关联的批和附件）
- **编辑**：编辑会话名称

没有会话时，自动创建一个会话，每次打开应用默认进入最新会话。

### 内容区

右边内容区分为两栏，左侧附件栏，右侧文本栏。

- 附件栏支持多次上传不断追加，相应的右侧文本栏也会不断追加文本
- 不是同一次上传的附件之间有分割线形成视觉分割，相应的文本也会分割
- 左侧附件栏最底部是一个表单，用户可以拖拽或点击选择图片、pdf 完成上传
- 上传并得到解析结果时，显示进度

## 数据流

```
前端 → lib/ocr.ts 的 parseDocument()
     → invoke("parse_document", {...})
     → Rust commands.rs::parse_document
     → ocr_client.rs PaddleOCR async API
        (submit → poll → fetch JSONL)
        multipart 上传，bearer 鉴权
     → 返回 { markdown, page_count }
```

设置读写：`lib/store.ts` → `invoke` 各命令 → store 插件（token 不直接常驻渲染层）。

持久化：SQLite，`lib/db.ts` 首次加载时建表，`PRAGMA foreign_keys = ON`，删除 session 会级联删 batches。

## 目录结构

```
src/
  App.tsx                    # 根：TitleBar + 视图切换(workspace|settings) + Provider
  main.tsx                   # React 入口
  globals.css                # Tailwind 入口 + 全部 @theme 颜色变量(明/暗)
  components/
    layout/TitleBar.tsx
    sidebar/                 # 会话列表、侧栏
    settings/SettingsPage.tsx
    workspace/
      Workspace.tsx          # 左右分栏(Resizable)：附件面板 | 文本面板
      attachments/           # 上传、批量组、剪贴板粘贴、行项
      text/                  # 文本面板、Markdown 渲染块
    ui/                      # shadcn 组件
  state/SessionContext.tsx   # 会话/批次/附件的 Context + 业务逻辑
  hooks/
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

## 数据模型

`Session 1—N Batch 1—N Attachment`。`Attachment.file_type`：`0=pdf, 1=image`。`status`：`pending|uploading|parsing|done|error`。

## shadcn/ui 使用规范

### 配置（`components.json`）

- `style: new-york`，`base: radix`，`tailwind: v4`，`rsc: false`
- 别名：`@/components`、`@/components/ui`、`@/lib/utils`、`@/hooks`
- 图标库：`lucide`
- 全局 CSS：`src/globals.css`

### 已安装组件

`badge` `button` `card` `dialog` `dropdown-menu` `input` `label` `resizable` `scroll-area` `separator` `skeleton` `sonner` `toggle` `toggle-group` `tooltip`

### 原则

1. 优先用现有组件，不要手写带样式的 div 替代
2. className 只管布局，不要覆盖组件的颜色/字号/字重等视觉。用内置 variant/size
3. 用语义色 token：bg-primary、text-muted-foreground、bg-background 等，禁止裸色 bg-blue-500
4. 间距用 gap-*（flex 配 gap），不用 space-x/space-y
5. 等宽等高用 size-*：size-10 而非 w-10 h-10
6. 条件类名用 cn()，不要手写字符串三元
7. 图标在 Button 等组件内不加尺寸类

## 已知 API 陷阱

- **react-resizable-panels v4**：用 Group / Panel / Separator（不是 v3 的 PanelGroup / PanelResizeHandle），方向用 orientation（不是 direction），defaultSize 接百分比字符串（"25%"），separator 的方向体现在 aria-orientation
- **Tauri invoke 参数**：JS 传 camelCase，Rust 命令参数 snake_case，Tauri 自动转换（如 apiUrl ↔ api_url）
- **无边框窗口**：decorations: false，拖拽靠自定义 TitleBar；文件拖放 dragDropEnabled: false（走插件而非原生）
