<p align="center">
  <img src="./assets/logo.svg" alt="millus logo" width="140" />
</p>

<h1 align="center">millus</h1>

<p align="center">
  AI 驱动、主题响应式的技术插画框架与 Web Component 运行时，专为 Markdown / MDX 技术博客打造。
</p>

<p align="center">
  <a href="#核心特性">核心特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#支持的图元与语法">支持的图元与语法</a> •
  <a href="#remark--mdx-集成">Remark / MDX 集成</a> •
  <a href="#ai-prompt-与-schema">AI Prompt 与 Schema</a> •
  <a href="#开发与构建">开发与构建</a>
</p>

---

**millus** 让 AI（或开发者）通过结构化的 `IllustrationSpec`（JSON / YAML）描述技术架构、协议时序、内存位域、代码注解与数据流，由编译器自动完成布局求解与正交/曲线路由，并在浏览器端通过 `<ai-illustration>` Web Component 自适应宿主博客的明暗主题与视口宽度。

## 核心特性

- **语义化声明式 Schema**：告别手写原生 SVG 与像素级坐标计算，使用语义色板（`primary`、`secondary`、`accent`、`success`、`warning`、`danger`、`info`、`neutral`）与表面变体（`soft`、`filled`、`outlined`、`dashed`、`ghost`）。
- **自动布局与智能路由**：支持 `flex` / `grid` / `free` 容器布局及相对定位（`rightOf` / `leftOf` / `below` / `above`）；支持 `orthogonal` / `curved` / `straight` 边路由、百分比端口（如 `nodeA@right:30%`）以及数据流动画（`flow` / `pulse` / `bidirectional`）。
- **子锚点级连线（Sub-Anchor）**：可直接从代码块特定行（`code1.line_2@right`）、表格单元格（`tbl.cell_1_0`）、位域字段（`pkt.field_0`）或终端输出行发起连线与标注。
- **零依赖主题自适应**：内置 `ThemeObserver`，自动感知宿主页面 CSS 变量变化，无缝适配自定义博客、VitePress、Astro Starlight、Docusaurus 与 Tailwind 主题。
- **交互式 Web Component**：`<ai-illustration>` 内置响应式重排（`reflow` / `scale`）、悬停焦点高亮与悬浮工具栏（支持 `clean` / `sketch` / `blueprint` 预设切换、全屏灯箱缩放拖拽及 2x HiDPI PNG 导出）。
- **SSG 预渲染与 Zero-CLS**：提供 `remarkAiIllustration` 插件，构建期将 ```` ```illustration ```` 代码块编译为 `<ai-illustration>` 并内联静态 SVG 兜底，兼顾零布局偏移（Zero-CLS）、SEO 与 RSS 阅读器。

## 快速开始

### 1. 在浏览器中直接使用 `<ai-illustration>`

构建产物 `dist/millus.bundle.js` 会自动注册 `<ai-illustration>` 自定义元素：

```html
<script type="module" src="./dist/millus.bundle.js"></script>

<ai-illustration preset="clean" responsive="reflow">
  <script type="application/json">
    {
      "title": "Request Pipeline",
      "elements": [
        { "id": "client", "type": "card", "title": "Client", "icon": "globe", "style": { "tone": "primary", "variant": "soft" } },
        { "id": "api", "type": "card", "title": "API Gateway", "icon": "server", "place": { "rightOf": "client", "gap": 64, "align": "center" }, "style": { "tone": "accent", "variant": "soft" } },
        { "id": "db", "type": "cylinder", "label": "PostgreSQL", "place": { "rightOf": "api", "gap": 64, "align": "center" }, "style": { "tone": "success", "variant": "soft" } }
      ],
      "connections": [
        { "from": "client@right", "to": "api@left", "label": "HTTPS", "routing": "orthogonal", "animation": { "type": "flow" } },
        { "from": "api@right", "to": "db@left", "label": "SQL", "routing": "orthogonal" }
      ]
    }
  </script>
