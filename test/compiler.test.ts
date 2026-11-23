/**
 * Automated verification suite for @ai-illustrate/core compiler, layout solver,
 * sub-anchor routing, responsive reflow, theme resolver, and SVG renderer.
 */

import assert from "node:assert/strict";
import {
  compileIllustration,
  parseColorToRgb,
  resolveThemeTokens,
  renderSceneGraphToSvgString,
  remarkAiIllustration,
  type IllustrationSpec,
} from "../src/index.ts";

const sampleSpec: IllustrationSpec = {
  title: "构建期与运行时协同 AI 插画管线",
  canvas: {
    background: "dots",
    padding: 32,
  },
  elements: [
    {
      id: "mdx_source",
      type: "code-block",
      title: "blog-post.mdx",
      lang: "yaml",
      code: [
        "# 架构深度解析",
        "```illustration",
        "elements:",
        "  - id: gateway",
        "    type: card",
        "```",
      ].join("\n"),
      highlightLines: [2, 3, 4],
      style: {
        tone: "primary",
        elevation: "sm",
      },
    },
    {
      id: "runtime_group",
      type: "group",
      title: "<ai-illustration> 浏览器运行时",
      place: {
        rightOf: "mdx_source",
        gap: 56,
        align: "center",
      },
      layout: {
        type: "flex",
        direction: "column",
        gap: 16,
      },
      style: {
        tone: "primary",
        variant: "dashed",
      },
      children: [
        {
          id: "theme_observer",
          type: "card",
          icon: "sparkles",
          title: "1. ThemeObserver 主题嗅探",
          badge: "Reactive",
          body: "监听 html.dark 与宿主 CSS 变量变化",
          style: {
            tone: "info",
            variant: "soft",
          },
        },
        {
          id: "layout_engine",
          type: "card",
          icon: "layers",
          title: "2. 混合布局与正交寻路",
          body: "Canvas 真实字体测量 → 拓扑求解",
          style: {
            tone: "primary",
            variant: "soft",
          },
        },
      ],
    },
    {
      id: "token_table",
      type: "table",
      title: "运行时主题 Token 映射表",
      place: {
        rightOf: "runtime_group",
        gap: 56,
        align: "start",
      },
      headers: ["语义 Token", "宿主变量绑定"],
      rows: [
        ["primary", { text: "var(--vp-c-brand-1)", tone: "primary" }],
        ["surface", { text: "var(--vp-c-bg-soft)", tone: "success" }],
      ],
      style: {
        tone: "success",
        variant: "outlined",
      },
    },
    {
      id: "svg_dom",
      type: "card",
      icon: "cpu",
      title: "响应式 SVG DOM",
      badge: "60fps",
      body: "支持代码行联动高亮、流光粒子与 2x PNG 导出",
      place: {
        below: "token_table",
        gap: 28,
        align: "start",
      },
      style: {
        tone: "success",
        variant: "filled",
        elevation: "md",
      },
    },
    {
      id: "callout_line",
      type: "callout",
      text: "按行号 mdx_source.line_2 直接引出连线！",
      target: "mdx_source.line_2",
      side: "top",
      style: {
        tone: "warning",
      },
    },
  ],
  connections: [
    {
      id: "e1",
      from: "mdx_source.line_2@right",
      to: "theme_observer@left",
      label: "JSON Spec",
      routing: "curved",
      tone: "primary",
      animation: { type: "pulse", speed: "normal" },
    },
    {
      id: "e2",
      from: "theme_observer@right",
      to: "token_table.cell_0_1@left",
      label: "读取 ComputedStyle",
      routing: "orthogonal",
      strokeStyle: "dashed",
      tone: "info",
      animation: { type: "flow" },
    },
    {
      id: "e3",
      from: "theme_observer@bottom",
      to: "layout_engine@top",
      label: "触发重算",
      tone: "primary",
    },
    {
      id: "e4",
      from: "layout_engine@right",
      to: "svg_dom@left",
      label: "挂载 SceneGraph",
      routing: "orthogonal",
      tone: "success",
      animation: { type: "pulse", speed: "fast" },
    },
  ],
};

