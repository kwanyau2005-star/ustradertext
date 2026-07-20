// src/pattern-recognition/double.js — Two-bar candlestick patterns
// v26 NEW: 6 種雙根 K 線型態
//
// 全部函數回傳: { type, kind, confidence, indices:[i-1, i], label }

function isBull(b) { return b.c >= b.o; }
function isBear(b) { return b.c < b.o; }
function body(b) { return Math.abs(b.c - b.o); }
function range(b) { return b.h - b.l; }

/** Bullish Engulfing — 紅 K 後接更大綠 K 完全包住 */
export function detectBullishEngulfing(bars, i) {
  if (i < 1) return null;
  const prev = bars[i - 1], cur = bars[i];
  if (!isBear(prev) || !isBull(cur)) return null;
  if (cur.o > prev.c || cur.c < prev.o) return null; // 必須包住
  if (body(cur) < body(prev) * 1.05) return null;     // 實體要明顯更大
  if (range(cur) < range(prev) * 0.8) return null;    // 波幅要更大
  return { type: "Bullish Engulfing", kind: "bullish", confidence: 0.9, indices: [i - 1, i], label: "BE" };
}

/** Bearish Engulfing — 綠 K 後接更大紅 K 完全包住 */
export function detectBearishEngulfing(bars, i) {
  if (i < 1) return null;
  const prev = bars[i - 1], cur = bars[i];
  if (!isBull(prev) || !isBear(cur)) return null;
  if (cur.o < prev.c || cur.c > prev.o) return null;
  if (body(cur) < body(prev) * 1.05) return null;
  if (range(cur) < range(prev) * 0.8) return null;
  return { type: "Bearish Engulfing", kind: "bearish", confidence: 0.9, indices: [i - 1, i], label: "bE" };
}

/** Tweezer Bottom — 兩根近似 low 的 K，第二根收高 */
export function detectTweezerBottom(bars, i) {
  if (i < 1) return null;
  const prev = bars[i - 1], cur = bars[i];
  if (Math.abs(prev.l - cur.l) / Math.max(prev.l, 1e-9) > 0.002) return null; // lows 接近
  if (!isBear(prev) || !isBull(cur)) return null;
  if (cur.c <= prev.c) return null;
  return { type: "Tweezer Bottom", kind: "bullish", confidence: 0.8, indices: [i - 1, i], label: "TB" };
}

/** Tweezer Top — 兩根近似 high 的 K，第二根收低 */
export function detectTweezerTop(bars, i) {
  if (i < 1) return null;
  const prev = bars[i - 1], cur = bars[i];
  if (Math.abs(prev.h - cur.h) / Math.max(prev.h, 1e-9) > 0.002) return null;
  if (!isBull(prev) || !isBear(cur)) return null;
  if (cur.c >= prev.c) return null;
  return { type: "Tweezer Top", kind: "bearish", confidence: 0.8, indices: [i - 1, i], label: "TT" };
}

/** Piercing Line — 紅 K 後綠 K 收在紅 K 中點以上 */
export function detectPiercingLine(bars, i) {
  if (i < 1) return null;
  const prev = bars[i - 1], cur = bars[i];
  if (!isBear(prev) || !isBull(cur)) return null;
  if (cur.o >= prev.l || cur.c <= prev.o) return null;     // 開要低於前低
  const mid = (prev.o + prev.c) / 2;
  if (cur.c < mid || cur.c >= prev.o) return null;          // 收要 > 中點但 < 前開
  return { type: "Piercing Line", kind: "bullish", confidence: 0.85, indices: [i - 1, i], label: "PL" };
}

/** Dark Cloud Cover — 綠 K 後紅 K 開高收低深入綠 K 中點 */
export function detectDarkCloudCover(bars, i) {
  if (i < 1) return null;
  const prev = bars[i - 1], cur = bars[i];
  if (!isBull(prev) || !isBear(cur)) return null;
  if (cur.o <= prev.h || cur.c >= prev.o) return null;
  const mid = (prev.o + prev.c) / 2;
  if (cur.c > mid || cur.c <= prev.c) return null;
  return { type: "Dark Cloud Cover", kind: "bearish", confidence: 0.85, indices: [i - 1, i], label: "DC" };
}

export function detectAllDouble(bars) {
  if (!Array.isArray(bars) || bars.length < 2) return [];
  const out = [];
  for (let i = 1; i < bars.length; i++) {
    let p;
    if ((p = detectBullishEngulfing(bars, i))) out.push(p);
    else if ((p = detectBearishEngulfing(bars, i))) out.push(p);
    else if ((p = detectTweezerBottom(bars, i))) out.push(p);
    else if ((p = detectTweezerTop(bars, i))) out.push(p);
    else if ((p = detectPiercingLine(bars, i))) out.push(p);
    else if ((p = detectDarkCloudCover(bars, i))) out.push(p);
  }
  return out;
}
