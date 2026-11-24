/**
 * Automated verification suite for millus compiler, layout solver,
 * sub-anchor routing, responsive reflow, theme resolver, SVG renderer, Remark/MDX plugin,
 * security hardening, performance, and runtime utilities.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  compileIllustration,
  parseColorToRgb,
  parseIllustrationSpecText,
  normalizeLooseJson,
  validateIllustrationSpec,
  resolveThemeTokens,
  createSsrThemeTokens,
  renderSceneGraphToSvgString,
  TextMeasurer,
  ThemeObserver,
  computeSafePngExportScale,
  AiIllustrationElement,
  ELEMENT_TYPES,
  VALID_ELEMENT_TYPES,
  type IllustrationSpec,
} from "../src/index.ts";
import {
  remarkAiIllustration,
  serializeSpecForHtmlScript,
  type MdastNode,
} from "../src/integrations/remark-plugin.ts";
import {
  AI_ILLUSTRATION_SYSTEM_PROMPT,
  getIllustrationJsonSchema,
} from "../src/schema/ai-prompt.ts";

const EXAMPLES_DIR = new URL("../examples/", import.meta.url);
const EXAMPLE_KEYS = [
  "pipeline",
  "memory",
  "canvas",
  "protocol",
  "frontend_compile",
  "browser_url",
  "leetcode_hard",
  "android_arch",
  "esp32_circuit",
] as const;

function loadExampleSpec(key: string): IllustrationSpec {
  const raw = fs.readFileSync(new URL(`${key}.json`, EXAMPLES_DIR), "utf8");
  return JSON.parse(raw) as IllustrationSpec;
}

const lightTheme = resolveThemeTokens(null, "clean");

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

// ============================================================================
// Core Compiler, Layout, Routing, Reflow & Rendering Tests
// ============================================================================

describe("Core compilation, layout, adjacency, reflow & presets", () => {
  const desktopScene = compileIllustration(sampleSpec, lightTheme, {
    compactViewport: false,
  });

  it("compiles desktop layout with sub-anchors and all connections", () => {
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
  });

  it("builds bidirectional focus adjacency graph", () => {
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
  });

  it("reflows layout vertically in compact viewport mode", () => {
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
  });

  it("renders sketch preset with companion edge paths, syntax tspans, and animations", () => {
    const sketchTheme = resolveThemeTokens(null, "sketch");
    const sketchScene = compileIllustration(sampleSpec, sketchTheme);
    const svgOut = renderSceneGraphToSvgString(sketchScene);
    assert.ok(svgOut.startsWith("<svg"), "Must output valid SVG root");
    assert.ok(svgOut.includes("animateMotion"), "Must include pulse animation");
    assert.ok(
      svgOut.includes("ai-ill-edge-rough"),
      "Sketch preset must render hand-drawn companion paths on connection edges"
    );
    assert.ok(
      svgOut.includes("<tspan"),
      "Code-block must render syntax-highlighted <tspan> tokens"
    );
  });

  it("enforces group child bounds, callout clearance, port projection, and corridor labels", () => {
    const runtimeGroupBox = desktopScene.anchorRegistry["runtime_group"];
    const themeObserverBox = desktopScene.anchorRegistry["theme_observer"];
    const layoutEngineBox = desktopScene.anchorRegistry["layout_engine"];
    const tokenTableBox = desktopScene.anchorRegistry["token_table"];
    const mdxSourceBox = desktopScene.anchorRegistry["mdx_source"];
    const calloutBox = desktopScene.anchorRegistry["callout_line"];

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
    assert.ok(
      calloutBox.y + calloutBox.height <= mdxSourceBox.y,
      "Top callout on mdx_source.line_2 must clear mdx_source top border without overlap"
    );

    const edge2 = desktopScene.edges.find((e) => e.id === "e2")!;
    assert.equal(
      edge2.points[edge2.points.length - 1][0],
      tokenTableBox.x,
      "Connection to interior table cell @left must project onto table outer left border"
    );
    assert.ok(
      edge2.labelBox &&
        edge2.labelBox.x >= runtimeGroupBox.x + runtimeGroupBox.width &&
        edge2.labelBox.x + edge2.labelBox.width <= tokenTableBox.x,
      "Edge label must fit cleanly inside horizontal corridor"
    );

    const edge3 = desktopScene.edges.find((e) => e.id === "e3")!;
    assert.ok(
      edge3.labelBox &&
        edge3.labelBox.y >= themeObserverBox.y + themeObserverBox.height &&
        edge3.labelBox.y + edge3.labelBox.height <= layoutEngineBox.y,
      "Vertical edge label must fit cleanly between stacked cards"
    );

    const desktopSvg = renderSceneGraphToSvgString(desktopScene);
    assert.ok(
      desktopSvg.includes('class="ai-ill-callout-link"') &&
        desktopSvg.includes('<path d="M '),
      "Callout targeting an interior code line must route an orthogonal leader path"
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
      "Callout leader path must start directly on the callout box's flat bottom border"
    );
  });

  it("handles explicit label controls, fan-out, obstacle detours, and self-loops", () => {
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
    assert.ok(memoryScene.anchorRegistry["cli_term.line_2"]);
    const syscallEdge = memoryScene.edges[0];
    const cliBox = memoryScene.anchorRegistry["cli_term"];
    const kbufBox = memoryScene.anchorRegistry["kernel_buf"];
    assert.ok(
      syscallEdge.labelBox &&
        syscallEdge.labelBox.x > cliBox.x + cliBox.width &&
        syscallEdge.labelBox.x + syscallEdge.labelBox.width < kbufBox.x
    );

    const fanOutSpec: IllustrationSpec = {
      title: "Fan-Out & Port Multiplexing Test",
      elements: [
        { id: "gw", type: "card", title: "API Gateway", body: "Ingress Router" },
        { id: "svc_a", type: "card", title: "Auth Service", place: { rightOf: "gw" } },
        { id: "svc_b", type: "card", title: "Order Service", place: { rightOf: "gw" } },
        { id: "svc_c", type: "card", title: "Billing Service", place: { rightOf: "gw" } },
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
        svcBBox.y + svcBBox.height + 20 <= svcCBox.y
    );
    const [fe1, fe2, fe3] = fanScene.edges;
    assert.ok(fe1.points[0][1] < fe2.points[0][1] && fe2.points[0][1] < fe3.points[0][1]);

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
      assert.ok(!hitsHoriz && !hitsVert, `Segment ${i} must detour around blocker n2`);
    }

    assert.ok(selfEdge.points.length >= 4);
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
          selfEdge.labelBox.y + selfEdge.labelBox.height <= obsScene.height - 16
      );
    }
    // Verify translated pathD has no negative coordinates after viewBox shift
    const pathCoords = Array.from(selfEdge.pathD.matchAll(/-?\d+(?:\.\d+)?/g)).map((m) =>
      parseFloat(m[0])
    );
    assert.ok(
      pathCoords.every((c) => c >= 10),
      "Translated self-loop pathD coordinates must match shifted positive coordinates"
    );
  });

  it("parses modern CSS colors, blueprint preset, technical primitives, and boundary cases", () => {
    const hslColor = parseColorToRgb("hsl(210, 100%, 50%)", { r: 0, g: 0, b: 0 });
    assert.equal(hslColor.r, 0);
    assert.ok(Math.abs(hslColor.g - 128) <= 1);
    assert.equal(hslColor.b, 255);

    const oklchColor = parseColorToRgb("oklch(0.62 0.19 250)", { r: 0, g: 0, b: 0 });
    assert.ok(oklchColor.b > oklchColor.r && oklchColor.b > 180);

    const spaceRgb = parseColorToRgb("rgb(16 185 129 / 0.8)", { r: 0, g: 0, b: 0 });
    assert.deepEqual(spaceRgb, { r: 16, g: 185, b: 129 });

    const blueprintTheme = resolveThemeTokens(null, "blueprint");
    assert.equal(blueprintTheme.geometry.preset, "blueprint");
    assert.equal(blueprintTheme.geometry.baseRadius, 3);

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
    assert.ok(p1Scene.anchorRegistry["pkt_hdr.field_1"]);
    assert.ok(p1Scene.anchorRegistry["rpc_seq.client"] && p1Scene.anchorRegistry["rpc_seq.msg_1"]);
    const pktHdrNode = p1Scene.nodes.find((n) => n.id === "pkt_hdr")!;
    const pktCells = pktHdrNode.decorations.filter((d) => d.kind === "table-cell");
    assert.equal(pktCells[0].x, 0);
    assert.equal(pktCells[pktCells.length - 1].x + (pktCells[pktCells.length - 1].width || 0), pktHdrNode.width);
    const p1Svg = renderSceneGraphToSvgString(p1Scene);
    assert.ok(p1Svg.includes("RocksDB") && p1Svg.includes("0xCAFE"));

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
    assert.ok(narrowTableNode.width >= 350);
    const seqCardNode = edgeCaseScene.nodes.find((n) => n.id === "seq_card")!;
    for (const dec of seqCardNode.decorations) {
      if (dec.kind === "line") {
        assert.ok(
          dec.x >= 0 &&
            dec.x <= seqCardNode.width &&
            (dec.x2 ?? dec.x) >= 0 &&
            (dec.x2 ?? dec.x) <= seqCardNode.width
        );
      }
      if (dec.kind === "path") {
        assert.ok(dec.markerEnd?.startsWith("arrow-"));
      }
      if (dec.kind === "text" && dec.text === "落盘 CRC32 校验") {
        assert.equal(dec.textAnchor, "end");
        assert.ok(dec.x > 100 && dec.x < seqCardNode.width - 40);
      }
    }
    const seqMsgLineIdx = seqCardNode.decorations.findIndex(
      (d) => d.kind === "line" && d.markerEnd?.startsWith("arrow-")
    );
    assert.ok(seqMsgLineIdx >= 0);
    assert.equal(seqCardNode.decorations[seqMsgLineIdx + 1]?.kind, "circle");

    const edgeCaseSvg = renderSceneGraphToSvgString(edgeCaseScene, { idPrefix: "test" });
    assert.ok(edgeCaseSvg.includes('clip-path="url(#test-clip-seq_card)"'));
    assert.ok(
      edgeCaseSvg.includes('refX="2.5"') &&
        edgeCaseSvg.includes('markerUnits="userSpaceOnUse"') &&
        edgeCaseSvg.includes("M 0 5 L 3.2 5")
    );
  });
});

// ============================================================================
// Showcase Examples (loaded from shared examples/*.json)
// ============================================================================

describe("All 9 shared showcase examples (examples/*.json)", () => {
  it("validates and compiles every example in both desktop and compact modes", () => {
    assert.equal(EXAMPLE_KEYS.length, 9);
    for (const exKey of EXAMPLE_KEYS) {
      const exSpec = loadExampleSpec(exKey);
      const check = validateIllustrationSpec(exSpec);
      assert.ok(
        check.valid,
        `Example "${exKey}" must pass validation: ${check.errors.join("; ")}`
      );
      for (const compactMode of [false, true]) {
        const exScene = compileIllustration(check.spec!, lightTheme, {
          compactViewport: compactMode,
        });
        assert.equal(
          exScene.edges.length,
          (exSpec.connections || []).length,
          `Example "${exKey}" (compact=${compactMode}) must route 100% of connections`
        );
      }
    }
  });

  it("preserves geometric invariants across browser_url, leetcode_hard, android_arch, esp32_circuit, and canvas", () => {
    const browserCompactScene = compileIllustration(
      loadExampleSpec("browser_url"),
      lightTheme,
      { compactViewport: true }
    );
    const bDiskCache = browserCompactScene.nodes.find((n) => n.id === "disk_cache")!;
    const bRendererWin = browserCompactScene.nodes.find((n) => n.id === "renderer_win")!;
    assert.ok(bDiskCache.x + bDiskCache.width < bRendererWin.x);
    assert.ok(
      Math.abs(
        browserCompactScene.edges[0].points[0][0] -
          browserCompactScene.edges[1].points[0][0]
      ) >= 40
    );

    const lcScene = compileIllustration(loadExampleSpec("leetcode_hard"), lightTheme);
    const lcSvg = renderSceneGraphToSvgString(lcScene);
    assert.ok(
      lcSvg.indexOf('<g class="ai-ill-edges-layer">') > 0 &&
        lcSvg.indexOf('<g class="ai-ill-edge-labels-layer">') >
          lcSvg.indexOf('<g class="ai-ill-edges-layer">')
    );
    const lcLb2 = lcScene.edges[1].labelBox!;
    const lcLb3 = lcScene.edges[2].labelBox!;
    const lcLb4 = lcScene.edges[3].labelBox!;
    assert.ok(
      lcLb2.x > lcLb3.x &&
        lcLb3.x > lcLb4.x &&
        lcLb3.y >= lcLb2.y + lcLb2.height + 16 &&
        lcLb4.y >= lcLb3.y + lcLb3.height + 16
    );

    const androidCompact = compileIllustration(
      loadExampleSpec("android_arch"),
      lightTheme,
      { compactViewport: true }
    );
    const appTierBox = androidCompact.nodes.find((n) => n.id === "app_tier")!;
    const fwTierBox = androidCompact.nodes.find((n) => n.id === "fw_tier")!;
    const relayoutEdge = androidCompact.edges.find((e) => e.label === "relayoutWindow")!;
    assert.ok(
      relayoutEdge.points[1][0] >=
        Math.max(appTierBox.x + appTierBox.width, fwTierBox.x + fwTierBox.width) + 10
    );

    const espCompact = compileIllustration(
      loadExampleSpec("esp32_circuit"),
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
          espEdge7.labelBox.y >= periphBox.y + periphBox.height)
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
      assert.ok(touches, `Edge label "${e.label}" must stay anchored on its polyline`);
    }

    const canvasCompact = compileIllustration(loadExampleSpec("canvas"), lightTheme, {
      compactViewport: true,
    });
    const meshWin = canvasCompact.nodes.find((n) => n.id === "mesh_cluster")!;
    const envoyPoly = meshWin.children.find((c) => c.id === "envoy_proxy")!;
    assert.ok(
      envoyPoly.width <= 120 &&
        envoyPoly.polygonPoints &&
        envoyPoly.polygonPoints.length === 6
    );
    const polyXs = envoyPoly.polygonPoints!.map((p) => p[0]);
    const polyMidX = (Math.min(...polyXs) + Math.max(...polyXs)) / 2;
    assert.ok(Math.abs(polyMidX - envoyPoly.width / 2) <= 2);
  });
});

// ============================================================================
// Audit Regression Suite: P0 Security, Stability, Performance & Packaging
// ============================================================================

describe("P0-2 Security: XSS & attribute injection hardening", () => {
  it("sanitizes malicious path.d, style.opacity, radius, polygonPoints, and text in SVG output", () => {
    const maliciousSpec = {
      title: 'Test "><script>alert(1)</script>',
      elements: [
        {
          id: "p_node",
          type: "path",
          d: 'M 0 0" onload="alert(1)" /><script>alert(1)</script><path d="',
          style: {
            opacity: '1" onmouseover="alert(1)' as unknown as number,
            radius: '8" onclick="alert(1)' as unknown as number,
          },
        },
        {
          id: "poly_node",
          type: "polygon",
          points: [
            ['0" onclick="alert(1)' as unknown as number, 0],
            [50, 50],
          ],
          label: '<img src=x onerror=alert(1)>',
          place: { rightOf: "p_node", gap: 40 },
        },
        {
          id: "card_node",
          type: "card",
          title: 'Card "Title" <svg/onload=alert(1)>',
          style: {
            opacity: "not-a-number" as unknown as number,
          },
          place: { rightOf: "poly_node", gap: 40 },
        },
      ],
    } as unknown as IllustrationSpec;

    const scene = compileIllustration(maliciousSpec, lightTheme);
    const svg = renderSceneGraphToSvgString(scene);

    assert.ok(!svg.includes("<script>"), "SVG must never contain injected <script> tag");
    assert.ok(!svg.includes("<svg/onload"), "SVG must escape angle brackets in card title");
    assert.ok(!svg.includes("<img "), "SVG must escape angle brackets in labels");
    assert.ok(
      !/<[^>]*\bon(?:load|error|click|mouseover)\s*=/i.test(svg),
      "SVG tags must never contain injected event-handler attributes"
    );
    // Ensure malicious pathD was rejected cleanly and opacity/radius were coerced safely
    const pNode = scene.nodes.find((n) => n.id === "p_node")!;
    assert.equal(pNode.pathD, "");
    assert.equal(pNode.style.opacity, 1);
    assert.ok(Number.isFinite(pNode.style.radius));
  });

  it("escapes <, >, U+2028, and U+2029 when serializing spec JSON for HTML <script>", () => {
    const payload = {
      title: "</script><script>alert(1)</script><!-- comment -->\u2028\u2029",
      elements: [{ id: "a", type: "card", title: "</SCRIPT><!--" }],
    };
    const serialized = serializeSpecForHtmlScript(payload);
    assert.ok(!serialized.includes("<"), "Serialized JSON must escape all < characters");
    assert.ok(!serialized.includes(">"), "Serialized JSON must escape all > characters");
    assert.ok(!serialized.includes("\u2028"), "Must escape U+2028");
    assert.ok(!serialized.includes("\u2029"), "Must escape U+2029");
    // Must remain 100% valid JSON that round-trips identically
    assert.deepEqual(JSON.parse(serialized), payload);
  });
});

describe("P0-3 Performance: 50-node + 80-edge routing baseline", () => {
  it("compiles a 50-node + 80-connection diagram rapidly via binary-heap A* and single-pass translation", () => {
    const elements: IllustrationSpec["elements"] = [];
    const connections: NonNullable<IllustrationSpec["connections"]> = [];

    const cols = 10;
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        elements.push({
          id: `node_${idx}`,
          type: "rect",
          label: `Svc ${idx}`,
          x: c * 170,
          y: r * 120,
          width: 110,
          height: 52,
          style: { tone: idx % 2 === 0 ? "primary" : "accent" },
        });
      }
    }

    // 45 horizontal links + 20 skip-blocker detour links + 15 vertical/diagonal links = 80 connections
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = r * cols + c;
        connections.push({
          from: `node_${a}@right`,
          to: `node_${a + 1}@left`,
          routing: "orthogonal",
        });
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 4; c++) {
        const a = r * cols + c;
        const b = r * cols + c + 2; // Jumps over intermediate node (triggers A* obstacle detour!)
        connections.push({
          from: `node_${a}@right`,
          to: `node_${b}@left`,
          label: `Skip ${a}-${b}`,
          routing: "orthogonal",
        });
      }
    }
    for (let i = 0; i < 15; i++) {
      const a = i;
      const b = i + 22; // Cross-row jump across multiple blockers
      connections.push({
        from: `node_${a}@bottom`,
        to: `node_${b}@top`,
        routing: "orthogonal",
      });
    }

    assert.equal(elements.length, 50);
    assert.equal(connections.length, 80);

    const spec: IllustrationSpec = {
      title: "50-Node 80-Edge Performance Benchmark",
      elements,
      connections,
    };

    const t0 = performance.now();
    const scene = compileIllustration(spec, lightTheme);
    const elapsedMs = performance.now() - t0;

    assert.equal(scene.nodes.length, 50);
    assert.equal(scene.edges.length, 80);
    assert.ok(
      elapsedMs < 1500,
      `50-node 80-edge compilation took ${elapsedMs.toFixed(1)}ms (expected < 1500ms)`
    );
  });
});

describe("P0-4 Tone safety & validator enum warnings", () => {
  it("never throws on invalid LLM tones ('blue', 'error', 'constructor') and falls back to neutral", () => {
    const spec = {
      title: "Invalid Tone Resilience",
      elements: [
        {
          id: "c1",
          type: "card",
          title: "Card",
          icon: "cpu",
          badge: "v1",
          style: { tone: "blue", variant: "glowing" },
        },
        {
          id: "cb1",
          type: "code-block",
          code: "const x = 1;",
          highlightLines: [1],
          style: { tone: "red" },
          place: { rightOf: "c1", gap: 40 },
        },
        {
          id: "t1",
          type: "table",
          title: "Metrics",
          headers: ["K", "V"],
          rows: [["status", { text: "fail", tone: "error" }]],
          style: { tone: "constructor" },
          place: { below: "c1", gap: 40 },
        },
        {
          id: "term1",
          type: "terminal",
          lines: [{ output: "err", tone: "crimson" }],
          place: { rightOf: "t1", gap: 40 },
        },
        {
          id: "bf1",
          type: "bitfield",
          title: "Reg",
          fields: [{ name: "F0", bits: 8, tone: "purple" }],
          place: { below: "t1", gap: 40 },
        },
        {
          id: "sq1",
          type: "sequence",
          actors: [
            { id: "a1", label: "A", tone: "blue" },
            { id: "a2", label: "B", tone: "toString" },
          ],
          messages: [{ from: "a1", to: "a2", label: "ping", tone: "green" }],
          place: { rightOf: "bf1", gap: 40 },
        },
        {
          id: "txt1",
          type: "text",
          text: "Note",
          style: { tone: "orange" },
          place: { below: "bf1", gap: 20 },
        },
        {
          id: "ico1",
          type: "icon",
          name: "server",
          style: { tone: "cyan" },
          place: { rightOf: "txt1", gap: 20 },
        },
        {
          id: "pth1",
          type: "path",
          d: "M 0 0 L 40 40",
          style: { tone: "magenta" },
          place: { rightOf: "ico1", gap: 20 },
        },
      ],
      connections: [
        {
          from: "c1@right",
          to: "cb1@left",
          label: "req",
          tone: "blue",
          routing: "zigzag",
        },
      ],
    } as unknown as IllustrationSpec;

    const check = validateIllustrationSpec(spec);
    assert.equal(check.valid, true, "Unknown enum values should emit warnings, not hard errors");
    assert.ok(check.warnings.length >= 10, "Validator must report warnings for invalid tones/variants/routing");

    const scene = compileIllustration(spec, lightTheme);
    assert.equal(scene.nodes.length, 9);
    assert.equal(scene.edges.length, 1);
    assert.equal(scene.edges[0].tone, "neutral");
    const svg = renderSceneGraphToSvgString(scene);
    assert.ok(svg.startsWith("<svg") && svg.endsWith("</svg>"));
  });
});

// ============================================================================
// Audit Regression Suite: P1 Parser, Validator, Defs Isolation, SSR & MDX
// ============================================================================

describe("P1-1 & P1-2: Loose JSON string preservation & YAML same-indent sequences", () => {
  it("preserves key-like and trailing-comma patterns inside strings in normalizeLooseJson", () => {
    const loose = `{
      // comment outside string
      label: "HTTP, retry: 3",
      code: "[1, 2,]",
      single: 'a, b: c, // not a comment',
      url: "https://example.com/a//b",
      trailing: [1, 2, /* comment */ ],
    }`;
    const parsed = JSON.parse(normalizeLooseJson(loose)) as Record<string, unknown>;
    assert.equal(parsed.label, "HTTP, retry: 3");
    assert.equal(parsed.code, "[1, 2,]");
    assert.equal(parsed.single, "a, b: c, // not a comment");
    assert.equal(parsed.url, "https://example.com/a//b");
    assert.deepEqual(parsed.trailing, [1, 2]);
  });

  it("parses loose JSON with fences, single quotes, unquoted keys, and comments", () => {
    const looseJsonSpecText = `