// 1. Test Desktop Light Compilation
const lightTheme = resolveThemeTokens(null, "clean");
const desktopScene = compileIllustration(sampleSpec, lightTheme, {
  compactViewport: false,
});

assert.ok(desktopScene.width > 600, "Desktop layout should expand horizontally");
assert.ok(
  desktopScene.anchorRegistry["mdx_source.line_2"],
  "Sub-anchor for code-block line 2 must be registered"
);
assert.ok(
  desktopScene.anchorRegistry["token_table.cell_0_1"],
  "Sub-anchor for table cell (0,1) must be registered"
);
assert.equal(desktopScene.edges.length, 4, "All 4 connections must be routed");

// 2. Test Focus Adjacency Graph
const line2Adj = desktopScene.adjacency["mdx_source.line_2"];
assert.ok(line2Adj, "Adjacency entry for mdx_source.line_2 must exist");
assert.ok(
  line2Adj.nodeIds.has("theme_observer"),
  "Hovering mdx_source.line_2 must highlight connected card theme_observer"
);
assert.ok(
  line2Adj.edgeIds.has("e1"),
  "Hovering mdx_source.line_2 must highlight edge e1"
);

// 3. Test Mobile Compact Reflow
const mobileScene = compileIllustration(sampleSpec, lightTheme, {
  compactViewport: true,
});
assert.ok(
  mobileScene.width < desktopScene.width,
  "Compact reflow must be narrower than desktop horizontal layout"
);
assert.ok(
  mobileScene.height > desktopScene.height,
  "Compact reflow must stack elements vertically"
);

// 4. Test Sketch Hand-Drawn Rendering
const sketchTheme = resolveThemeTokens(null, "sketch");
const sketchScene = compileIllustration(sampleSpec, sketchTheme);
const svgOut = renderSceneGraphToSvgString(sketchScene);
assert.ok(svgOut.startsWith("<svg"), "Must output valid SVG root");
assert.ok(svgOut.includes("animateMotion"), "Must include pulse animation");

// 5. Test Remark Plugin
const mdastTree = {
  type: "root",
  children: [
    {
      type: "code",
      lang: "illustration",
      value: JSON.stringify(sampleSpec),
    },
  ],
};
const plugin = remarkAiIllustration({ defaultPreset: "clean" });
plugin(mdastTree);
assert.equal(mdastTree.children[0].type, "html");
assert.ok(
  mdastTree.children[0].value?.includes("<ai-illustration"),
  "Remark plugin must transform code block into <ai-illustration>"
);

// 6. Test Corridor-Aware Edge Label Placement, Port Projection & Group Child Bounds
const runtimeGroupBox = desktopScene.anchorRegistry["runtime_group"];
const themeObserverBox = desktopScene.anchorRegistry["theme_observer"];
const layoutEngineBox = desktopScene.anchorRegistry["layout_engine"];
const tokenTableBox = desktopScene.anchorRegistry["token_table"];
const mdxSourceBox = desktopScene.anchorRegistry["mdx_source"];
const calloutBox = desktopScene.anchorRegistry["callout_line"];

// Group children must stay strictly inside their parent group container
assert.ok(
  themeObserverBox.x >= runtimeGroupBox.x &&
    themeObserverBox.x + themeObserverBox.width <=
      runtimeGroupBox.x + runtimeGroupBox.width,
  "Group child theme_observer must stay inside runtime_group horizontal bounds"
);
assert.ok(
  layoutEngineBox.y >= runtimeGroupBox.y &&
    layoutEngineBox.y + layoutEngineBox.height <=
      runtimeGroupBox.y + runtimeGroupBox.height,
  "Group child layout_engine must stay inside runtime_group vertical bounds"
);

// Auto-callout targeting a sub-anchor must not overlap its owner node
assert.ok(
  calloutBox.y + calloutBox.height <= mdxSourceBox.y,
  "Top callout on mdx_source.line_2 must clear mdx_source top border without overlap"
);

