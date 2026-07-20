// src/pattern-recognition/markers.js — Convert patterns to chart markers
// v26 NEW: 把 pattern-recognition 結果轉成 chart/svg.js + chart/canvas.js 用的 markers 格式
//
// markers 格式: { index, kind, label?, color? }

import { detectAllSingle } from "./single.js";
import { detectAllDouble } from "./double.js";
import { detectAllTriple } from "./triple.js";
import { detectAllMultiBar } from "./multi-bar.js";

/**
 * Compute bar-level trend (used as context for some pattern detectors).
 * Simple slope: compare first half avg to second half avg.
 */
function inferTrend(bars) {
  if (!Array.isArray(bars) || bars.length < 8) return null;
  const half = Math.floor(bars.length / 2);
  const first = bars.slice(0, half);
  const second = bars.slice(half);
  const avg = (arr) => arr.reduce((s, b) => s + b.c, 0) / arr.length;
  const a1 = avg(first);
  const a2 = avg(second);
  const diff = (a2 - a1) / a1;
  if (diff > 0.02) return "up";
  if (diff < -0.02) return "down";
  return null;
}

/**
 * Master entry: scan all patterns in a bar series and convert to chart markers.
 * Returns { patterns, markers }
 *   patterns: raw detection results
 *   markers: chart-ready array
 */
export function scanPatterns(bars, opts = {}) {
  if (!Array.isArray(bars) || bars.length < 5) {
    return { patterns: [], markers: [] };
  }
  const trend = opts.trend ?? inferTrend(bars);
  const includeMulti = opts.includeMulti !== false;

  const singles = detectAllSingle(bars, { trend });
  const doubles = detectAllDouble(bars);
  const triples = detectAllTriple(bars);
  const multi = includeMulti ? detectAllMultiBar(bars) : [];
  const patterns = [...singles, ...doubles, ...triples, ...multi];

  // Deduplicate: prefer higher confidence
  patterns.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  const seenKey = new Set();
  const dedup = [];
  for (const p of patterns) {
    const key = p.indices.slice().sort((a, b) => a - b).join(",") + "|" + p.type;
    if (seenKey.has(key)) continue;
    seenKey.add(key);
    dedup.push(p);
  }

  // Convert to markers
  const markers = dedup.flatMap(p => patternToMarkers(p, bars.length));
  return { patterns: dedup, markers, trend };
}

function patternToMarkers(p, totalBars) {
  const kindStr = p.kind;
  // Multi-bar patterns with line support: draw trend line + label the last index
  if (p.indices.length >= 2 && (
    p.type === "Head & Shoulders" ||
    p.type === "Inverse Head & Shoulders" ||
    p.type === "Double Top" ||
    p.type === "Double Bottom" ||
    p.type === "Ascending Triangle" ||
    p.type === "Descending Triangle" ||
    p.type === "Cup & Handle"
  )) {
    // 用 key pivot indices 標點，最後一個用 label
    const points = p.indices.filter(i => i >= 0 && i < totalBars);
    if (points.length === 0) return [];
    return [
      ...points.slice(0, -1).map(i => ({
        index: i,
        kind: kindStr === "bullish" ? "dot-up" : kindStr === "bearish" ? "dot-down" : "neutral",
        color: kindStr === "bullish" ? "#22c55e" : kindStr === "bearish" ? "#ef4444" : "rgba(192,132,252,.95)"
      })),
      {
        index: points[points.length - 1],
        kind: kindStr === "bullish" ? "bullish" : kindStr === "bearish" ? "bearish" : "neutral",
        label: p.label,
        color: kindStr === "bullish" ? "#22c55e" : kindStr === "bearish" ? "#ef4444" : "rgba(192,132,252,.95)"
      }
    ];
  }
  // Single, double, triple: 標最後那根 + label
  const lastIdx = p.indices[p.indices.length - 1];
  if (lastIdx == null) return [];
  return [{
    index: lastIdx,
    kind: kindStr,
    label: p.label,
    color: kindStr === "bullish" ? "#22c55e" : kindStr === "bearish" ? "#ef4444" : "rgba(192,132,252,.95)"
  }];
}

/**
 * Convert patterns to human-readable chip list (for UI display).
 */
export function patternsToChips(patterns) {
  if (!Array.isArray(patterns) || patterns.length === 0) return [];
  return patterns.map(p => ({
    label: p.type,
    short: p.label,
    kind: p.kind,
    confidence: p.confidence,
    indices: p.indices
  }));
}
