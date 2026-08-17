/**
 * Subset Asymptote → SVG for AoPS-style AMC diagrams.
 * Not a full Asymptote engine — covers common 2D contest geometry.
 */
export type AsyRenderResult =
  | { ok: true; svg: string }
  | { ok: false; reason: string };

type Pt = { x: number; y: number };
type Pen = { stroke: string; fill: string; width: number; dash?: string };

const DIR: Record<string, Pt> = {
  N: { x: 0, y: 1 },
  S: { x: 0, y: -1 },
  E: { x: 1, y: 0 },
  W: { x: -1, y: 0 },
  NE: { x: 0.7071, y: 0.7071 },
  NW: { x: -0.7071, y: 0.7071 },
  SE: { x: 0.7071, y: -0.7071 },
  SW: { x: -0.7071, y: -0.7071 },
};

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
}

/** Split on `;` outside (), {}, [] and strings. */
function splitStatements(src: string): string[] {
  const out: string[] = [];
  let buf = "";
  let paren = 0;
  let brace = 0;
  let bracket = 0;
  let inStr = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (ch === '"' && src[i - 1] !== "\\") inStr = !inStr;
    if (!inStr) {
      if (ch === "(") paren += 1;
      else if (ch === ")") paren -= 1;
      else if (ch === "{") brace += 1;
      else if (ch === "}") brace -= 1;
      else if (ch === "[") bracket += 1;
      else if (ch === "]") bracket -= 1;
      if (ch === ";" && paren === 0 && brace === 0 && bracket === 0) {
        const s = buf.trim();
        if (s) out.push(s);
        buf = "";
        continue;
      }
    }
    buf += ch;
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

function splitArgs(s: string): string[] {
  const args: string[] = [];
  let buf = "";
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    if (ch === '"' && s[i - 1] !== "\\") inStr = !inStr;
    if (!inStr) {
      if (ch === "(" || ch === "[" || ch === "{") depth += 1;
      else if (ch === ")" || ch === "]" || ch === "}") depth -= 1;
      if (ch === "," && depth === 0) {
        args.push(buf.trim());
        buf = "";
        continue;
      }
    }
    buf += ch;
  }
  if (buf.trim()) args.push(buf.trim());
  return args;
}

function parseCall(stmt: string): { name: string; args: string[] } | null {
  const m = stmt.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(([\s\S]*)\)\s*$/);
  if (!m) return null;
  return { name: m[1]!, args: splitArgs(m[2] ?? "") };
}

function safeNumEval(expr: string): number {
  const e = expr.trim();
  const v = new Function(`"use strict"; return (${e});`)();
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`bad number: ${expr}`);
  return v;
}

function circleCircleIntersections(c0: Pt, r0: number, c1: Pt, r1: number): Pt[] {
  const dx = c1.x - c0.x;
  const dy = c1.y - c0.y;
  const d = Math.hypot(dx, dy);
  if (d < 1e-9 || d > r0 + r1 + 1e-9 || d < Math.abs(r0 - r1) - 1e-9) return [];
  const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
  const h2 = Math.max(0, r0 * r0 - a * a);
  const h = Math.sqrt(h2);
  const xm = c0.x + (a * dx) / d;
  const ym = c0.y + (a * dy) / d;
  const rx = (-dy * h) / d;
  const ry = (dx * h) / d;
  const p0 = { x: xm + rx, y: ym + ry };
  const p1 = { x: xm - rx, y: ym - ry };
  // Prefer the "upper" intersection as [0] (AoPS often uses [0] for the top one)
  if (p0.y > p1.y || (Math.abs(p0.y - p1.y) < 1e-9 && p0.x >= p1.x)) return [p0, p1];
  return [p1, p0];
}

export function asyToSvg(source: string): AsyRenderResult {
  try {
    return renderAsy(source);
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : "Failed to render diagram",
    };
  }
}