// Edge e2 targeting interior table cell token_table.cell_0_1@left must stop at token_table's outer left border
// and place its label strictly inside the corridor between runtime_group and token_table
const edge2 = desktopScene.edges.find((e) => e.id === "e2")!;
assert.equal(
  edge2.points[edge2.points.length - 1][0],
  tokenTableBox.x,
  "Connection to interior table cell @left must project onto table outer left border so it never strikes through col 0 text"
);
assert.ok(
  edge2.labelBox &&
    edge2.labelBox.x >= runtimeGroupBox.x + runtimeGroupBox.width &&
    edge2.labelBox.x + edge2.labelBox.width <= tokenTableBox.x,
  "Edge label must fit cleanly inside the horizontal corridor between runtime_group and token_table"
);

// Edge e3 between vertically stacked cards inside runtime_group must fit cleanly in the vertical gap
const edge3 = desktopScene.edges.find((e) => e.id === "e3")!;
assert.ok(
  edge3.labelBox &&
    edge3.labelBox.y >= themeObserverBox.y + themeObserverBox.height &&
    edge3.labelBox.y + edge3.labelBox.height <= layoutEngineBox.y,
  "Vertical edge label must fit cleanly between theme_observer and layout_engine without overlapping either card"
);

// 7. Test Explicit Label Controls (labelPosition, labelSide, labelOffset) & Terminal Line Sub-Anchors
const memorySpec: IllustrationSpec = {
  title: "Zero-Copy DMA Test",
  elements: [
    {
      id: "cli_term",
      type: "terminal",
      title: "user-space-shell",
      lines: [
        { prompt: "$", cmd: "strace -e sendfile ./http-server" },
        {
          output: "sendfile(fd_out=4, fd_in=3, NULL, 65536) = 65536",
          tone: "success",
        },
      ],
    },
    {
      id: "kernel_buf",
      type: "table",
      title: "Kernel Page Cache",
      place: { rightOf: "cli_term", gap: 52, align: "center" },
      headers: ["Offset", "Page Frame"],
      rows: [
        ["0x0000", { text: "skb_frag_t[0]", tone: "primary" }],
        ["0x4000", { text: "skb_frag_t[1]", tone: "accent" }],
      ],
    },
  ],
  connections: [
    {
      id: "syscall_edge",
      from: "cli_term.line_2@right",
      to: "kernel_buf.cell_0_1@left",
      label: "系统调用陷入内核",
      labelPosition: "center",
      labelSide: "top",
      labelOffset: [0, -2],
      routing: "curved",
      tone: "primary",
    },
  ],
};

const memoryScene = compileIllustration(memorySpec, lightTheme);
assert.ok(
  memoryScene.anchorRegistry["cli_term.line_2"],
  "Terminal line sub-anchor cli_term.line_2 must be registered"
);
const syscallEdge = memoryScene.edges[0];
const cliBox = memoryScene.anchorRegistry["cli_term"];
const kbufBox = memoryScene.anchorRegistry["kernel_buf"];
assert.ok(
  syscallEdge.labelBox &&
    syscallEdge.labelBox.x > cliBox.x + cliBox.width &&
    syscallEdge.labelBox.x + syscallEdge.labelBox.width < kbufBox.x,
  "Syscall edge label must sit strictly inside the corridor between cli_term and kernel_buf"
);

// 8. Test P0: Symmetric Fan-Out, Sibling AABB Anti-Overlap & Port Multiplexing
const fanOutSpec: IllustrationSpec = {
  title: "Fan-Out & Port Multiplexing Test",
  elements: [
    { id: "gw", type: "card", title: "API Gateway", body: "Ingress Router" },
    {
      id: "svc_a",
      type: "card",
      title: "Auth Service",
      place: { rightOf: "gw" },
    },
    {
      id: "svc_b",
      type: "card",
      title: "Order Service",
      place: { rightOf: "gw" },
    },
    {
      id: "svc_c",
      type: "card",
      title: "Billing Service",
      place: { rightOf: "gw" },
    },
  ],
  connections: [
    { id: "f1", from: "gw@right", to: "svc_a@left", label: "RPC 1" },
    { id: "f2", from: "gw@right", to: "svc_b@left", label: "RPC 2" },
    { id: "f3", from: "gw@right", to: "svc_c@left", label: "RPC 3" },
  ],
};

