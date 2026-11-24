# millus Code Review

- **日期**：2026-11-24
- **版本**：`0.1.0`（工作区当前状态）
- **范围**：`src/` 全部模块、`scripts/build-bundle.ts`、`test/compiler.test.ts`、`package.json` / `tsconfig.json`
- **方式**：静态阅读。小文件逐行；`layout-solver.ts`（~3.2k 行）与 `edge-router.ts`（~2.7k 行）重点阅读主流程、Dijkstra 路由与相对定位部分
- **未覆盖**：测试未实际执行，以下问题均为代码推断，修复前建议先写复现用例

## 总评

架构分层清晰（Schema → Compiler → SceneGraph → Renderer → Web Component），零依赖思路、面向 LLM 的错误提示设计都很好。发布前需要先处理 **打包导出、XSS、路由性能、对不规范 AI 输出的鲁棒性** 四类问题。

| 级别 | 数量 | 含义 |
| --- | --- | --- |
| 🔴 P0 | 4 | 阻塞发布 / 安全 / 必现崩溃 |
| 🟠 P1 | 7 | 正确性问题，特定输入下出错 |
| 🟡 P2 | 5 | Web Component 运行时体验与资源泄漏 |
| 🔵 P3 | 6 | 代码质量与小问题 |

---

## 🔴 P0：必须修复

### P0-1 包导出配置失效

**位置**：`package.json`、`tsconfig.json`、`scripts/build-bundle.ts`

- `exports["./remark"]` → `./dist/integrations/remark-plugin.js`、`exports["./prompt"]` → `./dist/schema/ai-prompt.js`、`types` → `./dist/index.d.ts`，这些文件均不会被生成，`dist/` 下只有 `millus.bundle.js`。README 中的 `import { remarkAiIllustration } from "millus/remark"` 会直接失败。
- `tsconfig.json` 同时设置了 `noEmit: true` 与 `declaration: true`，永远不会产出 `.d.ts`。
- remark 插件与 AI prompt（纯构建期 / Node 侧代码）被打进了浏览器 bundle，增加体积。

**建议**：使用 `tsup` / `esbuild`（devDependency 即可，运行时仍零依赖）按入口分别产出 `index`、`remark`、`prompt` 的 ESM + `.d.ts`；浏览器 bundle 只包含 runtime + compiler。

### P0-2 XSS / 属性注入

**位置**：`src/runtime/svg-dom-renderer.ts`、`src/runtime/web-component.ts`、`src/integrations/remark-plugin.ts`

- 渲染器以字符串模板拼接 SVG，`escapeXml` 只覆盖了文本与 id：
  - `path` 元素的 `d` 原样插入（`svg-dom-renderer.ts:265` 的 `node.pathD`）。
  - `style.opacity`、`radius`、`polygonPoints`、`fill`、`stroke`、`strokeDasharray` 等字段直接插入属性，而校验器不校验类型，传入字符串即可闭合属性并注入任意标签/事件处理器。
- SSR 兜底 SVG 位于宿主页面的 light DOM（`<div class="ai-ill-ssr-fallback">`），不受 Shadow DOM 隔离，属于真实 XSS 面。
- Web Component 的错误信息未转义直接写入 `innerHTML`（`web-component.ts:254`、`:262`），错误内容会包含用户提供的 `type` 等字符串。
- remark 插件只把 `</script>` 替换为 `<\/script>`（`remark-plugin.ts:75`），对 `<!--`、`<script` 等场景不够稳妥。

**建议**：
1. 所有插入属性的值统一走 `escapeAttr`；数值字段在 compiler 阶段 `Number()` 强转并 `Number.isFinite` 校验。
2. `pathD` 用白名单正则（仅允许 SVG path 命令字母、数字、空白、`.,+-eE`）过滤。
3. 错误信息用 `textContent` 写入。
4. 序列化 JSON 时将所有 `<` 替换为 `\u003c`（同时处理 `\u2028` / `\u2029`）。

### P0-3 正交路由 Dijkstra 复杂度 O(V²)

**位置**：`src/compiler/edge-router.ts:1254-1263`（`findObstacleFreeOrthogonalPath`）

