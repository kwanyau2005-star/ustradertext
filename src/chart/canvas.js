// src/chart/canvas.js — Canvas mini candlestick chart
// v26 refactor: 從 v25 抽出 drawMiniCandlesCanvas + drawRoundRect + wrapCanvasText
//                加上 markers 參數支援 pattern overlay

import { clamp, formatPrice } from "../utils.js";

/**
 * Wrap text to fit within maxWidth, max lines.
 */
export function wrapCanvasText(ctx, text, maxWidth, maxLines = 3) {
  const content = String(text || "").trim();
  if (!content) return [];
  const chars = [...content];
  const lines = [];
  let current = "";
  for (const ch of chars) {
    const next = current + ch;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = ch;
    if (lines.length === maxLines - 1) break;
  }
  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length > maxLines) lines.length = maxLines;
  if (chars.join("") !== lines.join("")) {
    const last = lines[lines.length - 1] || "";
    lines[lines.length - 1] = last.length > 1 ? `${last.slice(0, -1)}…` : "…";
  }
  return lines;
}

/**
 * Draw a rounded rectangle path (does not fill/stroke).
 */
export function drawRoundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/**
 * Render a mini candlestick chart onto a canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{o:number,h:number,l:number,c:number,t?:string|number}>} bars
 * @param {number} x - chart top-left x
 * @param {number} y - chart top-left y
 * @param {number} w - chart width
 * @param {number} h - chart height
 * @param {Object} opts
 *   - theme, series, overlays: same as svg version
 *   - markers: same as svg version
 */