const fanScene = compileIllustration(fanOutSpec, lightTheme);
const svcABox = fanScene.anchorRegistry["svc_a"];
const svcBBox = fanScene.anchorRegistry["svc_b"];
const svcCBox = fanScene.anchorRegistry["svc_c"];

assert.ok(
  svcABox.y + svcABox.height + 20 <= svcBBox.y &&
    svcBBox.y + svcBBox.height + 20 <= svcCBox.y,
  "Multiple nodes with rightOf: 'gw' must automatically fan out vertically without overlapping"
);

const [fe1, fe2, fe3] = fanScene.edges;
assert.ok(
  fe1.points[0][1] < fe2.points[0][1] && fe2.points[0][1] < fe3.points[0][1],
  "Port multiplexing on gw@right must distribute start Y coordinates in ascending target order"
);

// 9. Test P0: Hanan-Grid Obstacle-Avoiding Orthogonal Routing, Self-Loop & ViewBox Envelope
const obstacleSpec: IllustrationSpec = {
  title: "Obstacle Detour & Self-Loop Test",
  elements: [
    { id: "n1", type: "rect", label: "Node 1" },
    { id: "n2", type: "rect", label: "Blocker Node 2", place: { rightOf: "n1", gap: 60 } },
    { id: "n3", type: "rect", label: "Node 3", place: { rightOf: "n2", gap: 60 } },
  ],
  connections: [
    {
      id: "jump_edge",
      from: "n1@right",
      to: "n3@left",
      label: "Bypass Blocker",
      routing: "orthogonal",
    },
    {
      id: "self_edge",
      from: "n1@top",
      to: "n1@left",
      label: "Self Retry",
      routing: "orthogonal",
    },
  ],
};

const obsScene = compileIllustration(obstacleSpec, lightTheme);
const blockerBox = obsScene.anchorRegistry["n2"];
const jumpEdge = obsScene.edges.find((e) => e.id === "jump_edge")!;
const selfEdge = obsScene.edges.find((e) => e.id === "self_edge")!;

// Verify jump_edge does not pass through blockerBox
for (let i = 0; i < jumpEdge.points.length - 1; i++) {
  const [ax, ay] = jumpEdge.points[i];
  const [bx, by] = jumpEdge.points[i + 1];
  const segMinX = Math.min(ax, bx);
  const segMaxX = Math.max(ax, bx);
  const segMinY = Math.min(ay, by);
  const segMaxY = Math.max(ay, by);
  const hitsHoriz =
    Math.abs(ay - by) < 0.5 &&
    ay > blockerBox.y &&
    ay < blockerBox.y + blockerBox.height &&
    segMaxX > blockerBox.x &&
    segMinX < blockerBox.x + blockerBox.width;
  const hitsVert =
    Math.abs(ax - bx) < 0.5 &&
    ax > blockerBox.x &&
    ax < blockerBox.x + blockerBox.width &&
    segMaxY > blockerBox.y &&
    segMinY < blockerBox.y + blockerBox.height;
  assert.ok(
    !hitsHoriz && !hitsVert,
    `Segment ${i} of jump_edge must detour around intermediate obstacle n2`
  );
}

// Verify self_edge and its label are fully enclosed within the expanded viewBox
assert.ok(selfEdge.points.length >= 4, "Self-loop must generate an external loop path");
for (const pt of selfEdge.points) {
  assert.ok(
    pt[0] >= 16 &&
      pt[1] >= 16 &&
      pt[0] <= obsScene.width - 16 &&
      pt[1] <= obsScene.height - 16,
    "ViewBox envelope must expand so self-loop waypoints are never clipped"
  );
}
if (selfEdge.labelBox) {
  assert.ok(
    selfEdge.labelBox.x >= 16 &&
      selfEdge.labelBox.y >= 16 &&
      selfEdge.labelBox.x + selfEdge.labelBox.width <= obsScene.width - 16 &&
      selfEdge.labelBox.y + selfEdge.labelBox.height <= obsScene.height - 16,
    "ViewBox envelope must expand so self-loop labelBox is never clipped"
  );
}