- 每一步都线性扫描全部 `stateCount` 寻找最小 `dist`，状态数 V = |xs| × |ys| × 2；每个障碍物、容器、已路由轨道都会向网格添加 4~8 个坐标，再加中点细分，几十个节点时 V 可达 10⁵ 量级，且 **每条边都要跑一遍**。
- 每次松弛对所有 `paddedObstacles` 调用 `polylineHitsObstacles`。
- 浏览器端触发频率高：宽度变化 > 12px、html/body 任意 class/style 变化都会整图重编译；`compileIllustration` 在发生平移后还会对所有边 **再路由一次**（`compiler/index.ts`）。

**建议**：
1. 使用二叉堆（Binary Heap）作为优先队列 → O(E log V)。
2. 网格裁剪到起终点包围盒 + 一定外扩范围。
3. 预计算网格边是否被阻挡（按行/列扫描障碍区间）。
4. 平移后直接对已有 `edges` 的点做平移，而不是重新路由。

### P0-4 非法 tone 直接抛出 TypeError

**位置**：`edge-router.ts:2312`、`svg-dom-renderer.ts`（`renderEdgeLabel`）、`layout-solver.ts` 中 `cellTone` / `fTone` / `aTone` / `mTone` / `highlightTone` 等多处

- 校验器不检查枚举值，而这些位置直接访问 `theme.colors.tones[x].main`。输入主要来自 LLM，写出 `"blue"`、`"error"`、`"red"` 这类值非常常见，会导致整图崩溃。
- `resolveNodeStyle` 中已有 `tones[tone] || tones.neutral` 回退逻辑，但没有被复用。

**建议**：抽出 `getTonePalette(theme, tone)` 统一回退到 `neutral`；同时在 `validateIllustrationSpec` 中对 `tone` / `variant` / `routing` 等枚举给出 warning 和近似建议（复用 `suggestClosestId`）。

---

## 🟠 P1：正确性

### P1-1 `normalizeLooseJson` 会改写字符串内容

**位置**：`src/schema/spec.ts:593-600`

给未加引号的 key 补引号、删除尾逗号的两个正则作用于整个输出，包括字符串内部。例如：

```js
{ label: "HTTP, retry: 3" }   // 字符串内的 ", retry:" 会被补引号，内容被破坏
{ code: "[1, 2,]" }           // 字符串内的尾逗号被删除
```

**建议**：把这两步并入前面的字符串状态机，仅在非字符串上下文中处理。

### P1-2 YAML 子集不支持「短横线与父 key 同缩进」

**位置**：`src/schema/spec.ts:846-849`

```yaml
elements:
- id: a
  type: card
```

这是很多 YAML 生成器与 LLM 的默认风格。当前 `parseNode(idx, baseIndent + 1)` 要求子节点缩进更深，导致 `elements` 静默解析为 `{}`，随后报 “Missing elements array”，提示信息具有误导性。

**建议**：值为空时，若下一行是同缩进的 `- `，按序列解析。

### P1-3 校验器漏洞

**位置**：`src/schema/spec.ts:929-1087`（`validateIllustrationSpec`）

- `knownNodeIds.size === 0` 时整段跳过 `connections` 检查，连缺失 `from` / `to` 也不会报错。
- 只检查顶层 callout 的 `target`，嵌套在 group/window 中的 callout 不检查。
- 未禁止 id 中包含 `.` 或 `@`，而后续解析依赖 `split("@")` / `split(".")`。
- 自动生成 id（如 `card_1`、`text_3`）可能与用户显式 id 冲突，导致 `anchorRegistry` 被覆盖。

**建议**：去掉 size 判断；递归检查 callout；id 正则限制为 `^[A-Za-z_][\w-]*$`；自动 id 使用保留前缀（如 `__auto_card_1`）。

### P1-4 自制打包脚本脆弱

**位置**：`scripts/build-bundle.ts`

- 去除 import 的正则中 `[\s\S]*?` 可跨行。若某个非相对 import 之后跟一个相对 import，前者会被一起吞掉。
- 所有模块拼接到同一作用域，同名的非导出函数会冲突；不支持 `export *` / 重命名导入。
- 头部注释仍写 `dist/ai-illustration.bundle.js` 与 `<m-illus>`，但 `<m-illus>` 并未注册。

**建议**：与 P0-1 一并替换为 esbuild/tsup。

### P1-5 SVG defs id 全局固定

**位置**：`src/runtime/svg-dom-renderer.ts`

