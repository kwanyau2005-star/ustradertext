// src/chart/svg.js — SVG mini candlestick chart
// v26 refactor: 從 v25 抽出 miniCandlesSVG，加上 markers 參數支援 pattern overlay

import { clamp, formatPrice, escapeHtml } from "../utils.js";

/**
 * Render a mini candlestick chart as inline SVG.
 *
 * @param {Array<{o:number,h:number,l:number,c:number,t?:string|number}>} bars
 * @param {number} width  - SVG viewBox width
 * @param {number} height - SVG viewBox height
 * @param {Object} opts
 *   - theme: { upColor, downColor, axisColor, gridColor, midColor }
 *   - series: Array<{ values:number[], color, width, dash }>  (e.g. MA / VWAP)
 *   - overlays: Array<{ value:number, color, label, dash }>   (e.g. support/resistance)
 *   - markers: Array<{ index:number, kind:string, label?:string, color?:string }>  // ★ NEW
 *       kind: "bullish" | "bearish" | "neutral" | "dot-up" | "dot-down" | "line-up" | "line-down"
 *       When kind starts with "line-", a trend line is drawn between all markers with that kind.
 * @returns {string} SVG markup
 */
export function miniCandlesSVG(bars, width = 240, height = 46, opts = {}) {
  if (!Array.isArray(bars) || bars.length < 2) {
    return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg"></svg>`;
  }
  const theme = opts.theme || {};
  const axisColor = theme.axisColor || "rgba(220,255,218,.82)";
  const gridColor = theme.gridColor || "rgba(57,255,20,.20)";
  const bgLineColor = theme.midColor || "rgba(57,255,20,.14)";
  const series = Array.isArray(opts?.series) ? opts.series : [];
  const chartPad = { top: 10, right: 76, bottom: 22, left: 46 };
  const plotW = Math.max(10, width - chartPad.left - chartPad.right);
  const plotH = Math.max(10, height - chartPad.top - chartPad.bottom);
  const rawMinL = Math.min(...bars.map(b => b.l));
  const rawMaxH = Math.max(...bars.map(b => b.h));
  const rawRange = Math.max(1e-9, rawMaxH - rawMinL);
  const pad = rawRange * 0.1;
  const minL = rawMinL - pad;
  const maxH = rawMaxH + pad;
  const range = Math.max(1e-9, maxH - minL);
  const scaleY = (v) => chartPad.top + (maxH - v) / range * plotH;
  const step = plotW / (bars.length + 1);
  const bodyW = Math.max(2, Math.floor(step * 0.55));
  const parts = [];
  const xLeft = chartPad.left;
  const xRight = chartPad.left + plotW;
  const yTopGrid = chartPad.top;
  const yBottomGrid = chartPad.top + plotH;
  const yMid = Math.round(chartPad.top + plotH / 2);

  // Horizontal grid
  parts.push(`<line x1="${xLeft}" y1="${yTopGrid}" x2="${xRight}" y2="${yTopGrid}" stroke="${gridColor}" stroke-width="1.2" opacity="0.9" />`);
  parts.push(`<line x1="${xLeft}" y1="${yMid}" x2="${xRight}" y2="${yMid}" stroke="${bgLineColor}" stroke-width="1.2" opacity="0.95" />`);
  parts.push(`<line x1="${xLeft}" y1="${yBottomGrid}" x2="${xRight}" y2="${yBottomGrid}" stroke="${gridColor}" stroke-width="1.2" opacity="0.9" />`);

  // Vertical grid (5-bar spacing)
  for (let i = 0; i < bars.length; i += 5) {
    const gx = Math.round(chartPad.left + i * step + step / 2);
    parts.push(`<line x1="${gx}" y1="${yTopGrid}" x2="${gx}" y2="${yBottomGrid}" stroke="${gridColor}" stroke-width="1.1" stroke-dasharray="3 5" opacity="0.82" />`);
  }

  // Candlesticks
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const up = b.c >= b.o;
    const color = up ? (theme.upColor || "var(--up)") : (theme.downColor || "var(--down)");
    const x = Math.round(chartPad.left + i * step + (step - bodyW) / 2);
    const yHigh = scaleY(b.h);
    const yLow = scaleY(b.l);
    const yOpen = scaleY(b.o);
    const yClose = scaleY(b.c);
    const yTop = Math.min(yOpen, yClose);
    const yBottom = Math.max(yOpen, yClose);
    const bodyH = Math.max(1.5, yBottom - yTop);
    parts.push(`<line class="mini-wick" x1="${x + bodyW / 2}" y1="${yHigh}" x2="${x + bodyW / 2}" y2="${yLow}" stroke="${color}" />`);
    parts.push(`<rect class="mini-body" x="${x}" y="${yTop}" width="${bodyW}" height="${bodyH}" fill="${color}" opacity="0.92" />`);
  }

  // Series overlays (MA / VWAP)
  series.forEach(s => {
    if (!s?.values?.length) return;
    const points = [];
    for (let i = 0; i < bars.length; i++) {
      const v = s.values[i];
      if (!Number.isFinite(v)) continue;
      const px = Math.round(chartPad.left + i * step + step / 2);
      const py = clamp(scaleY(v), chartPad.top, chartPad.top + plotH);
      points.push([px, py]);
    }
    if (points.length >= 2) {
      const d = points.map((p, idx) => `${idx === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ");
      const dash = s.dash ? ' stroke-dasharray="6 5"' : "";
      const sw = s.width || 2;
      parts.push(`<path d="${d}" fill="none" stroke="${s.color || "rgba(255,255,255,.7)"}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"${dash} opacity="0.95" />`);
    }
  });

  // Horizontal overlays (support / resistance)
  const overlays = Array.isArray(opts?.overlays) ? opts.overlays : [];
  const labelYs = [];
  overlays
    .filter(o => o && Number.isFinite(o.value))
    .forEach(o => {
      const y = clamp(scaleY(o.value), chartPad.top, chartPad.top + plotH);
      const stroke = o.color || "rgba(255,255,255,.45)";
      const dash = o.dash ? ' stroke-dasharray="4 3"' : "";
      parts.push(`<line x1="${xLeft}" y1="${y}" x2="${xRight}" y2="${y}" stroke="${stroke}" stroke-width="1.5"${dash} opacity="0.98" />`);
      const label = String(o.label || "").trim();
      if (label && !labelYs.some(prevY => Math.abs(prevY - y) < 14)) {
        labelYs.push(y);
        const text = escapeHtml(label);
        const boxW = Math.max(26, Math.min(66, label.length * 7 + 14));
        const rx = 4;
        const ry = clamp(y - 9, 2, height - 20);
        parts.push(`<rect x="${rx}" y="${ry}" width="${boxW}" height="18" rx="8" ry="8" fill="rgba(6,14,9,.92)" stroke="rgba(57,255,20,.24)" />`);
        parts.push(`<text x="${rx + boxW / 2}" y="${ry + 12.5}" fill="${stroke}" font-size="11" font-weight="900" text-anchor="middle">${text}</text>`);
      }
    });

  // ★ Pattern markers overlay (new in v26)
  const markers = Array.isArray(opts?.markers) ? opts.markers : [];
  // Group trend-line markers together for polyline drawing
  const trendGroups = new Map();
  markers.forEach(m => {
    if (!m || !Number.isInteger(m.index) || m.index < 0 || m.index >= bars.length) return;
    if (typeof m.kind === "string" && m.kind.startsWith("line-")) {
      const key = m.kind;
      if (!trendGroups.has(key)) trendGroups.set(key, []);
      trendGroups.get(key).push(m);
    }
  });
  // Draw trend lines
  trendGroups.forEach((group, key) => {
    if (group.length < 2) return;
    const sorted = group.slice().sort((a, b) => a.index - b.index);
    const points = sorted.map(m => {
      const px = Math.round(chartPad.left + m.index * step + step / 2);
      const py = clamp(scaleY(bars[m.index].h), chartPad.top, chartPad.top + plotH);
      return [px, py];
    });
    const d = points.map((p, idx) => `${idx === 0 ? "M" : "L"}${p[0]} ${p[1]}`).join(" ");
    const stroke = key === "line-up" ? "#39ff14" : key === "line-down" ? "#ff6b6b" : "rgba(220,255,218,.82)";
    parts.push(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-dasharray="4 3" opacity="0.95" />`);
  });
  // Draw point markers
  markers.forEach(m => {
    if (!Number.isInteger(m.index) || m.index < 0 || m.index >= bars.length) return;
    if (typeof m.kind === "string" && m.kind.startsWith("line-")) return;
    const b = bars[m.index];
    const px = Math.round(chartPad.left + m.index * step + step / 2);
    let color = m.color || "rgba(57,255,20,.95)";
    if (m.kind === "bullish" || m.kind === "dot-up") color = m.color || "#39ff14";
    else if (m.kind === "bearish" || m.kind === "dot-down") color = m.color || "#ff6b6b";
    else if (m.kind === "neutral") color = m.color || "rgba(57,255,20,.95)";
    const py = clamp(scaleY(b.h), chartPad.top, chartPad.top + plotH);
    const r = 4.2;
    parts.push(`<circle cx="${px}" cy="${py - 7}" r="${r}" fill="${color}" stroke="rgba(6,12,9,.92)" stroke-width="1.2" />`);
    if (m.label) {
      const text = escapeHtml(String(m.label).slice(0, 6));
      parts.push(`<text x="${px}" y="${py - 7 - r - 3}" fill="${color}" font-size="9.5" font-weight="900" text-anchor="middle">${text}</text>`);
    }
  });

  // Y-axis price labels
  const priceText = (v) => escapeHtml(formatPrice(v));
  parts.push(`<text x="${xRight + 8}" y="${chartPad.top + 9}" fill="${axisColor}" font-size="11" font-weight="800">${priceText(rawMaxH)}</text>`);
  parts.push(`<text x="${xRight + 8}" y="${yMid + 4}" fill="${axisColor}" font-size="11" font-weight="800">${priceText((rawMaxH + rawMinL) / 2)}</text>`);
  parts.push(`<text x="${xRight + 8}" y="${chartPad.top + plotH}" fill="${axisColor}" font-size="11" font-weight="800">${priceText(rawMinL)}</text>`);

  // X-axis date ticks
  const formatTick = (bar) => {
    if (!bar?.t) return "";
    const d = new Date(bar.t);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  const firstTick = formatTick(bars[0]);
  const midTick = formatTick(bars[Math.floor(bars.length / 2)]);
  const lastTick = formatTick(bars[bars.length - 1]);
  if (firstTick) parts.push(`<text x="${xLeft}" y="${height - 5}" fill="${axisColor}" font-size="11" font-weight="800">${escapeHtml(firstTick)}</text>`);
  if (midTick) parts.push(`<text x="${chartPad.left + plotW / 2}" y="${height - 5}" fill="${axisColor}" font-size="11" font-weight="800" text-anchor="middle">${escapeHtml(midTick)}</text>`);
  if (lastTick) parts.push(`<text x="${xRight}" y="${height - 5}" fill="${axisColor}" font-size="11" font-weight="800" text-anchor="end">${escapeHtml(lastTick)}</text>`);

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
}