// 10. Test P1: Modern CSS Color Parser (hsl, oklch, CSS Color 4 rgb) & Blueprint Preset
const hslColor = parseColorToRgb("hsl(210, 100%, 50%)", { r: 0, g: 0, b: 0 });
assert.equal(hslColor.r, 0);
assert.ok(Math.abs(hslColor.g - 128) <= 1);
assert.equal(hslColor.b, 255);

const oklchColor = parseColorToRgb("oklch(0.62 0.19 250)", { r: 0, g: 0, b: 0 });
assert.ok(
  oklchColor.b > oklchColor.r && oklchColor.b > 180,
  "oklch(0.62 0.19 250) must resolve to a bright blue RGB tuple"
);

const spaceRgb = parseColorToRgb("rgb(16 185 129 / 0.8)", { r: 0, g: 0, b: 0 });
assert.deepEqual(spaceRgb, { r: 16, g: 185, b: 129 });

const blueprintTheme = resolveThemeTokens(null, "blueprint");
assert.equal(blueprintTheme.geometry.preset, "blueprint");
assert.equal(blueprintTheme.geometry.baseRadius, 3);

// 11. Test P1: Sketch Edge Companion Path, Code-Block Syntax Highlighting & New Technical Primitives
assert.ok(
  svgOut.includes("ai-ill-edge-rough"),
  "Sketch preset must render hand-drawn companion paths on connection edges"
);
assert.ok(
  svgOut.includes("<tspan"),
  "Code-block must render syntax-highlighted <tspan> tokens"
);

const p1PrimitivesSpec: IllustrationSpec = {
  title: "P1 Technical Primitives Test",
  style: { preset: "blueprint" },
  elements: [
    {
      id: "pkt_hdr",
      type: "bitfield",
      title: "Packet Frame",
      totalBits: 32,
      fields: [
        { name: "Magic", bits: 16, value: "0xCAFE", tone: "primary" },
        { name: "Len", bits: 16, value: "1024", tone: "accent" },
      ],
    },
    {
      id: "msg_queue",
      type: "queue",
      label: "Event Queue",
      sublabel: "RingBuffer",
      place: { below: "pkt_hdr", gap: 40 },
    },
    {
      id: "db_store",
      type: "cylinder",
      label: "RocksDB",
      sublabel: "SSTable",
      place: { rightOf: "msg_queue", gap: 56 },
    },
    {
      id: "rpc_seq",
      type: "sequence",
      title: "Replication Sequence",
      place: { rightOf: "pkt_hdr", gap: 56 },
      actors: [
        { id: "client", label: "Client", tone: "primary" },
        { id: "server", label: "Server", tone: "success" },
      ],
      messages: [
        { from: "client", to: "server", label: "WriteBatch", type: "sync" },
        { from: "server", to: "client", label: "Ack", type: "reply" },
      ],
    },
  ],
  connections: [
    { from: "pkt_hdr.field_1@bottom", to: "msg_queue@top", label: "Enqueue" },
    { from: "msg_queue@right", to: "db_store@left", label: "Flush" },
    { from: "pkt_hdr@right", to: "rpc_seq.client@left", label: "Trigger" },
  ],
};

const p1Scene = compileIllustration(p1PrimitivesSpec, blueprintTheme);
assert.ok(
  p1Scene.anchorRegistry["pkt_hdr.field_1"],
  "Bitfield segment sub-anchor pkt_hdr.field_1 must be registered"
);
assert.ok(
  p1Scene.anchorRegistry["rpc_seq.client"] &&
    p1Scene.anchorRegistry["rpc_seq.msg_1"],
  "Sequence actor and message sub-anchors must be registered"
);
const p1Svg = renderSceneGraphToSvgString(p1Scene);
assert.ok(p1Svg.includes("RocksDB") && p1Svg.includes("0xCAFE"));

console.log("✅ All compiler, layout, sub-anchor, reflow, sketch, remark, P0, and P1 tests passed!");