\`\`\`illustration
{
  // LLM comment and unquoted keys with trailing commas
  title: 'Loose JSON Test',
  elements: [
    { id: 'api_node', type: 'card', title: 'API, retry: 3', },
    { id: 'db_node', type: 'cylinder', label: 'Postgres', place: { rightOf: 'api_node', gap: 48, }, },
  ],
  connections: [
    { from: 'api_node@right', to: 'db_node@left', label: 'SQL Query', },
  ],
}
\`\`\`
`;
    const parsed = parseIllustrationSpecText(looseJsonSpecText) as IllustrationSpec;
    const check = validateIllustrationSpec(parsed);
    assert.ok(check.valid);
    assert.equal((parsed.elements[0] as { title: string }).title, "API, retry: 3");
  });

  it("parses YAML with same-indent sequences at root and nested inside groups", () => {
    const sameIndentYaml = `
title: Same-Indent YAML
elements:
- id: grp
  type: group
  title: Group
  children:
  - id: child_a
    type: card
    title: Child A
  - id: child_b
    type: card
    title: Child B
- id: ext
  type: rect
  label: External
  place:
    rightOf: grp
connections:
- from: child_a@right
  to: ext@left
  label: Link
`;
    const parsed = parseIllustrationSpecText(sameIndentYaml) as IllustrationSpec;
    const check = validateIllustrationSpec(parsed);
    assert.ok(check.valid, `Expected valid spec, got errors: ${check.errors.join("; ")}`);
    assert.equal(parsed.elements.length, 2);
    assert.equal((parsed.elements[0] as { children: unknown[] }).children.length, 2);
    assert.equal(parsed.connections?.length, 1);

    const scene = compileIllustration(check.spec!, lightTheme);
    assert.equal(scene.edges.length, 1);
  });

  it("parses indented YAML with block scalars and inline arrays", () => {
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
    const check = validateIllustrationSpec(parseIllustrationSpecText(yamlSpecText));
    assert.ok(check.valid && check.spec);
    const yamlScene = compileIllustration(check.spec!, lightTheme);
    assert.equal(yamlScene.nodes.length, 2);
    assert.equal(yamlScene.edges.length, 1);
    const sampleArrowEdge = yamlScene.edges[0];
    const targetEndPt = sampleArrowEdge.points[sampleArrowEdge.points.length - 1];
    assert.ok(
      !sampleArrowEdge.pathD.endsWith(
        `${targetEndPt[0].toFixed(1)} ${targetEndPt[1].toFixed(1)}`
      )
    );
  });
});