function renderAsy(raw: string): AsyRenderResult {
  let src = stripComments(raw);
  if (/\b(surface|orthographic|emissive|currentprojection)\b/.test(src)) {
    return { ok: false, reason: "3D diagrams are not supported yet" };
  }

  src = src.replace(/^\s*import\s+[^;]+;?/gm, "");
  src = src.replace(/^\s*usepackage\s*\([^;]*\);?/gm, "");
  src = src.replace(/^\s*texpreamble\s*\([^;]*\);?/gm, "");
  src = src.replace(/\bmarkscalefactor\s*=\s*[^;]+;?/g, "");
  // AoPS olympiad.asy macros: D=draw, CR=circle, MP=label (string) / midpoint (points)
  src = src
    .replace(/\bD\s*\(/g, "draw(")
    .replace(/\bCR\s*\(/g, "circle(")
    .replace(/\bCircle\s*\(/g, "circle(")
    .replace(/\bArc\s*\(/g, "arc(")
    .replace(/\borigin\b/g, "(0,0)");
  // MP("text", pos, dir) → label(...); leave MP(A,B) style for midpoint handling below
  src = src.replace(
    /\bMP\s*\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*,/g,
    "label($1,"
  );

  // Drop custom void helpers we can't execute — try to keep rest of figure.
  src = src.replace(/\bvoid\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g, "");

  const pairs = new Map<string, Pt>();
  const nums = new Map<string, number>();
  const paths = new Map<string, Pt[]>();
  let unitsize = 22;
  let defaultPen: Pen = { stroke: "#111827", fill: "none", width: 1.25 };
  const drawOps: string[] = [];
  const labelOps: { text: string; x: number; y: number }[] = [];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  let drew = 0;

  const touch = (p: Pt) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  };
  const touchR = (c: Pt, r: number) => {
    touch({ x: c.x - r, y: c.y - r });
    touch({ x: c.x + r, y: c.y + r });
  };

  const evalNum = (expr: string, locals: Record<string, number> = {}): number => {
    let e = expr.trim().replace(/\binch\b/g, "*1");
    e = e.replace(/\bpi\b/gi, "Math.PI");
    e = e.replace(/\bsqrt\s*\(/g, "Math.sqrt(");
    e = e.replace(/\babs\s*\(/g, "Math.abs(");
    e = e.replace(/\bsin\s*\(/g, "Math.sin(");
    e = e.replace(/\bcos\s*\(/g, "Math.cos(");
    e = e.replace(/\batan2\s*\(/g, "Math.atan2(");
    e = e.replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b/g, (id) => {
      if (id.startsWith("Math")) return id;
      if (id in locals) return String(locals[id]);
      if (nums.has(id)) return String(nums.get(id));
      return id;
    });
    return safeNumEval(e);
  };

  const evalPoint = (expr: string, locals: Record<string, number> = {}): Pt => {
    const e0 = expr.trim();
    if (e0 === "cycle") throw new Error("cycle");
    // User-defined pairs shadow compass dirs (E/N/S/W are common point names).
    if (pairs.has(e0)) return { ...pairs.get(e0)! };
    if (DIR[e0]) return { ...DIR[e0]! };

    let m = e0.match(/^midpoint\s*\(\s*([^,]+)\s*,\s*([^)]+)\s*\)$/);
    if (m) {
      const a = evalPoint(m[1]!, locals);
      const b = evalPoint(m[2]!, locals);
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    // midpoint(A--B)
    m = e0.match(/^midpoint\s*\(\s*([\s\S]+)\s*\)$/);
    if (m && m[1]!.includes("--")) {
      const pts = parsePathExpr(m[1]!, locals);
      if (pts.length >= 2) {
        const a = pts[0]!;
        const b = pts[pts.length - 1]!;
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      }
    }
    m = e0.match(/^dir\s*\(\s*([^)]+)\s*\)$/);
    if (m) {
      const deg = evalNum(m[1]!, locals);
      const rad = (deg * Math.PI) / 180;
      return { x: Math.cos(rad), y: Math.sin(rad) };
    }
    // intersectionpoints(circle(A,r), circle(B,s))[i]
    m = e0.match(
      /^intersectionpoints?\s*\(\s*([\s\S]*)\s*\)\s*(?:\[\s*(\d+)\s*\])?$/i
    );
    if (m) {
      const args = splitArgs(m[1]!);
      if (args.length >= 2) {
        const circ = (s: string): { c: Pt; r: number } => {
          const cm = s
            .trim()
            .match(/^(?:circle|Circle|CR)\s*\(\s*([\s\S]*)\s*\)$/);
          if (!cm) throw new Error(`not a circle: ${s}`);
          const ca = splitArgs(cm[1]!);
          const c = evalPoint(ca[0]!, locals);
          const second = ca[1]!.trim();
          let r: number;
          try {
            const b = evalPoint(second, locals);
            r = Math.hypot(b.x - c.x, b.y - c.y);
          } catch {
            r = evalNum(second, locals);
          }
          return { c, r };
        };
        const A = circ(args[0]!);
        const B = circ(args[1]!);
        const pts = circleCircleIntersections(A.c, A.r, B.c, B.r);
        const idx = m[2] != null ? Number(m[2]) : 0;
        if (!pts[idx]) throw new Error("no intersection");
        return pts[idx]!;
      }
    }
    if (e0.startsWith("(") && e0.endsWith(")")) {
      const args = splitArgs(e0.slice(1, -1));
      if (args.length === 2) {
        return { x: evalNum(args[0]!, locals), y: evalNum(args[1]!, locals) };
      }
    }

    // Additive chain A+B-(1,0)
    const parts: { op: "+" | "-"; term: string }[] = [];
    let depth = 0;
    let start = 0;
    let op: "+" | "-" = "+";
    for (let i = 0; i < e0.length; i++) {
      const ch = e0[i]!;
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
      else if ((ch === "+" || ch === "-") && depth === 0 && i > 0) {
        parts.push({ op, term: e0.slice(start, i).trim() });
        op = ch;
        start = i + 1;
      }
    }
    parts.push({ op, term: e0.slice(start).trim() });
    if (parts.length > 1) {
      let x = 0;
      let y = 0;
      for (const p of parts) {
        if (!p.term) continue;
        const pt = evalPointTerm(p.term, locals);
        x += p.op === "+" ? pt.x : -pt.x;
        y += p.op === "+" ? pt.y : -pt.y;
      }
      return { x, y };
    }
    return evalPointTerm(e0, locals);
  };

  const evalPointTerm = (term: string, locals: Record<string, number>): Pt => {
    const e = term.trim();
    if (pairs.has(e)) return { ...pairs.get(e)! };
    if (DIR[e]) return { ...DIR[e]! };

    const mul = e.match(/^([^*]+)\s*\*\s*([^*]+)$/);
    if (mul) {
      const a = mul[1]!.trim();
      const b = mul[2]!.trim();
      try {
        const n = evalNum(a, locals);
        const p = evalPoint(b, locals);
        return { x: n * p.x, y: n * p.y };
      } catch {
        const n = evalNum(b, locals);
        const p = evalPoint(a, locals);
        return { x: n * p.x, y: n * p.y };
      }
    }
    const shiftM = e.match(/^shift\s*\(\s*([^)]+)\s*\)\s*\*\s*(.+)$/);
    if (shiftM) {
      const s = evalPoint(shiftM[1]!, locals);
      const p = evalPoint(shiftM[2]!, locals);
      return { x: p.x + s.x, y: p.y + s.y };
    }
    const rotM = e.match(/^rotate\s*\(\s*([^)]+)\s*\)\s*\*\s*(.+)$/);
    if (rotM) {
      const deg = evalNum(rotM[1]!, locals);
      const p = evalPoint(rotM[2]!, locals);
      const rad = (deg * Math.PI) / 180;
      return {
        x: p.x * Math.cos(rad) - p.y * Math.sin(rad),
        y: p.x * Math.sin(rad) + p.y * Math.cos(rad),
      };
    }
    if (e.startsWith("(") && e.endsWith(")")) {
      const args = splitArgs(e.slice(1, -1));
      if (args.length === 2) {
        return { x: evalNum(args[0]!, locals), y: evalNum(args[1]!, locals) };
      }
    }
    throw new Error(`unsupported point: ${term}`);
  };

  const parsePen = (rawPen: string | undefined, base: Pen = defaultPen): Pen => {
    if (!rawPen) return { ...base };
    const p: Pen = { ...base };
    const s = rawPen.trim();
    if (/\blightgray\b/.test(s)) p.fill = "#d1d5db";
    else if (/\bgray\s*\(\s*1\s*\)/.test(s)) p.fill = "#ffffff";
    else if (/\bgray\b/.test(s)) p.fill = "#9ca3af";
    else if (/\blightred\b/.test(s)) p.fill = "#fecaca";
    else if (/\bwhite\b/.test(s)) p.fill = "#ffffff";
    if (/\bblack\b/.test(s)) p.stroke = "#111827";
    if (/\bred\b/.test(s)) p.stroke = "#b91c1c";
    if (/\bblue\b/.test(s)) p.stroke = "#1d4ed8";
    if (/\bgreen\b/.test(s)) p.stroke = "#15803d";
    if (/\borange\b/.test(s)) p.stroke = "#c2410c";
    if (/^lightgray$/.test(s)) p.fill = "#d1d5db";
    if (/^gray$/.test(s)) p.fill = "#9ca3af";
    if (/^white$/.test(s)) p.fill = "#ffffff";
    if (/^lightred$/.test(s)) p.fill = "#fecaca";
    const rgb = s.match(/rgb\s*\(\s*([^)]+)\s*\)/);
    if (rgb) {
      const parts = splitArgs(rgb[1]!);
      if (parts.length >= 3) {
        const r = Math.round(evalNum(parts[0]!) * 255);
        const g = Math.round(evalNum(parts[1]!) * 255);
        const b = Math.round(evalNum(parts[2]!) * 255);
        p.stroke = `rgb(${r},${g},${b})`;
      }
    }
    const lw = s.match(/linewidth\s*\(\s*([^)]+)\s*\)/);
    if (lw) p.width = Math.max(0.5, evalNum(lw[1]!) * 0.75);
    if (/\bdashed\b/.test(s) || /linetype\s*\(/.test(s)) p.dash = "6 4";
    if (/\bdotted\b/.test(s)) p.dash = "1.5 3";
    return p;
  };

  const emitPath = (pts: Pt[], pen: Pen, opts: { fill?: string; close?: boolean } = {}) => {
    if (pts.length === 0) return;
    pts.forEach(touch);
    const d =
      pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${-p.y}`).join(" ") +
      (opts.close ? " Z" : "");
    drawOps.push(
      `<path d="${d}" fill="${opts.fill ?? "none"}" stroke="${pen.stroke}" stroke-width="${pen.width}" ${
        pen.dash ? `stroke-dasharray="${pen.dash}"` : ""
      } stroke-linecap="round" stroke-linejoin="round" />`
    );
    drew += 1;
  };

  const emitCircle = (c: Pt, r: number, pen: Pen, fill: string | null) => {
    touchR(c, Math.abs(r));
    drawOps.push(
      `<circle cx="${c.x}" cy="${-c.y}" r="${Math.abs(r)}" fill="${
        fill ?? "none"
      }" stroke="${pen.stroke}" stroke-width="${pen.width}" ${
        pen.dash ? `stroke-dasharray="${pen.dash}"` : ""
      } />`
    );
    drew += 1;
  };

  const emitDot = (p: Pt, pen: Pen = defaultPen) => {
    touch(p);
    const r = Math.max(0.08, 2.2 / unitsize);
    drawOps.push(
      `<circle cx="${p.x}" cy="${-p.y}" r="${r}" fill="${pen.stroke}" stroke="none" />`
    );
    drew += 1;
  };

  const arcPoints = (c: Pt, r: number, a0deg: number, a1deg: number): Pt[] => {
    const a0 = (a0deg * Math.PI) / 180;
    const a1 = (a1deg * Math.PI) / 180;
    let delta = a1 - a0;
    // Asy arcs go CCW from a0 to a1 typically when a1>a0; if equal full circle
    if (Math.abs(delta) < 1e-9) delta = Math.PI * 2;
    while (delta < 0) delta += Math.PI * 2;
    const n = Math.max(16, Math.ceil((Math.abs(delta) * 24) / Math.PI));
    const pts: Pt[] = [];
    for (let i = 0; i <= n; i++) {
      const t = a0 + (delta * i) / n;
      pts.push({ x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) });
    }
    return pts;
  };

  const parsePathExpr = (expr: string, locals: Record<string, number> = {}): Pt[] => {
    let e = expr.trim();
    // rotate(deg) * path
    const rotPath = e.match(/^rotate\s*\(\s*([^)]+)\s*\)\s*\*\s*(.+)$/);
    if (rotPath) {
      const deg = evalNum(rotPath[1]!, locals);
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      return parsePathExpr(rotPath[2]!, locals).map((p) => ({
        x: p.x * cos - p.y * sin,
        y: p.x * sin + p.y * cos,
      }));
    }
    // unwrap extra parens
    while (e.startsWith("(") && e.endsWith(")") && splitArgs(e.slice(1, -1)).length === 1) {
      // only unwrap if it's grouping a path, not a point (x,y)
      const inner = e.slice(1, -1).trim();
      if (inner.includes("--") || /\barc\s*\(/.test(inner) || inner.includes("cycle")) {
        e = inner;
      } else break;
    }

    if (paths.has(e)) return [...paths.get(e)!];

    const box = e.match(/^box\s*\(\s*([\s\S]*)\s*\)$/);
    if (box) {
      const args = splitArgs(box[1]!);
      const a = evalPoint(args[0]!, locals);
      const b = evalPoint(args[1]!, locals);
      return [
        { x: a.x, y: a.y },
        { x: b.x, y: a.y },
        { x: b.x, y: b.y },
        { x: a.x, y: b.y },
      ];
    }

    // Replace arc(...) pieces with placeholder points sequence via recursive expand
    // Split on -- but keep arc(...) intact
    const segs: string[] = [];
    let buf = "";
    let depth = 0;
    for (let i = 0; i < e.length; i++) {
      if (e.startsWith("--", i) && depth === 0) {
        segs.push(buf.trim());
        buf = "";
        i += 1;
        continue;
      }
      const ch = e[i]!;
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
      buf += ch;
    }
    if (buf.trim()) segs.push(buf.trim());

    const pts: Pt[] = [];
    let close = false;
    for (const seg of segs) {
      if (!seg || seg === "cycle") {
        close = true;
        continue;
      }
      const arcM = seg.match(/^arc\s*\(\s*([\s\S]*)\s*\)$/i);
      if (arcM) {
        const aargs = splitArgs(arcM[1]!);
        if (aargs.length === 4) {
          // arc(center, r, a0, a1)
          const c = evalPoint(aargs[0]!, locals);
          const r = evalNum(aargs[1]!, locals);
          const a0 = evalNum(aargs[2]!, locals);
          const a1 = evalNum(aargs[3]!, locals);
          const ap = arcPoints(c, r, a0, a1);
          if (pts.length && ap.length) ap.shift();
          pts.push(...ap);
          continue;
        }
        if (aargs.length === 3) {
          const c = evalPoint(aargs[0]!, locals);
          const p0 = evalPoint(aargs[1]!, locals);
          const p1 = evalPoint(aargs[2]!, locals);
          const r = Math.hypot(p0.x - c.x, p0.y - c.y);
          const a0 = (Math.atan2(p0.y - c.y, p0.x - c.x) * 180) / Math.PI;
          const a1 = (Math.atan2(p1.y - c.y, p1.x - c.x) * 180) / Math.PI;
          const ap = arcPoints(c, r, a0, a1);
          if (pts.length && ap.length) ap.shift();
          pts.push(...ap);
          continue;
        }
      }
      // skip operators like .. 
      const cleaned = seg.replace(/\s*\.\.\s*/g, "").trim();
      if (!cleaned || cleaned === "cycle") {
        close = true;
        continue;
      }
      pts.push(evalPoint(cleaned, locals));
    }
    if (close && pts.length) pts.push({ ...pts[0]! });
    return pts;
  };

  const handleDrawLike = (
    kind: "draw" | "filldraw" | "fill",
    args: string[],
    locals: Record<string, number> = {}
  ) => {
    if (args.length === 0) return;
    // draw(A--B ^^ C--D ^^ rightanglemark(...))
    const geomParts = args[0]!.split(/\s*\^\^\s*/);
    const pen = parsePen(args[1], defaultPen);
    const pen2 = args[2] ? parsePen(args[2], defaultPen) : pen;

    for (let geom of geomParts) {
      geom = geom.trim();
      if (!geom) continue;
      if (/^rightanglemark\s*\(/.test(geom)) {
        const call = parseCall(geom);
        if (call && call.args.length >= 3) {
          const A = evalPoint(call.args[0]!, locals);
          const B = evalPoint(call.args[1]!, locals);
          const C = evalPoint(call.args[2]!, locals);
          const u = { x: A.x - B.x, y: A.y - B.y };
          const v = { x: C.x - B.x, y: C.y - B.y };
          const lu = Math.hypot(u.x, u.y) || 1;
          const lv = Math.hypot(v.x, v.y) || 1;
          const s = 0.25;
          const uu = { x: (u.x / lu) * s, y: (u.y / lu) * s };
          const vv = { x: (v.x / lv) * s, y: (v.y / lv) * s };
          emitPath(
            [
              { x: B.x + uu.x, y: B.y + uu.y },
              { x: B.x + uu.x + vv.x, y: B.y + uu.y + vv.y },
              { x: B.x + vv.x, y: B.y + vv.y },
            ],
            defaultPen
          );
        }
        continue;
      }

      const cm = geom.match(/^(?:circle|Circle|CR)\s*\(\s*([\s\S]*)\s*\)$/);
      if (cm) {
        const cargs = splitArgs(cm[1]!);
        const c = evalPoint(cargs[0]!, locals);
        let r: number;
        const second = cargs[1]!.trim();
        if (/^[A-Za-z_]/.test(second) || second.startsWith("(")) {
          try {
            const b = evalPoint(second, locals);
            r = Math.hypot(b.x - c.x, b.y - c.y);
          } catch {
            r = evalNum(second, locals);
          }
        } else {
          r = evalNum(second, locals);
        }
        if (kind === "fill") {
          emitCircle(c, r, pen, pen.fill !== "none" ? pen.fill : "#d1d5db");
        } else if (kind === "filldraw") {
          emitCircle(c, r, pen2, pen.fill !== "none" ? pen.fill : "#d1d5db");
        } else {
          emitCircle(c, r, pen, null);
        }
        continue;
      }

      // bare arc(...)
      if (/^arc\s*\(/i.test(geom)) {
        const pts = parsePathExpr(geom, locals);
        emitPath(pts, pen);
        continue;
      }

      const pts = parsePathExpr(geom, locals);
      const closed =
        /cycle/.test(geom) ||
        (pts.length > 2 &&
          Math.hypot(pts[0]!.x - pts[pts.length - 1]!.x, pts[0]!.y - pts[pts.length - 1]!.y) < 1e-9);
      if (kind === "fill") {
        emitPath(pts, { ...pen, stroke: "none" }, {
          fill: pen.fill !== "none" ? pen.fill : "#d1d5db",
          close: true,
        });
      } else if (kind === "filldraw") {
        emitPath(pts, pen2, {
          fill: pen.fill !== "none" ? pen.fill : "#d1d5db",
          close: true,
        });
      } else {
        emitPath(pts, pen, { close: closed });
      }
    }
  };

  const handleLabel = (args: string[], locals: Record<string, number> = {}) => {
    if (args.length < 2) return;
    let text = args[0]!.trim();
    if (text.startsWith('"') && text.endsWith('"')) text = text.slice(1, -1);
    text = text.replace(/^\$|\$$/g, "").trim();
    let pos: Pt;
    const where = args[1]!;
    if (where.includes("--")) {
      const pts = parsePathExpr(where, locals);
      pos = {
        x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
        y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
      };
    } else {
      pos = evalPoint(where, locals);
    }
    let dir: Pt = { x: 0, y: 0 };
    if (args[2]) {
      const d = args[2]!.trim();
      if (DIR[d]) dir = DIR[d]!;
      else if (d.startsWith("dir")) dir = evalPoint(d, locals);
    }
    const x = pos.x + dir.x * 0.22;
    const y = pos.y + dir.y * 0.22;
    touch({ x, y });
    labelOps.push({ text, x, y });
  };

  const execStatements = (statements: string[], locals: Record<string, number> = {}) => {
    for (let stmt of statements) {
      stmt = stmt.trim();
      if (!stmt) continue;
      try {
        // for (int i = 0; i < n; ++i) { ... }
        const forM2 = stmt.match(
          /^for\s*\(\s*int\s+(\w+)\s*=\s*([^;]+);\s*([^;]+);\s*([^)]*)\)\s*\{([\s\S]*)\}\s*$/
        );
        if (forM2) {
          const v = forM2[1]!;
          let i = Math.trunc(evalNum(forM2[2]!, locals));
          const cond = forM2[3]!.trim();
          const bodyStmts = splitStatements(forM2[5]!);
          let n = 0;
          while (n++ < 100) {
            const c = cond.replace(new RegExp(`\\b${v}\\b`, "g"), String(i));
            let ok = false;
            try {
              ok = Boolean(
                new Function(
                  `"use strict"; const ${Object.keys({ ...Object.fromEntries(nums), ...locals })
                    .filter((k) => /^[A-Za-z_]/.test(k))
                    .map((k) => `${k}=${({ ...Object.fromEntries(nums), ...locals })[k]}`)
                    .join(",")}; return (${c.replace(/\b(\w+)\b/g, (id) =>
                    id === v
                      ? String(i)
                      : id in locals
                        ? String(locals[id])
                        : nums.has(id)
                          ? String(nums.get(id))
                          : id
                  )});`
                )()
              );
            } catch {
              // simpler: i < n / i <= n
              const m = cond.match(new RegExp(`^${v}\\s*(<|<=)\\s*(.+)$`));
              if (!m) break;
              const end = evalNum(m[2]!, locals);
              ok = m[1] === "<" ? i < end : i <= end;
            }
            if (!ok) break;
            execStatements(bodyStmts, { ...locals, [v]: i });
            i += 1;
          }
          continue;
        }

        const u = stmt.match(/^unitsize\s*\(\s*([^)]+)\s*\)\s*$/);
        if (u) {
          const e = u[1]!.replace(/\bcm\b/g, "").replace(/\bmm\b/g, "*0.1").replace(/\binch\b/g, "");
          unitsize = Math.max(12, Math.min(28, evalNum(e || "1", locals) * 24));
          continue;
        }
        if (/^size\s*\(/.test(stmt)) continue;

        const dp = stmt.match(/^defaultpen\s*\(\s*([\s\S]*)\s*\)\s*$/);
        if (dp) {
          defaultPen = parsePen(dp[1]!, defaultPen);
          continue;
        }

        if (stmt.startsWith("pair ")) {
          for (const part of splitArgs(stmt.slice(5))) {
            const m = part.match(/^(\w+)\s*=\s*([\s\S]+)$/);
            if (m) pairs.set(m[1]!, evalPoint(m[2]!, locals));
          }
          continue;
        }

        // path P = …  or path P = …, Q = …
        if (stmt.startsWith("path ")) {
          for (const part of splitArgs(stmt.slice(5))) {
            const m = part.match(/^(\w+)\s*=\s*([\s\S]+)$/);
            if (m) paths.set(m[1]!, parsePathExpr(m[2]!, locals));
          }
          continue;
        }

        const decl = stmt.match(/^(?:real|int)\s+([\s\S]+)$/);
        if (decl) {
          for (const part of splitArgs(decl[1]!)) {
            const m = part.match(/^(\w+)\s*=\s*([\s\S]+)$/);
            if (m) nums.set(m[1]!, evalNum(m[2]!, locals));
          }
          continue;
        }

        const assign = stmt.match(/^([A-Za-z_]\w*)\s*=\s*([\s\S]+)$/);
        if (assign && !/^\w+\s*\(/.test(stmt)) {
          const name = assign[1]!;
          const rhs = assign[2]!;
          // Prefer points/paths over numbers — JS comma-operator makes `(0,0)` eval to 0.
          const looksPoint =
            /^\(/.test(rhs.trim()) ||
            /--|dir\s*\(|midpoint\s*\(|intersection|rotate\s*\(|shift\s*\(/i.test(
              rhs
            ) ||
            /^[A-Za-z_]/.test(rhs.trim());
          if (looksPoint) {
            try {
              pairs.set(name, evalPoint(rhs, locals));
              continue;
            } catch {
              try {
                paths.set(name, parsePathExpr(rhs, locals));
                continue;
              } catch {
                // fall through to numeric
              }
            }
          }
          try {
            nums.set(name, evalNum(rhs, locals));
          } catch {
            try {
              pairs.set(name, evalPoint(rhs, locals));
            } catch {
              paths.set(name, parsePathExpr(rhs, locals));
            }
          }
          continue;
        }

        const ifM = stmt.match(
          /^if\s*\(([\s\S]*?)\)\s*\{([\s\S]*)\}\s*(?:else\s*\{([\s\S]*)\})?\s*$/
        );
        if (ifM) {
          let ok = false;
          try {
            const c = ifM[1]!.replace(/\b(\w+)\b/g, (id) =>
              id in locals ? String(locals[id]) : nums.has(id) ? String(nums.get(id)) : id
            );
            ok = Boolean(new Function(`"use strict"; return (${c});`)());
          } catch {
            ok = false;
          }
          execStatements(splitStatements(ok ? ifM[2]! : ifM[3] ?? ""), locals);
          continue;
        }

        const call = parseCall(stmt);
        if (!call) continue;
        const { name, args } = call;
        if (name === "dot") {
          emitDot(evalPoint(args[0]!, locals), args[1] ? parsePen(args[1], defaultPen) : defaultPen);
        } else if (name === "draw") handleDrawLike("draw", args, locals);
        else if (name === "filldraw") handleDrawLike("filldraw", args, locals);
        else if (name === "fill") handleDrawLike("fill", args, locals);
        else if (name === "label") handleLabel(args, locals);
        else if (name === "MP" || name === "midpoint") {
          // leftover MP(A,B) / midpoint as a no-op statement (point forms used in exprs)
          if (args.length >= 2 && !/^["']/.test(args[0]!.trim())) {
            // ignore bare midpoint() statements
          } else if (args.length >= 2) {
            handleLabel(args, locals);
          }
        } else if (name === "rightanglemark") {
          handleDrawLike("draw", [`rightanglemark(${args.join(",")})`], locals);
        }
        // ignore unknown calls
      } catch {
        // soft-fail per statement so partial diagrams still show
      }
    }
  };

  const expectedDraws = (
    src.match(/\b(?:draw|filldraw|fill|dot|circle)\s*\(/gi) || []
  ).length;

  execStatements(splitStatements(src));

  if (!Number.isFinite(minX) || drew === 0) {
    return { ok: false, reason: "No drawable geometry found" };
  }
  // Prefer hiding badly incomplete figures over showing the wrong shape.
  if (expectedDraws >= 4 && drew < Math.max(2, Math.ceil(expectedDraws * 0.35))) {
    return {
      ok: false,
      reason: `Incomplete diagram (${drew}/${expectedDraws} primitives)`,
    };
  }

  const pad = 0.45;
  const x0 = minX - pad;
  const y0 = -(maxY + pad);
  const w = maxX - minX + pad * 2;
  const h = maxY - minY + pad * 2;
  const vb = `${x0 * unitsize} ${y0 * unitsize} ${w * unitsize} ${h * unitsize}`;

  const body = drawOps
    .map((op) =>
      op
        .replace(/\bcx="([^"]+)"/g, (_, v) => `cx="${Number(v) * unitsize}"`)
        .replace(/\bcy="([^"]+)"/g, (_, v) => `cy="${Number(v) * unitsize}"`)
        .replace(/\br="([^"]+)"/g, (_, v) => `r="${Number(v) * unitsize}"`)
        .replace(/\bd="([^"]+)"/g, (_, d) => {
          const nd = String(d).replace(/(-?\d+(?:\.\d+)?(?:e[-+]?\d+)?)/gi, (n: string) =>
            String(Number(n) * unitsize)
          );
          return `d="${nd}"`;
        })
    )
    .join("\n");

  const labels = labelOps
    .map((l) => {
      const safe = l.text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\\%/g, "%")
        .replace(/\\circ/g, "°");
      return `<text x="${l.x * unitsize}" y="${-l.y * unitsize}" text-anchor="middle" dominant-baseline="middle" font-size="${Math.max(9, unitsize * 0.42)}" fill="#111827" font-family="ui-sans-serif, system-ui, sans-serif">${safe}</text>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" role="img" aria-label="Geometry diagram" style="display:block;max-width:280px;width:100%;height:auto;margin:0 auto;background:transparent">
${body}
${labels}
</svg>`;

  return { ok: true, svg };
}