export function drawMiniCandlesCanvas(ctx, bars, x, y, w, h, opts = {}) {
  const theme = opts.theme || {};
  const upColor = theme.upColor || "#39ff14";
  const downColor = theme.downColor || "#ff6b6b";
  const axisColor = theme.axisColor || "rgba(220,255,218,.82)";
  const gridColor = theme.gridColor || "rgba(57,255,20,.20)";
  const midColor = theme.midColor || "rgba(57,255,20,.14)";
  const series = Array.isArray(opts.series) ? opts.series : [];

  // Background panel
  drawRoundRect(ctx, x, y, w, h, 14);
  ctx.fillStyle = theme.background || "rgba(12,16,22,0.88)";
  ctx.fill();
  ctx.strokeStyle = theme.borderColor || "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.stroke();

  if (!Array.isArray(bars) || bars.length < 2) return;

  const chartPad = { top: 10, right: 76, bottom: 22, left: 46 };
  const rawMinL = Math.min(...bars.map(b => b.l));
  const rawMaxH = Math.max(...bars.map(b => b.h));
  const rawRange = Math.max(1e-9, rawMaxH - rawMinL);
  const pad = rawRange * 0.1;
  const minL = rawMinL - pad;
  const maxH = rawMaxH + pad;
  const range = Math.max(1e-9, maxH - minL);
  const plotW = Math.max(10, w - chartPad.left - chartPad.right);
  const plotH = Math.max(10, h - chartPad.top - chartPad.bottom);
  const scaleY = (v) => y + chartPad.top + (maxH - v) / range * plotH;
  const xLeft = x + chartPad.left;
  const xRight = x + chartPad.left + plotW;
  const yTop = y + chartPad.top;
  const yBottom = y + chartPad.top + plotH;
  const yMid = y + chartPad.top + plotH / 2;

  // Horizontal grid lines
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  [yTop, yBottom].forEach(yy => {
    ctx.beginPath();
    ctx.moveTo(xLeft, yy);
    ctx.lineTo(xRight, yy);
    ctx.stroke();
  });
  ctx.strokeStyle = midColor;
  ctx.beginPath();
  ctx.moveTo(xLeft, yMid);
  ctx.lineTo(xRight, yMid);
  ctx.stroke();

  const step = plotW / (bars.length + 1);
  const bodyW = Math.max(2, Math.floor(step * 0.55));

  // Vertical dashed grid
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  for (let i = 0; i < bars.length; i += 5) {
    const gx = xLeft + i * step + step / 2;
    ctx.beginPath();
    ctx.moveTo(gx, yTop);
    ctx.lineTo(gx, yBottom);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Candlesticks
  bars.forEach((b, i) => {
    const up = b.c >= b.o;
    const color = up ? upColor : downColor;
    const bx = xLeft + i * step + (step - bodyW) / 2;
    const yyHigh = scaleY(b.h);
    const yyLow = scaleY(b.l);
    const yyOpen = scaleY(b.o);
    const yyClose = scaleY(b.c);
    const yyTop = Math.min(yyOpen, yyClose);
    const bodyH = Math.max(1.5, Math.abs(yyClose - yyOpen));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(bx + bodyW / 2, yyHigh);
    ctx.lineTo(bx + bodyW / 2, yyLow);
    ctx.stroke();
    ctx.fillStyle = color;
    drawRoundRect(ctx, bx, yyTop, bodyW, bodyH, 1.2);
    ctx.fill();
  });

  // Series overlays (MA / VWAP)
  series.forEach(s => {
    if (!s?.values?.length) return;
    const color = s.color || "rgba(255,255,255,.7)";
    const sw = s.width || 2;
    ctx.strokeStyle = color;
    ctx.lineWidth = sw;
    if (s.dash) ctx.setLineDash([6, 5]); else ctx.setLineDash([]);
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < bars.length; i++) {
      const v = s.values[i];
      if (!Number.isFinite(v)) continue;
      const px = xLeft + i * step + step / 2;
      const py = Math.max(yTop, Math.min(yBottom, scaleY(v)));
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    }
    if (started) ctx.stroke();
    ctx.setLineDash([]);
  });

  // Horizontal overlays (support / resistance)
  const overlays = Array.isArray(opts.overlays) ? opts.overlays : [];
  const labelYs = [];
  overlays.filter(o => o && Number.isFinite(o.value)).forEach(o => {
    const yy = Math.max(yTop, Math.min(yBottom, scaleY(o.value)));
    ctx.strokeStyle = o.color || "rgba(255,255,255,.5)";
    ctx.lineWidth = 1.2;
    if (o.dash) ctx.setLineDash([4, 3]); else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(xLeft, yy);
    ctx.lineTo(xRight, yy);
    ctx.stroke();
    ctx.setLineDash([]);
    const label = String(o.label || "").trim();
    if (label && !labelYs.some(prevY => Math.abs(prevY - yy) < 14)) {
      labelYs.push(yy);
      ctx.font = "900 10px Arial, PingFang TC, Microsoft JhengHei, sans-serif";
      const boxW = Math.max(20, Math.min(46, ctx.measureText(label).width + 12));
      const rx = x + 4;
      const ry = Math.max(y + 2, Math.min(y + h - 18, yy - 8));
      drawRoundRect(ctx, rx, ry, boxW, 16, 7);
      ctx.fillStyle = "rgba(8,10,18,0.88)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = o.color || "#fff";
      ctx.textAlign = "center";
      ctx.fillText(label, rx + boxW / 2, ry + 11);
      ctx.textAlign = "start";
    }
  });

  // ★ Pattern markers overlay (new in v26)
  const markers = Array.isArray(opts.markers) ? opts.markers : [];
  // Trend line groups
  const trendGroups = new Map();
  markers.forEach(m => {
    if (!m || !Number.isInteger(m.index) || m.index < 0 || m.index >= bars.length) return;
    if (typeof m.kind === "string" && m.kind.startsWith("line-")) {
      const key = m.kind;
      if (!trendGroups.has(key)) trendGroups.set(key, []);
      trendGroups.get(key).push(m);
    }
  });
  trendGroups.forEach((group, key) => {
    if (group.length < 2) return;
    const sorted = group.slice().sort((a, b) => a.index - b.index);
    ctx.strokeStyle = key === "line-up" ? "#22c55e" : key === "line-down" ? "#ef4444" : "rgba(255,255,255,.7)";
    ctx.lineWidth = 1.6;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    let started = false;
    sorted.forEach(m => {
      const px = xLeft + m.index * step + step / 2;
      const py = Math.max(yTop, Math.min(yBottom, scaleY(bars[m.index].h)));
      if (!started) {
        ctx.moveTo(px, py);
        started = true;
      } else {
        ctx.lineTo(px, py);
      }
    });
    if (started) ctx.stroke();
    ctx.setLineDash([]);
  });
  // Point markers
  markers.forEach(m => {
    if (!Number.isInteger(m.index) || m.index < 0 || m.index >= bars.length) return;
    if (typeof m.kind === "string" && m.kind.startsWith("line-")) return;
    const b = bars[m.index];
    const px = xLeft + m.index * step + step / 2;
    let color = m.color || "rgba(192,132,252,.95)";
    if (m.kind === "bullish" || m.kind === "dot-up") color = m.color || "#22c55e";
    else if (m.kind === "bearish" || m.kind === "dot-down") color = m.color || "#ef4444";
    else if (m.kind === "neutral") color = m.color || "rgba(192,132,252,.95)";
    const py = Math.max(yTop, Math.min(yBottom, scaleY(b.h)));
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(8,10,18,.85)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(px, py - 8, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (m.label) {
      ctx.fillStyle = color;
      ctx.font = "900 8px Arial, PingFang TC, Microsoft JhengHei, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(m.label).slice(0, 6), px, py - 16);
      ctx.textAlign = "start";
    }
  });

  // Axis labels
  const drawAxisText = (text, tx, ty, align = "start") => {
    ctx.fillStyle = axisColor;
    ctx.font = "700 10px Arial, PingFang TC, Microsoft JhengHei, sans-serif";
    ctx.textAlign = align;
    ctx.fillText(text, tx, ty);
    ctx.textAlign = "start";
  };
  drawAxisText(formatPrice(rawMaxH), xRight + 6, yTop + 8);
  drawAxisText(formatPrice((rawMaxH + rawMinL) / 2), xRight + 6, yMid + 4);
  drawAxisText(formatPrice(rawMinL), xRight + 6, yBottom);

  const formatTick = (bar) => {
    if (!bar?.t) return "";
    const d = new Date(bar.t);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const firstTick = formatTick(bars[0]);
  const midTick = formatTick(bars[Math.floor(bars.length / 2)]);
  const lastTick = formatTick(bars[bars.length - 1]);
  if (firstTick) drawAxisText(firstTick, xLeft, y + h - 4);
  if (midTick) drawAxisText(midTick, xLeft + plotW / 2, y + h - 4, "center");
  if (lastTick) drawAxisText(lastTick, xRight, y + h - 4, "end");
}