`ill-marker-arrow-*`、`ill-shadow-sm/md`、`ill-glow`、`ill-bg-dots/grid`、`ill-clip-<nodeId>` 均为固定 id。SSR 兜底位于 light DOM，同页多张图时 `url(#...)` 会解析到第一张图的 defs，主题/预设不同时颜色错误；「复制 SVG」粘贴到同一文档中也会有同样问题。

**建议**：`renderSceneGraphToSvgString(scene, { idPrefix })`，由 spec 内容 hash 或实例计数生成前缀。

### P1-6 「Zero-CLS」目前无法成立

**位置**：`src/integrations/remark-plugin.ts:85-94`、`src/runtime/text-measurer.ts`

- SSR 使用启发式字宽估算，客户端使用 Canvas 实测，两边布局与高度不一致，hydrate 时仍会产生布局偏移。
- SSR 固定使用亮色主题（`resolveThemeTokens(null, ...)`），暗色模式下会先闪一下亮色。

**建议**：客户端首帧复用 SSR 的尺寸（`aspect-ratio` 或固定 viewBox 预留），或让客户端首帧使用同一估算器；SSR 颜色改为输出 CSS 变量（`var(--ill-*)`），而非解析后的 hex。

### P1-7 MDX v2+ 不兼容

**位置**：`src/integrations/remark-plugin.ts:97-100`

插件产出 `type: "html"` 的 mdast 节点，MDX v2 及以上不支持，需要产出 `mdxJsxFlowElement`。README 声称支持 MDX。

**建议**：增加 `mode: "html" | "mdx"` 选项，或根据 processor 自动切换。

---

## 🟡 P2：Web Component 运行时

### P2-1 可能永远不渲染

**位置**：`web-component.ts:170-192`、`:215-236`

`connectedCallback` 只读取一次 spec。若元素在子节点解析完成前升级（脚本在 `<head>` 中同步加载），或框架（React/Vue）后插入 `<script type="application/json">`，组件将保持空白。

**建议**：监听自身 `childList` / `characterData` 变化。

### P2-2 重渲染过于频繁

**位置**：`web-component.ts:178-189`、`theme-observer.ts:542-567`

- `responsive="scale"` 模式下也会因 resize 触发重新编译。
- 每次宽度变化 > 12px 都重编译，即使 `isCompact` 未变化。
- 每个实例都监听 html/body 任意 `class` / `style` 变化，滚动锁、弹窗等操作都会触发全量重编译（叠加 P0-3 的路由开销）。
- `disconnect()` 未取消挂起的 `requestAnimationFrame`。

**建议**：计算主题指纹（mode + 关键 CSS 变量）与 `isCompact`，仅在变化时重渲染；`scale` 模式仅依赖 CSS 缩放；断开时 `cancelAnimationFrame`。

### P2-3 全屏灯箱

**位置**：`web-component.ts:494-569`

- 每次打开都向 `window` 添加 `mousemove` / `mouseup` 监听且从不移除，造成泄漏。
- 按钮文案为「关闭 (Esc)」，但没有绑定 `keydown`。
- 任何一次重渲染（主题变化、resize）都会通过 `shadow.innerHTML` 销毁打开中的灯箱。

**建议**：用 `AbortController` 统一管理监听并在关闭时 `abort()`；绑定 Esc；灯箱挂到独立容器，不被 `render()` 覆盖。

### P2-4 `toggle-compact` 判定不一致

**位置**：`web-component.ts:280-283` vs `:480-482`

渲染时 `isCompact = responsive === "reflow" && width < 620`，按钮切换时只用 `width < 620`。在 `scale` 模式且宽度 < 620 时，首次点击计算出的 `forceCompact` 与当前状态相同，看起来「没反应」。

**建议**：抽出 `computeIsCompact()` 两处共用。

### P2-5 PNG 导出

**位置**：`web-component.ts:586-628`

- 缺少 `img.onerror`，失败时 blob URL 泄漏且无用户反馈。
- `URL.revokeObjectURL(dlUrl)` 紧跟 `a.click()`，部分浏览器会取消下载。
- 大图 × 2 后可能超出 Canvas 尺寸上限，`toBlob` 返回 `null` 时静默失败。
- SVG 中引用的外部字体在 `<img>` 中不会加载，导出字体可能与页面不一致。

