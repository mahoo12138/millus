/**
 * Automated verification suite for @ai-illustrate/core compiler, layout solver,
 * sub-anchor routing, responsive reflow, theme resolver, and SVG renderer.
 */

import assert from "node:assert/strict";
import {
  compileIllustration,
  parseColorToRgb,
  parseIllustrationSpecText,
  validateIllustrationSpec,
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

// 12. Test P2: Loose JSON Recovery, Built-in YAML Subset Parser, Semantic Fuzzy Validator & Remark SSG SVG
const looseJsonSpecText = `
\`\`\`illustration
{
  // LLM comment and unquoted keys with trailing commas
  title: 'Loose JSON Test',
  elements: [
    { id: 'api_node', type: 'card', title: 'API Gateway', },
    { id: 'db_node', type: 'cylinder', label: 'Postgres', place: { rightOf: 'api_node', gap: 48, }, },
  ],
  connections: [
    { from: 'api_node@right', to: 'db_node@left', label: 'SQL Query', },
  ],
}
\`\`\`
`;
const parsedLoose = parseIllustrationSpecText(looseJsonSpecText);
const checkLoose = validateIllustrationSpec(parsedLoose);
assert.ok(checkLoose.valid, "Loose JSON with comments, single quotes, unquoted keys, and trailing commas must parse and validate");

const yamlSpecText = `
title: YAML Native Pipeline
canvas:
  background: grid
  padding: 32
elements:
  - id: producer_code
    type: code-block
    title: producer.rs
    highlightLines: [1, 2]
    code: |
      fn send_batch() {
        ring.push(0x42);
      }
  - id: ring_q
    type: queue
    label: Ring Queue
    place:
      rightOf: producer_code
      gap: 64
connections:
  - from: producer_code.line_2@right
    to: ring_q@left
    label: Zero-Copy Push
`;
const parsedYaml = parseIllustrationSpecText(yamlSpecText);
const checkYaml = validateIllustrationSpec(parsedYaml);
assert.ok(checkYaml.valid && checkYaml.spec, "Built-in YAML parser must parse nested objects, sequences, inline arrays, and block scalars");
const yamlScene = compileIllustration(checkYaml.spec!, lightTheme);
assert.equal(yamlScene.nodes.length, 2);
assert.equal(yamlScene.edges.length, 1);

// Fuzzy ID suggestion on typo in connection endpoint and place reference
const typoCheck = validateIllustrationSpec({
  elements: [
    { id: "auth_service", type: "card", title: "Auth" },
    {
      id: "order_service",
      type: "card",
      title: "Order",
      place: { rightOf: "auth_servce" },
    },
  ],
  connections: [{ from: "auth_service@right", to: "ordr_service@left" }],
});
assert.equal(typoCheck.valid, false);
assert.ok(
  typoCheck.errors.some((e) => e.includes('Did you mean "auth_service"?')),
  "Validator must suggest closest sibling ID on place typo"
);
assert.ok(
  typoCheck.errors.some((e) => e.includes('Did you mean "order_service"?')),
  "Validator must suggest closest element ID on connection endpoint typo"
);

// Remark plugin with YAML input and SSG pre-rendered inline SVG fallback
const yamlMdast = {
  type: "root",
  children: [
    {
      type: "code",
      lang: "illustration",
      value: yamlSpecText,
    },
  ],
};
const ssrPlugin = remarkAiIllustration({ defaultPreset: "clean" });
ssrPlugin(yamlMdast);
assert.equal(yamlMdast.children[0].type, "html");
assert.ok(
  yamlMdast.children[0].value?.includes("ai-ill-ssr-fallback") &&
    yamlMdast.children[0].value?.includes("<svg"),
  "Remark plugin must parse YAML natively and pre-render static SSG SVG fallback"
);

// 13. Test Boundary & Edge Cases: Sequence Rightmost Actor Self-Call, Long Table/Bitfield Titles, ClipPath & Callout Leader
const edgeCaseSpec: IllustrationSpec = {
  title: "Boundary & Edge Case Verification",
  elements: [
    {
      id: "narrow_table",
      type: "table",
      title: "Very Long Table Header Title That Exceeds Narrow Column Cells",
      headers: ["ID", "Val"],
      rows: [["1", "A"]],
    },
    {
      id: "seq_card",
      type: "sequence",
      title: "Quorum 多数派复制时序",
      place: { rightOf: "narrow_table", gap: 60 },
      actors: [
        { id: "leader", label: "Leader", sublabel: "node-1", tone: "primary" },
        { id: "follower", label: "Follower", sublabel: "node-2", tone: "accent" },
      ],
      messages: [
        { from: "leader", to: "follower", label: "AppendEntries(term=14)", type: "sync" },
        { from: "follower", to: "follower", label: "落盘 CRC32 校验", tone: "warning" },
        { from: "follower", to: "leader", label: "AppendOK(matchIdx=902)", type: "reply" },
      ],
    },
  ],
};

const edgeCaseScene = compileIllustration(edgeCaseSpec, lightTheme);
const narrowTableNode = edgeCaseScene.nodes.find((n) => n.id === "narrow_table")!;
assert.ok(
  narrowTableNode.width >= 350,
  "Table with long title must expand column widths so title never overflows table right border"
);

const seqCardNode = edgeCaseScene.nodes.find((n) => n.id === "seq_card")!;
for (const dec of seqCardNode.decorations) {
  if (dec.kind === "line") {
    assert.ok(
      dec.x >= 0 &&
        dec.x <= seqCardNode.width &&
        (dec.x2 ?? dec.x) >= 0 &&
        (dec.x2 ?? dec.x) <= seqCardNode.width,
      "All sequence diagram lines must stay inside sequence node width"
    );
  }
  if (dec.kind === "path") {
    assert.ok(
      dec.markerEnd?.startsWith("arrow-"),
      "Sequence self-call loop path must use a sharp SVG marker-end arrowhead"
    );
  }
  if (dec.kind === "text" && dec.text === "落盘 CRC32 校验") {
    assert.equal(
      dec.textAnchor,
      "end",
      "Self-call on rightmost actor must face inward with textAnchor='end' so it never overflows right border"
    );
    assert.ok(
      dec.x > 100 && dec.x < seqCardNode.width - 40,
      "Self-call label must sit cleanly inside the central timeline corridor"
    );
  }
}

// Verify bitfield cells fill 100% of container width edge-to-edge (rx=0, last cell right === node.width)
const pktHdrNode = p1Scene.nodes.find((n) => n.id === "pkt_hdr")!;
const pktCells = pktHdrNode.decorations.filter((d) => d.kind === "table-cell");
assert.equal(pktCells[0].x, 0, "First bitfield cell must start flush at x=0");
assert.equal(
  pktCells[pktCells.length - 1].x + (pktCells[pktCells.length - 1].width || 0),
  pktHdrNode.width,
  "Last bitfield cell must fill flush to the right border of bitfield container"
);

const edgeCaseSvg = renderSceneGraphToSvgString(edgeCaseScene);
assert.ok(
  edgeCaseSvg.includes('clip-path="url(#ill-clip-seq_card)"'),
  "Compound rounded nodes must clip internal decorations to prevent corner bleed"
);

const desktopSvg = renderSceneGraphToSvgString(desktopScene);
assert.ok(
  desktopSvg.includes('class="ai-ill-callout-link"') &&
    desktopSvg.includes("<path d=\"M "),
  "Callout targeting an interior code line must route an orthogonal leader path around the left margin"
);
const note1Node = desktopScene.nodes.find((n) => n.id === "callout_line")!;
const calloutPathMatch = desktopSvg.match(
  /<g class="ai-ill-callout-link"[^>]*>\s*<path d="M ([0-9.]+) ([0-9.]+)/
);
assert.ok(calloutPathMatch, "Callout link path start coordinates must be present");
const calloutStartX = parseFloat(calloutPathMatch![1]);
const calloutStartY = parseFloat(calloutPathMatch![2]);
assert.ok(
  calloutStartX >= note1Node.x + (note1Node.style.radius || 8) &&
    calloutStartX <=
      note1Node.x + note1Node.width - (note1Node.style.radius || 8) &&
    Math.abs(calloutStartY - (note1Node.y + note1Node.height)) < 0.5,
  "Callout leader path must start directly on the callout box's flat bottom border, never floating outside its left corner"
);

// 14. Test Unified Arrow, Line & Junction Geometry Standard
assert.ok(
  edgeCaseSvg.includes('refX="2.5"') &&
    edgeCaseSvg.includes('markerUnits="userSpaceOnUse"') &&
    edgeCaseSvg.includes("M 0 5 L 3.2 5"),
  "Arrow marker must use userSpaceOnUse, refX=2.5 at base, and include a solid neck collar for dashed/solid line seams"
);

// Verify edge shaft pullback: logical edge.points ends at exact target port p2, while pathD pulls back by 7px
const sampleArrowEdge = yamlScene.edges[0];
const targetEndPt = sampleArrowEdge.points[sampleArrowEdge.points.length - 1];
assert.ok(
  !sampleArrowEdge.pathD.endsWith(`${targetEndPt[0].toFixed(1)} ${targetEndPt[1].toFixed(1)}`),
  "Arrow edge pathD must pull back its shaft endpoint by 7px so the shaft stops at the arrowhead base while the tip lands on the border"
);

// Verify sequence diagram junction z-order: start circle dot comes immediately AFTER the message line/path so it caps the lifeline T-junction
const seqMsgLineIdx = seqCardNode.decorations.findIndex(
  (d) => d.kind === "line" && d.markerEnd?.startsWith("arrow-")
);
assert.ok(seqMsgLineIdx >= 0, "Sequence node must contain arrow message line");
assert.equal(
  seqCardNode.decorations[seqMsgLineIdx + 1]?.kind,
  "circle",
  "Sequence start activation dot must render after the message line to cleanly cap the lifeline junction"
);

// 15. Verify all 9 Playground Examples (including the 5 complex architecture & algorithm demos) compile cleanly with zero validation or missing-edge drops
import fs from "node:fs";
const playgroundHtml = fs.readFileSync(
  new URL("../playground/index.html", import.meta.url),
  "utf8"
);
const exStart = playgroundHtml.indexOf("const EXAMPLES = {");
const exEnd = playgroundHtml.indexOf("const illEl = document.getElementById");
const exObjCode = playgroundHtml.slice(
  exStart + "const EXAMPLES = ".length,
  playgroundHtml.lastIndexOf("};", exEnd) + 1
);
const playgroundExamples = new Function(`return (${exObjCode})`)() as Record<
  string,
  IllustrationSpec
>;
assert.equal(
  Object.keys(playgroundExamples).length,
  9,
  "Playground must contain all 9 showcase examples"
);
for (const [exKey, exSpec] of Object.entries(playgroundExamples)) {
  const check = validateIllustrationSpec(exSpec);
  assert.ok(check.valid, `Playground example "${exKey}" must pass validation`);
  for (const compactMode of [false, true]) {
    const exScene = compileIllustration(check.spec!, lightTheme, {
      compactViewport: compactMode,
    });
    assert.equal(
      exScene.edges.length,
      (exSpec.connections || []).length,
      `Playground example "${exKey}" (compact=${compactMode}) must route 100% of its connections without dropping any sub-anchor`
    );
  }
}

// Verify Demo 6 (browser_url) compact vertical mode separates the two branches below net_seq cleanly
const browserCompactScene = compileIllustration(
  playgroundExamples["browser_url"],
  lightTheme,
  { compactViewport: true }
);
const bDiskCache = browserCompactScene.nodes.find((n) => n.id === "disk_cache")!;
const bRendererWin = browserCompactScene.nodes.find(
  (n) => n.id === "renderer_win"
)!;
assert.ok(
  bDiskCache.x + bDiskCache.width < bRendererWin.x,
  "In compact vertical mode, disk_cache and renderer_win branches below net_seq must fan out side-by-side without vertical occlusion"
);
const bEdge1 = browserCompactScene.edges[0];
const bEdge2 = browserCompactScene.edges[1];
assert.ok(
  Math.abs(bEdge1.points[0][0] - bEdge2.points[0][0]) >= 40,
  "Same-side sub-anchor and parent ports exiting net_seq@bottom must be separated by at least 40px"
);

// Verify Demo 7 (leetcode_hard) top-most edge-labels layer and staggered parallel Z-bend labels
const lcScene = compileIllustration(
  playgroundExamples["leetcode_hard"],
  lightTheme
);
const lcSvg = renderSceneGraphToSvgString(lcScene);
assert.ok(
  lcSvg.indexOf('<g class="ai-ill-edges-layer">') > 0 &&
    lcSvg.indexOf('<g class="ai-ill-edge-labels-layer">') >
      lcSvg.indexOf('<g class="ai-ill-edges-layer">'),
  "SVG must separate all edge labels into a dedicated top-most ai-ill-edge-labels-layer above all edge paths and pulse particles"
);
const lcLb2 = lcScene.edges[1].labelBox!;
const lcLb3 = lcScene.edges[2].labelBox!;
const lcLb4 = lcScene.edges[3].labelBox!;
assert.ok(
  lcLb2.x > lcLb3.x &&
    lcLb3.x > lcLb4.x &&
    lcLb3.y >= lcLb2.y + lcLb2.height + 16 &&
    lcLb4.y >= lcLb3.y + lcLb3.height + 16,
  "Parallel Z-bend labels must stagger diagonally onto unobstructed horizontal arms with clean vertical clearance"
);

// Verify Demo 8 (android_arch) & Demo 9 (esp32_circuit) compact routing:
// 1. No collinear overlapping edge segments (track reservation)
// 2. No edge riding on top of a parent Group border (border-coincidence penalty & stub clearance)
// 3. Every edge label physically touches its own edge polyline (strict on-polyline label solver)
const androidCompact = compileIllustration(
  playgroundExamples["android_arch"],
  lightTheme,
  { compactViewport: true }
);
const appTierBox = androidCompact.nodes.find((n) => n.id === "app_tier")!;
const fwTierBox = androidCompact.nodes.find((n) => n.id === "fw_tier")!;
const relayoutEdge = androidCompact.edges.find(
  (e) => e.label === "relayoutWindow"
)!;
assert.ok(
  relayoutEdge.points[1][0] >=
    Math.max(appTierBox.x + appTierBox.width, fwTierBox.x + fwTierBox.width) +
      10,
  "android_arch compact relayoutWindow must route cleanly outside app_tier/fw_tier right borders, never overlapping the border"
);

const espCompact = compileIllustration(
  playgroundExamples["esp32_circuit"],
  lightTheme,
  { compactViewport: true }
);
const espEdge6 = espCompact.edges.find((e) => e.label === "I2S1 TTS 播报流")!;
const espEdge7 = espCompact.edges.find((e) => e.label === "80MHz SPI 帧传输")!;
const periphBox = espCompact.nodes.find((n) => n.id === "periph_modules")!;
assert.ok(
  espEdge6.labelBox &&
    espEdge6.labelBox.y + espEdge6.labelBox.height <= periphBox.y &&
    espEdge7.labelBox &&
    (espEdge7.labelBox.y + espEdge7.labelBox.height <= periphBox.y ||
      espEdge7.labelBox.y >= periphBox.y + periphBox.height),
  "esp32_circuit compact detour labels must never cover periph_modules group title bar"
);
for (const e of [espEdge6, espEdge7, relayoutEdge]) {
  const lb = e.labelBox!;
  const touches = e.points.some((pt, i) => {
    if (i === e.points.length - 1) return false;
    const nxt = e.points[i + 1];
    return (
      Math.max(pt[0], nxt[0]) >= lb.x &&
      Math.min(pt[0], nxt[0]) <= lb.x + lb.width &&
      Math.max(pt[1], nxt[1]) >= lb.y &&
      Math.min(pt[1], nxt[1]) <= lb.y + lb.height
    );
  });
  assert.ok(
    touches,
    `Edge label "${e.label}" must remain strictly anchored on its own edge polyline`
  );
}

// Verify Demo 3 (canvas) compact vertical mode does NOT stretch polygon Envoy's bounding box away from its polygonPoints
const canvasCompact = compileIllustration(
  playgroundExamples["canvas"],
  lightTheme,
  { compactViewport: true }
);
const meshWin = canvasCompact.nodes.find((n) => n.id === "mesh_cluster")!;
const envoyPoly = meshWin.children.find((c) => c.id === "envoy_proxy")!;
assert.ok(
  envoyPoly.width <= 120 && envoyPoly.polygonPoints && envoyPoly.polygonPoints.length === 6,
  "Polygon child inside a column flex window must retain its intrinsic width (never stretched out of sync with polygonPoints)"
);
const polyXs = envoyPoly.polygonPoints!.map((p) => p[0]);
const polyMidX = (Math.min(...polyXs) + Math.max(...polyXs)) / 2;
assert.ok(
  Math.abs(polyMidX - envoyPoly.width / 2) <= 2,
  "Polygon visual center must match its bounding box center so incoming/outgoing arrows anchor cleanly on the hexagon"
);

console.log("✅ All compiler, layout, sub-anchor, reflow, sketch, remark, P0, P1, P2, boundary, arrow junction standard, and 9 playground showcase tests passed!");
