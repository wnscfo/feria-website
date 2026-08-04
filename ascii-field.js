// feria — animated ASCII energy field, fused with the drifting API-call ledger.
//
// A drifting "energy blob" (field()) sweeps the viewport:
//   • a soft bloom halo tracks the blob — the ambient glow.
//   • three drifting columns of mock API-call ledger lines are drawn over it.
//     Their resting colour is a dim raw-TTY status hue; as the blob passes over
//     a line it lights up — violet→cyan, brighter, with bloom on the hottest
//     lines. This is the meaning.
//
// So the energy literally illuminates the ledger the agents are writing.
// Rendered on one canvas so hundreds of ledger runs animate together. Honors
// prefers-reduced-motion by drawing a single static frame.

(() => {
  "use strict";

  const canvas = document.getElementById("field");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");

  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Config ------------------------------------------------------------

  // Ledger typography, in CSS pixels.
  const LED_FONT = 12;
  const LINE_H = 21;
  const COL_PAD = 26; // inner horizontal padding per column, px
  const GUTTER_W = 3; // "NN " line-number gutter, in character cells
  const ROW_INDENT = 3; // "├─ " indent for tree rows, in character cells
  const BLANK_TAIL = 2; // blank lines between repeated cycles

  // Column drift periods (seconds for one full cycle). Staggered like the
  // original three-column drift so the streams never line up.
  const BASE_DUR = 46;
  const DURATIONS = [BASE_DUR, Math.round(BASE_DUR * 1.32), Math.round(BASE_DUR * 0.82)];

  // Resting (cold) ledger colours as [r,g,b] — the raw-TTY palette. The blob
  // lerps these toward the hot violet→cyan hue as it passes.
  const TONE = {
    gutter: [67, 73, 79],
    faint: [67, 73, 79],
    text: [104, 112, 120],
    ok: [78, 150, 128],
    warn: [176, 146, 74],
    agent: [150, 116, 196],
    dim: [104, 112, 120],
  };
  // Resting alpha per tone — how present a line is before the blob reaches it.
  const TONE_ALPHA = { gutter: 0.34, faint: 0.4, text: 0.5, code: 0.66 };

  const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
  const smooth = (t) => t * t * (3 - 2 * t);
  const lerp = (a, b, t) => a + (b - a) * t;

  // HSL → rgb tri, h in degrees, s/l in [0,1].
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; }
    else if (h < 120) { r = x; g = c; }
    else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; }
    else if (h < 300) { r = x; b = c; }
    else { r = c; b = x; }
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
  }

  // ---- Energy field ------------------------------------------------------

  let W = 0;
  let H = 0;
  let charW = LED_FONT * 0.6; // measured advance of the ledger monospace

  // Low-frequency wobble that breaks the blob edge into an irregular boundary.
  function wobble(u, v, t) {
    return (
      0.55 * Math.sin(u * 6.3 + t * 0.6) * Math.cos(v * 5.1 - t * 0.5) +
      0.25 * Math.sin(u * 12.0 - t * 0.4) * Math.cos(v * 10.0 + t * 0.7)
    );
  }

  // Blob centre roams slowly across the full width so the energy sweeps every
  // ledger column in turn; kept in the upper band to stay off the wordmark
  // (the veil handles the rest).
  const cx = (t) => 0.5 + 0.33 * Math.sin(t * 0.08);
  const cy = (t) => 0.32 + 0.15 * Math.sin(t * 0.05 + 1.3);

  // Energy intensity at pixel (x, y) and time t, plus a violet comet tail.
  function field(x, y, t) {
    const u = x / W;
    const v = y / H;
    const sx = cx(t);
    const sy = cy(t);

    const dx = (u - sx) * 1.25;
    const dy = (v - sy) * 1.55;
    const d = Math.sqrt(dx * dx + dy * dy) + 0.05 * wobble(u, v, t);
    let f = Math.exp(-(d * d) * 6.2);

    const tx = (u - (sx - 0.28)) * 0.8;
    const ty = (v - (sy + 0.2)) * 1.6;
    f += 0.42 * Math.exp(-(tx * tx + ty * ty) * 7.0);
    return f;
  }

  // Shared hot colour for a lit pixel: hue sweeps violet→cyan along the comet
  // axis, brightening and desaturating toward the peak.
  function hotColor(x, y, heat) {
    const axis = clamp01(x / W - y / H + 0.5);
    const hue = 286 - 104 * axis;
    const light = 0.5 + 0.42 * heat;
    const sat = 0.9 - 0.4 * heat;
    return { rgb: hslToRgb(hue, sat, light), hue, sat, light };
  }

  // ---- Ledger layout -----------------------------------------------------
  // Each column is compiled once into an array of physical lines; every line is
  // a list of runs { c (char column), text, tone, kind }. The column then tiles
  // seamlessly by wrapping on its cycle height.

  const columns = []; // { lines, cycleH, dur, x0, chars }

  function makeRun(c, text, tone, kind) {
    return { c, text, tone, kind };
  }

  // Build the physical lines for one API-call block into `out`, numbering lines
  // via the shared `counter`.
  function buildBlock(out, block, counter, chars) {
    const kind = block.kind || "dim";

    // Header: NN  METHOD path ·········· code
    const head = [makeRun(0, String(counter.n++).padStart(2, "0"), "gutter", kind)];
    let c = GUTTER_W;
    if (block.method) {
      head.push(makeRun(c, block.method, "code", kind));
      c += block.method.length + 1;
    }
    const pathEnd = c + block.path.length;
    head.push(makeRun(c, block.path, "text", kind));
    if (block.code) {
      const codeC = chars - block.code.length;
      if (codeC > pathEnd + 1) {
        head.push(makeRun(pathEnd + 1, "·".repeat(codeC - pathEnd - 2), "faint", kind));
      }
      head.push(makeRun(Math.max(pathEnd + 1, codeC), block.code, "code", kind));
    }
    out.push({ runs: head, kind });

    // Tree rows: NN  ├─ text ......... value
    const rowList = block.rows || [];
    rowList.forEach((row, i) => {
      const last = i === rowList.length - 1;
      const rowKind = row.kind || "dim";
      const runs = [makeRun(0, String(counter.n++).padStart(2, "0"), "gutter", kind)];
      runs.push(makeRun(GUTTER_W, last ? "└─" : "├─", "faint", rowKind));
      runs.push(makeRun(GUTTER_W + ROW_INDENT, row.text, "text", rowKind));
      if (row.value) {
        const valC = Math.max(GUTTER_W + ROW_INDENT + row.text.length + 1, chars - row.value.length);
        runs.push(makeRun(valC, row.value, "faint", rowKind));
      }
      out.push({ runs, kind: rowKind });
    });
  }

  // Compile a stream into a full cycle of lines, with blank lines between the
  // repeated cycles so the seamless drift loop has breathing room.
  function buildColumnLines(blocks, chars) {
    const lines = [];
    const counter = { n: 1 };
    for (const block of blocks) buildBlock(lines, block, counter, chars);
    for (let i = 0; i < BLANK_TAIL; i++) lines.push({ runs: [], kind: "dim" });
    return lines;
  }

  // ---- Sizing ------------------------------------------------------------

  function resize() {
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Measure the ledger monospace advance for crisp char-grid placement.
    ctx.font = LED_FONT + 'px "IBM Plex Mono", ui-monospace, monospace';
    charW = ctx.measureText("0").width || LED_FONT * 0.6;

    // Fit the column count to the width so ledger lines never overflow into a
    // neighbour: one column on phones, two on tablets, three on desktop.
    const streams = window.FERIA_STREAMS || [];
    const colCount = Math.min(streams.length, W < 680 ? 1 : W < 1040 ? 2 : 3);
    const colW = W / colCount;
    const chars = Math.max(24, Math.floor((colW - COL_PAD * 2) / charW));
    columns.length = 0;
    for (let i = 0; i < colCount; i++) {
      const lines = buildColumnLines(streams[i], chars);
      columns.push({
        lines,
        chars,
        cycleH: lines.length * LINE_H,
        dur: DURATIONS[i % DURATIONS.length],
        x0: i * colW + COL_PAD,
      });
    }
  }

  // ---- Drawing -----------------------------------------------------------

  function drawHalo(t) {
    const hx = cx(t) * W;
    const hy = cy(t) * H;
    const halo = ctx.createRadialGradient(hx, hy, 0, hx, hy, Math.max(W, H) * 0.5);
    halo.addColorStop(0, "rgba(120, 220, 255, 0.20)");
    halo.addColorStop(0.4, "rgba(70, 110, 255, 0.09)");
    halo.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);
  }

  // Resting colour for a run: structural tones are fixed; status tones (the
  // method/code cell, and warn row text) carry their kind's hue.
  function toneBase(tone, kind) {
    if (tone === "gutter") return TONE.gutter;
    if (tone === "faint") return TONE.faint;
    if (tone === "code") return TONE[kind] || TONE.dim;
    return kind === "warn" ? TONE.warn : TONE.text; // text tone
  }

  // One run of a ledger line, lit by the field.
  function drawRun(run, x, y, t) {
    const base = toneBase(run.tone, run.kind);
    const restAlpha = TONE_ALPHA[run.tone] != null ? TONE_ALPHA[run.tone] : 0.5;

    // Field heat sampled at the run's mid-point, so a passing blob lights it.
    const midX = x + (run.text.length * charW) * 0.5;
    let heat = clamp01(field(midX, y, t) * 1.15);
    const ease = smooth(heat);

    const hot = hotColor(midX, y, heat).rgb;
    const r = lerp(base[0], hot[0], ease);
    const g = lerp(base[1], hot[1], ease);
    const b = lerp(base[2], hot[2], ease);
    const a = restAlpha + (1 - restAlpha) * ease;

    if (ease > 0.62) {
      ctx.shadowBlur = 11 * ease;
      ctx.shadowColor = "rgba(" + (hot[0] | 0) + "," + (hot[1] | 0) + "," + (hot[2] | 0) + ",0.85)";
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = "rgba(" + (r | 0) + "," + (g | 0) + "," + (b | 0) + "," + a.toFixed(3) + ")";
    ctx.fillText(run.text, x, y);
  }

  // Walk the drifting, tiled columns and place every visible run at its pixel
  // position, returning the runs to draw.
  function collectLedger(t) {
    const items = [];

    for (const col of columns) {
      if (!col.cycleH) continue;
      const scroll = ((t / col.dur) * col.cycleH) % col.cycleH;
      for (let base = -scroll; base < H; base += col.cycleH) {
        for (let i = 0; i < col.lines.length; i++) {
          const y = base + i * LINE_H + LINE_H * 0.5;
          if (y < -LINE_H || y > H + LINE_H) continue;
          const line = col.lines[i];
          for (const run of line.runs) {
            const x = col.x0 + run.c * charW;
            items.push({ run, x, y });
          }
        }
      }
    }
    return items;
  }

  function drawLedger(items, t) {
    ctx.save();
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = LED_FONT + 'px "IBM Plex Mono", ui-monospace, monospace';
    for (const it of items) drawRun(it.run, it.x, it.y, t);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  function frame(t) {
    ctx.clearRect(0, 0, W, H);
    drawHalo(t);
    drawLedger(collectLedger(t), t);
  }

  // ---- Loop --------------------------------------------------------------

  let last = 0;
  let start = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    if (now - last < 33) return; // cap ~30fps; the drift is slow
    last = now;
    if (!start) start = now;
    frame((now - start) / 1000);
  }

  function init() {
    resize();
    if (reduceMotion) {
      frame(0);
      return;
    }
    requestAnimationFrame(loop);
  }

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      if (reduceMotion) frame(0);
    }, 150);
  });

  // Wait for the mono font so char metrics (and the -50% loop) are correct.
  const boot = () => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(init);
    } else {
      init();
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