**建议**：补 `onerror`；延迟 revoke；按上限自动降低倍率；失败时在按钮上提示。

---

## 🔵 P3：小问题

1. **TextMeasurer**（`text-measurer.ts`）
   - 分词正则未加 `u` 标志，emoji / 代理对会被拆成两半。
   - 超长单词（如 URL）不会强制断行，会撑破容器。
   - 每次测量都重设 `ctx.font` 且无缓存，而这是布局热路径；建议按 `(font, text)` 做 LRU 缓存。
2. **callout 定位**（`layout-solver.ts:229`）：直接 `anchorRegistry[cSpec.target!]`，若 `target` 带 `@side` 后缀则查不到，callout 静默落在 (0, 0)。应与校验器一样先 `split("@")`。
3. **compact 模式忽略显式端口**（`edge-router.ts:1667-1682`）：compact 下 `fromParsed.side` / `toParsed.side` 被完全忽略。若为有意设计，请在文档中说明。
4. **JSON Schema 过松**（`ai-prompt.ts`）：`elements.items` 仅为 `{ type: "object" }`，缺少 `canvas.width/height/layout`、`style.roughness` 等字段。建议按 `type` 写 `oneOf` 判别联合，并让 `VALID_ELEMENT_TYPES` 与 schema 同源生成。
5. **测试结构**（`test/compiler.test.ts`）
   - 所有断言为单脚本顶层 `assert`，第一个失败即中断。
   - 示例通过 `indexOf` + `new Function` 从 playground HTML 中截取，playground 改版即会失效。
   - 建议迁移到 Node 内置 `node:test`，并把示例抽到 `examples/*.json`，playground 与测试共用。
6. **命名与仓库卫生**
   - `src/index.ts`、`src/schema/spec.ts`、测试头部注释仍为旧名 `@ai-illustrate/core`。
   - `.gitignore` 未忽略 `dist/`，提交的 bundle 易与源码不同步。

---

## 👍 值得保留的设计

- 面向 LLM 自修复的校验错误信息，带编辑距离模糊 id 建议。
- 相对定位使用 Kahn 拓扑排序，并对环做了按声明顺序的降级处理。
- Sketch 风格使用 FNV-1a + Mulberry32 确定性 PRNG，渲染结果稳定、可快照测试。
- 路由代价函数中的拐弯惩罚、轨道占用与容器边框惩罚设计细致。
- 动态 viewBox 外扩，避免绕行边与标签被裁剪。

---

## 修复清单

- [ ] P0-1 用 tsup/esbuild 产出多入口 ESM + d.ts，修正 `exports`
- [ ] P0-2 属性统一转义、数值强转、`pathD` 白名单、错误信息用 `textContent`、JSON `<` → `\u003c`
- [ ] P0-3 Dijkstra 改二叉堆 + 网格裁剪；平移后不重新路由
- [ ] P0-4 `getTonePalette` 统一回退；校验器检查枚举
- [ ] P1-1 loose JSON 补引号/删尾逗号并入状态机
- [ ] P1-2 YAML 支持同缩进序列
- [ ] P1-3 校验器：connections 始终检查、递归 callout、id 字符限制、自动 id 前缀
- [ ] P1-4 替换自制打包脚本
- [ ] P1-5 SVG defs id 加实例前缀
- [ ] P1-6 SSR 与客户端尺寸/颜色对齐
- [ ] P1-7 MDX 模式输出 `mdxJsxFlowElement`
- [ ] P2-1 ~ P2-5 Web Component 生命周期、重渲染、灯箱、compact 判定、PNG 导出
- [ ] P3 TextMeasurer、callout target、Schema、测试结构、命名清理

### 建议优先补充的回归用例

1. `tone: "blue"` 的节点 / 连线 / 表格单元格不崩溃，回退为 neutral。
2. `path.d` 与 `style.opacity` 中含 `"` / `<` 时输出 SVG 不产生新元素。
3. `{ label: "a, b: c" }` 经 loose JSON 解析后字符串不变。
4. 同缩进 `elements:\n- id: a` 的 YAML 正确解析为数组。
5. 50 节点 + 80 连线规模下 `compileIllustration` 的耗时基线。
6. 同页两个不同 preset 的 SSR SVG，defs id 不冲突。