</ai-illustration>
```

也可以直接在项目根目录构建后打开 [playground/index.html](./playground/index.html) 体验交互式示例与多主题预览。

### 2. Remark / MDX 集成

使用 `millus/remark` 导出 `remarkAiIllustration`，在 Markdown / MDX 构建流程中自动转换 ```` ```illustration ```` 或 ```` ```ai-illustration ```` 代码块：

```ts
import { remarkAiIllustration } from "millus/remark";

// 在 unified / remark / Astro / MDX 配置中使用
export default {
  remarkPlugins: [
    [
      remarkAiIllustration,
      {
        defaultPreset: "clean", // "clean" | "sketch" | "blueprint"
        responsive: "reflow",   // "reflow" | "scale"
        prerenderSvg: true      // 构建期预渲染静态 SVG 兜底
      }
    ]
  ]
};
```

## 支持的图元与语法

| 类别 | 图元类型 (`type`) | 说明 |
| --- | --- | --- |
| 基础几何 | `rect`, `diamond`, `circle`, `ellipse`, `polygon`, `path`, `text`, `icon` | 支持语义样式、圆角与内置图标 |
| 容器与结构 | `group`, `window`, `card` | 支持 `flex` / `grid` 子元素自动排布 |
| 工程与系统 | `code-block`, `terminal`, `table`, `bitfield`, `sequence`, `cylinder`, `queue`, `callout` | 支持代码行高亮、位域图、时序图、存储柱与悬浮标注 |

`<ai-illustration>` 支持的 HTML 属性：
- `preset`：渲染风格预设，可选 `clean`、`sketch`（手绘风格）、`blueprint`（蓝图风格）
- `responsive`：视口适配模式，可选 `reflow`（窄屏自动重排）或 `scale`（等比缩放）
- `toolbar`：控制悬浮工具栏显示
- `spec`：直接传入序列化后的 `IllustrationSpec` 字符串（也可通过内部 `<script type="application/json">` 传入）

## AI Prompt 与 Schema

项目内置了面向大语言模型的系统提示词与 JSON Schema，方便集成到 AI 写作或 Agent 工作流中：

```ts
import {
  AI_ILLUSTRATION_SYSTEM_PROMPT,
  getIllustrationJsonSchema
} from "millus/prompt";
```

## 项目结构

```text
millus/
├── assets/
│   └── logo.svg                 # 项目矢量 Logo
├── src/
│   ├── schema/
│   │   ├── spec.ts              # IllustrationSpec & SceneGraph 类型定义与校验/解析
│   │   └── ai-prompt.ts         # AI System Prompt 与 JSON Schema 生成器
│   ├── compiler/
│   │   ├── index.ts             # 主编译管线（Spec -> SceneGraph）
│   │   ├── layout-solver.ts     # Flex/Grid/相对定位布局求解器
│   │   ├── edge-router.ts       # 正交/曲线/直线路由器与标签避让
│   │   └── adjacency-builder.ts # 图邻接关系与响应式重排构建
│   ├── runtime/
│   │   ├── web-component.ts     # <ai-illustration> Web Component 与工具栏
│   │   ├── theme-observer.ts    # 宿主 CSS 变量解析与暗黑/自定义主题监听
│   │   ├── svg-dom-renderer.ts  # SceneGraph -> SVG 字符串渲染器
│   │   ├── rough-adapter.ts     # Sketch 手绘风格路径适配器
│   │   └── text-measurer.ts     # 文本尺寸测量器
│   ├── integrations/
│   │   └── remark-plugin.ts     # Remark / MDX 构建期插件
│   └── index.ts                 # 主入口
├── playground/
│   └── index.html               # 交互式 Playground
├── scripts/
│   └── build-bundle.ts          # 零依赖 ESM/浏览器单文件打包脚本
└── test/
    └── compiler.test.ts         # 编译器与集成测试
```

## 开发与构建

需要 Node.js 22+（使用原生 `--experimental-strip-types` 直接运行 TypeScript）：

```bash
# 运行完整测试套件
npm test

# 构建单文件浏览器/ESM 产物 (dist/millus.bundle.js)
npm run build
```

## License

[MIT](./package.json)