describe("P1-3 Validator holes & auto-ID collision prevention", () => {
  it("validates connections even when zero elements have explicit IDs", () => {
    const res = validateIllustrationSpec({
      elements: [{ type: "card", title: "Unnamed" }],
      connections: [{ from: "", to: "missing" }],
    });
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes("missing a valid 'from'")));
    assert.ok(res.errors.some((e) => e.includes('unknown element id "missing"')));
  });

  it("validates nested callout targets inside groups and windows", () => {
    const res = validateIllustrationSpec({
      elements: [
        {
          id: "win1",
          type: "window",
          children: [
            { id: "inner", type: "card", title: "Inner" },
            { type: "callout", text: "Bad target", target: "innr" },
          ],
        },
      ],
    });
    assert.equal(res.valid, false);
    assert.ok(
      res.errors.some(
        (e) =>
          e.includes("elements[0].children[1].target") &&
          e.includes('Did you mean "inner"?')
      )
    );
  });

  it("rejects element IDs containing '.' or '@' or whitespace", () => {
    const res = validateIllustrationSpec({
      elements: [
        { id: "bad.id", type: "card", title: "Dot" },
        { id: "bad@id", type: "card", title: "At" },
        { id: "bad id", type: "card", title: "Space" },
      ],
    });
    assert.equal(res.valid, false);
    assert.equal(res.errors.length, 3);
    assert.ok(res.errors.every((e) => e.includes("invalid element id")));
  });

  it("suggests closest IDs on typos in place and connection endpoints", () => {
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
    assert.ok(typoCheck.errors.some((e) => e.includes('Did you mean "auth_service"?')));
    assert.ok(typoCheck.errors.some((e) => e.includes('Did you mean "order_service"?')));
  });

  it("uses reserved __auto_ prefix so auto-generated IDs never overwrite user IDs like card_1", () => {
    const spec: IllustrationSpec = {
      elements: [
        { type: "card", title: "Auto Card" },
        { id: "card_1", type: "card", title: "Explicit card_1", place: { rightOf: "other_card" } },
      ],
    };
    // Remove invalid place for compilation test
    delete (spec.elements[1] as { place?: unknown }).place;
    const scene = compileIllustration(spec, lightTheme);
    const ids = scene.nodes.map((n) => n.id);
    assert.equal(new Set(ids).size, 2, "Auto ID must never collide with explicit id 'card_1'");
    assert.ok(ids.includes("card_1"));
    assert.ok(ids.some((id) => id.startsWith("__auto_card_")));
    assert.ok(scene.anchorRegistry["card_1"]);
  });
});

describe("P1-5, P1-6 & P1-7: Scoped defs IDs, SSR CSS vars, Zero-CLS & MDX v2+", () => {
  it("generates non-colliding <defs> IDs across different presets and multiple SSR blocks", () => {
    const cleanSvg = renderSceneGraphToSvgString(
      compileIllustration(sampleSpec, resolveThemeTokens(null, "clean"))
    );
    const blueprintSvg = renderSceneGraphToSvgString(
      compileIllustration(sampleSpec, resolveThemeTokens(null, "blueprint"))
    );

    const extractIds = (svg: string) =>
      new Set(Array.from(svg.matchAll(/(?<=\s)id="([^"]+)"/g)).map((m) => m[1]));

    const cleanIds = extractIds(cleanSvg);
    const bpIds = extractIds(blueprintSvg);
    assert.ok(cleanIds.size > 0 && bpIds.size > 0);
    for (const id of cleanIds) {
      assert.ok(!bpIds.has(id), `Defs ID "${id}" must not collide across presets`);
    }

    // Even two identical blocks in the same Markdown document must get distinct defs IDs
    const mdTree: MdastNode = {
      type: "root",
      children: [
        { type: "code", lang: "illustration", value: JSON.stringify(sampleSpec) },
        { type: "code", lang: "illustration", value: JSON.stringify(sampleSpec) },
      ],
    };
    remarkAiIllustration({ defaultPreset: "clean" })(mdTree);
    const ids0 = extractIds(mdTree.children![0].value || "");
    const ids1 = extractIds(mdTree.children![1].value || "");
    assert.ok(ids0.size > 0 && ids1.size > 0);
    for (const id of ids0) {
      assert.ok(!ids1.has(id), `SSR block 0 & 1 defs ID "${id}" must not collide`);
    }
  });

  it("emits CSS-variable SSR SVG with dark-mode rules and Zero-CLS dimensions matching headless client", () => {
    const mdTree: MdastNode = {
      type: "root",
      children: [
        { type: "code", lang: "illustration", value: JSON.stringify(sampleSpec) },
      ],
    };
    remarkAiIllustration({ defaultPreset: "clean" })(mdTree);
    const html = mdTree.children![0].value || "";
    assert.equal(mdTree.children![0].type, "html");
    assert.ok(html.includes("var(--ill-bg"), "SSR SVG must use CSS variables instead of hardcoded hex");
    assert.ok(
      html.includes("@media (prefers-color-scheme: dark)") &&
        html.includes('[data-theme="dark"]'),
      "SSR SVG must embed dark-mode variable rules to prevent light flash"
    );
    assert.ok(html.includes("aspect-ratio:"), "SSR fallback must reserve aspect-ratio for Zero-CLS");

    const wMatch = html.match(/data-ssr-width="(\d+)"/);
    const hMatch = html.match(/data-ssr-height="(\d+)"/);
    assert.ok(wMatch && hMatch, "SSR output must include data-ssr-width and data-ssr-height");

    // Client initial hydration using headless measurer matches SSR dimensions pixel-for-pixel
    const clientScene = compileIllustration(
      sampleSpec,
      lightTheme,
      { compactViewport: false },
      new TextMeasurer({ forceHeadless: true })
    );
    assert.equal(clientScene.width, Number(wMatch![1]));
    assert.equal(clientScene.height, Number(hMatch![1]));

    // createSsrThemeTokens compiles cleanly without throwing
    const ssrTheme = createSsrThemeTokens("blueprint");
    assert.ok(ssrTheme.colors.bg.includes("var(--ill-"));
  });

  it("outputs mdxJsxFlowElement in MDX mode and auto-detects .mdx files", () => {
    const mdxTree: MdastNode = {
      type: "root",
      children: [
        { type: "code", lang: "illustration", value: JSON.stringify(sampleSpec) },
      ],
    };
    remarkAiIllustration({ defaultPreset: "sketch", mode: "auto" })(mdxTree, {
      extname: ".mdx",
    });

    const jsxNode = mdxTree.children![0];
    assert.equal(jsxNode.type, "mdxJsxFlowElement");
    assert.equal(jsxNode.name, "ai-illustration");
    assert.ok(jsxNode.attributes?.some((a) => a.name === "spec" && typeof a.value === "string"));
    assert.ok(jsxNode.attributes?.some((a) => a.name === "preset" && a.value === "sketch"));
    assert.ok(jsxNode.attributes?.some((a) => a.name === "data-ssr-width"));
    assert.equal(jsxNode.children?.length, 1);
    const fallbackDiv = jsxNode.children![0];
    assert.equal(fallbackDiv.type, "mdxJsxFlowElement");
    assert.equal(fallbackDiv.name, "div");
    const innerHtmlAttr = fallbackDiv.attributes?.find(
      (a) => a.name === "dangerouslySetInnerHTML"
    );
    assert.ok(
      innerHtmlAttr &&
        typeof innerHtmlAttr.value === "object" &&
        innerHtmlAttr.value?.type === "mdxJsxAttributeValueExpression" &&
        innerHtmlAttr.value.data?.estree,
      "MDX SSR fallback must include valid ESTree dangerouslySetInnerHTML attribute"
    );
  });
});

// ============================================================================
// Audit Regression Suite: P2 Runtime & P3 Quality
// ============================================================================

describe("P2 Runtime helpers: PNG scale cap, compact calculation & ThemeObserver cleanup", () => {
  it("caps PNG export scale safely for very large canvases", () => {
    assert.equal(computeSafePngExportScale(800, 500, 2), 2);
    const hugeScale = computeSafePngExportScale(6000, 6000, 2);
    assert.ok(hugeScale < 1, "Huge 6000x6000 canvas must scale down below 1x");
    assert.ok(6000 * hugeScale <= 8192);
    assert.ok(6000 * hugeScale * (6000 * hugeScale) <= 16_777_216 + 100);
  });

  it("evaluates computeIsCompact consistently for reflow vs scale mode", () => {
    const makeMockEl = (responsive: string, width: number, forceCompact?: boolean) => ({
      containerWidth: width,
      forceCompact,
      getAttribute: (name: string) => (name === "responsive" ? responsive : null),
    });

    const scaleNarrow = makeMockEl("scale", 400);
    assert.equal(
      AiIllustrationElement.prototype.computeIsCompact.call(scaleNarrow),
      false,
      "scale mode below 620px must report isCompact=false so first toggle flips to true"
    );
    const reflowNarrow = makeMockEl("reflow", 400);
    assert.equal(
      AiIllustrationElement.prototype.computeIsCompact.call(reflowNarrow),
      true
    );
    const forced = makeMockEl("scale", 900, true);
    assert.equal(
      AiIllustrationElement.prototype.computeIsCompact.call(forced),
      true
    );
  });

  it("ThemeObserver ignores unrelated DOM mutations and cancels pending rAF on disconnect", () => {
    const origWindow = (globalThis as Record<string, unknown>).window;
    const origDoc = (globalThis as Record<string, unknown>).document;
    const origMO = (globalThis as Record<string, unknown>).MutationObserver;

    let pendingRafCb: (() => void) | null = null;
    let cancelledId: number | null = null;
    let observerCallback: (() => void) | null = null;
    let themeAttr = "light";

    const fakeStyle = { getPropertyValue: () => "" };
    const fakeEl = {
      classList: { contains: () => false },
      getAttribute: (name: string) => (name === "data-theme" ? themeAttr : null),
    } as unknown as HTMLElement;

    (globalThis as Record<string, unknown>).document = {
      documentElement: fakeEl,
      body: fakeEl,
    };
    (globalThis as Record<string, unknown>).window = {
      getComputedStyle: () => fakeStyle,
      requestAnimationFrame: (cb: () => void) => {
        pendingRafCb = cb;
        return 42;
      },
      cancelAnimationFrame: (id: number) => {
        cancelledId = id;
        pendingRafCb = null;
      },
    };
    (globalThis as Record<string, unknown>).MutationObserver = class {
      constructor(cb: () => void) {
        observerCallback = cb;
      }
      observe() {}
      disconnect() {}
    };

    try {
      let changes = 0;
      const obs = new ThemeObserver(fakeEl, () => {
        changes++;
      });
      obs.connect();

      // Unrelated mutation (theme unchanged) -> should NOT invoke callback
      observerCallback!();
      pendingRafCb!();
      assert.equal(changes, 0, "Unrelated class/style mutation must not trigger re-render");

      // Actual theme change -> invokes callback
      themeAttr = "dark";
      observerCallback!();
      pendingRafCb!();
      assert.equal(changes, 1, "Real theme change must trigger callback");

      // Disconnect while rAF is pending -> cancels rAF
      themeAttr = "light";
      observerCallback!();
      obs.disconnect();
      assert.equal(cancelledId, 42, "disconnect() must cancel pending requestAnimationFrame");
    } finally {
      (globalThis as Record<string, unknown>).window = origWindow;
      (globalThis as Record<string, unknown>).document = origDoc;
      (globalThis as Record<string, unknown>).MutationObserver = origMO;
    }
  });
});

describe("P3: TextMeasurer, callout @side target, and JSON Schema completeness", () => {
  it("preserves emoji surrogate pairs, wraps overly long URLs, and caches widths", () => {
    const measurer = new TextMeasurer({ forceHeadless: true });

    // Emoji surrogate pairs must never be split into lone UTF-16 surrogates
    const emojiBlock = measurer.measureBlock("🚀🔥✨🎉 测试中文", {
      fontFamily: "sans-serif",
      fontSize: 14,
      maxWidth: 36,
    });
    for (const line of emojiBlock.lines) {
      for (let i = 0; i < line.text.length; i++) {
        const code = line.text.charCodeAt(i);
        if (code >= 0xd800 && code <= 0xdbff) {
          const next = line.text.charCodeAt(i + 1);
          assert.ok(
            next >= 0xdc00 && next <= 0xdfff,
            "High surrogate must always be followed by valid low surrogate"
          );
          i++;
        } else {
          assert.ok(
            !(code >= 0xdc00 && code <= 0xdfff),
            "Must never produce an orphaned low surrogate"
          );
        }
      }
    }

    // Long URL without spaces must force-wrap within maxWidth
    const url = "https://example.com/very/long/endpoint/path/without/any/spaces/at/all";
    const urlBlock = measurer.measureBlock(url, {
      fontFamily: "monospace",
      fontSize: 12,
      maxWidth: 120,
      mono: true,
    });
    assert.ok(urlBlock.lines.length >= 3, "Long URL must break across multiple lines");
    assert.ok(
      urlBlock.lines.every((l) => l.width <= 120),
      "Every wrapped chunk of a long URL must fit within maxWidth"
    );
    assert.equal(urlBlock.lines.map((l) => l.text).join(""), url);
  });

  it("positions callouts with @side target suffix accurately instead of falling back to (0,0)", () => {
    const spec: IllustrationSpec = {
      elements: [
        { id: "target_box", type: "card", title: "Target Service", x: 300, y: 200 },
        { id: "note_at", type: "callout", text: "Anchored via @right", target: "target_box@right" },
      ],
    };
    const scene = compileIllustration(spec, lightTheme);
    const targetBox = scene.anchorRegistry["target_box"];
    const noteNode = scene.nodes.find((n) => n.id === "note_at")!;
    assert.equal(noteNode.calloutTail?.targetId, "target_box");
    assert.equal(noteNode.calloutTail?.side, "right");
    assert.ok(
      noteNode.x >= targetBox.x + targetBox.width,
      "Callout targeting target_box@right must be placed to the right of target_box"
    );
  });

  it("derives JSON Schema element oneOf variants from VALID_ELEMENT_TYPES and includes canvas/roughness fields", () => {
    const schema = getIllustrationJsonSchema() as Record<string, unknown>;
    const defs = schema.$defs as Record<string, unknown>;
    const props = schema.properties as Record<string, Record<string, unknown>>;

    assert.ok(AI_ILLUSTRATION_SYSTEM_PROMPT.includes("reflow"));
    assert.ok((props.canvas.properties as Record<string, unknown>).width);
    assert.ok((props.canvas.properties as Record<string, unknown>).height);
    assert.ok((props.canvas.properties as Record<string, unknown>).layout);
    assert.ok((props.style.properties as Record<string, unknown>).roughness);

    const elementDef = defs.element as { oneOf: Array<{ properties: { type: { const?: string; enum?: string[] } } }> };
    const coveredTypes = new Set<string>();
    for (const variant of elementDef.oneOf) {
      const t = variant.properties.type;
      if (t.const) coveredTypes.add(t.const);
      if (Array.isArray(t.enum)) t.enum.forEach((v) => coveredTypes.add(v));
    }
    assert.equal(coveredTypes.size, VALID_ELEMENT_TYPES.size);
    for (const t of ELEMENT_TYPES) {
      assert.ok(coveredTypes.has(t), `JSON Schema must cover element type "${t}"`);
    }
  });
});

// ============================================================================
// P0-1 & P1-4: Built Package Exports & Bundle Separation Verification
// ============================================================================

describe("P0-1 & P1-4: Multi-entry dist artifacts and package exports", () => {
  const distDir = path.resolve(import.meta.dirname, "../dist");

  it("verifies dist ESM entries, .d.ts declarations, and browser bundle isolation", async () => {
    // Only check dist outputs if dist exists (run `npm run build` before `npm test`)
    if (!fs.existsSync(path.join(distDir, "index.js"))) {
      return;
    }

    const expectedFiles = [
      "index.js",
      "index.d.ts",
      "millus.bundle.js",
      "integrations/remark-plugin.js",
      "integrations/remark-plugin.d.ts",
      "schema/ai-prompt.js",
      "schema/ai-prompt.d.ts",
    ];
    for (const rel of expectedFiles) {
      assert.ok(
        fs.existsSync(path.join(distDir, rel)),
        `Expected built artifact dist/${rel} must exist`
      );
    }

    // Verify .d.ts files do not leak raw `.ts` relative specifiers
    const indexDts = fs.readFileSync(path.join(distDir, "index.d.ts"), "utf8");
    assert.ok(!indexDts.includes('.ts"'), "index.d.ts must rewrite relative .ts specifiers to .js");

    // Verify browser bundle excludes build-time remark plugin & AI prompt
    const browserBundle = fs.readFileSync(
      path.join(distDir, "millus.bundle.js"),
      "utf8"
    );
    assert.ok(
      !browserBundle.includes("remarkAiIllustration"),
      "Browser bundle must not include build-time remarkAiIllustration"
    );
    assert.ok(
      !browserBundle.includes("AI_ILLUSTRATION_SYSTEM_PROMPT"),
      "Browser bundle must not include AI_ILLUSTRATION_SYSTEM_PROMPT"
    );
    assert.ok(
      !browserBundle.includes("<m-illus>"),
      "Browser bundle banner must not reference unregistered <m-illus>"
    );

    // Dynamically import built ESM entrypoints to confirm exports work at runtime
    const remarkMod = await import(new URL("../dist/integrations/remark-plugin.js", import.meta.url).href);
    const promptMod = await import(new URL("../dist/schema/ai-prompt.js", import.meta.url).href);
    assert.equal(typeof remarkMod.remarkAiIllustration, "function");
    assert.equal(typeof promptMod.getIllustrationJsonSchema, "function");
    assert.equal(typeof promptMod.AI_ILLUSTRATION_SYSTEM_PROMPT, "string");
  });
});
