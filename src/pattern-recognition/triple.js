// src/pattern-recognition/triple.js — Three-bar candlestick patterns
// v26 NEW: 4 種三根 K 線型態
//
// 全部函數回傳: { type, kind, confidence, indices:[i-2, i-1, i], label }

function isBull(b) { return b.c >= b.o; }
function isBear(b) { return b.c < b.o; }
function body(b) { return Math.abs(b.c - b.o); }
function mid(b) { return (b.o + b.c) / 2; }

/** Morning Star — 紅 K + 小實體 + 綠 K 收在紅 K 中點以上 */
export function detectMorningStar(bars, i) {
  if (i < 2) return null;
  const a = bars[i - 2], b = bars[i - 1], c = bars[i];
  if (!isBear(a) || !isBull(c)) return null;
  // 中間那根要小實體 (doji 級或更低)
  if (body(b) > body(a) * 0.5) return null;
  // 第三根要收在第一根中點以上
  if (c.c <= mid(a)) return null;
  // 開盤要 gap down (or close to b.l)
  if (c.o > b.c) return null;
  return { type: "Morning Star", kind: "bullish", confidence: 0.9, indices: [i - 2, i - 1, i], label: "MS" };
}

/** Evening Star — 綠 K + 小實體 + 紅 K 收在綠 K 中點以下 */
export function detectEveningStar(bars, i) {
  if (i < 2) return null;
  const a = bars[i - 2], b = bars[i - 1], c = bars[i];
  if (!isBull(a) || !isBear(c)) return null;
  if (body(b) > body(a) * 0.5) return null;
  if (c.c >= mid(a)) return null;
  if (c.o < b.c) return null;
  return { type: "Evening Star", kind: "bearish", confidence: 0.9, indices: [i - 2, i - 1, i], label: "ES" };
}

/** Three White Soldiers — 三連陽，每根收更高開更高 */
export function detectThreeWhiteSoldiers(bars, i) {
  if (i < 2) return null;
  const a = bars[i - 2], b = bars[i - 1], c = bars[i];
  if (![a, b, c].every(isBull)) return null;
  if (!(c.c > b.c && b.c > a.c)) return null;     // 收盤遞增
  if (!(c.o > b.o && b.o > a.o)) return null;     // 開盤遞增
  if (body(c) < body(a) * 0.4) return null;       // 第三根不能太小
  // 開盤要在前根實體內
  if (c.o < b.o || c.o > b.c) return null;
  return { type: "Three White Soldiers", kind: "bullish", confidence: 0.9, indices: [i - 2, i - 1, i], label: "3WS" };
}

/** Three Black Crows — 三連陰，每根收更低開更低 */
export function detectThreeBlackCrows(bars, i) {
  if (i < 2) return null;
  const a = bars[i - 2], b = bars[i - 1], c = bars[i];
  if (![a, b, c].every(isBear)) return null;
  if (!(c.c < b.c && b.c < a.c)) return null;
  if (!(c.o < b.o && b.o < a.o)) return null;
  if (body(c) < body(a) * 0.4) return null;
  if (c.o > b.o || c.o < b.c) return null;
  return { type: "Three Black Crows", kind: "bearish", confidence: 0.9, indices: [i - 2, i - 1, i], label: "3BC" };
}

export function detectAllTriple(bars) {
  if (!Array.isArray(bars) || bars.length < 3) return [];
  const out = [];
  for (let i = 2; i < bars.length; i++) {
    let p;
    if ((p = detectMorningStar(bars, i))) out.push(p);
    else if ((p = detectEveningStar(bars, i))) out.push(p);
    else if ((p = detectThreeWhiteSoldiers(bars, i))) out.push(p);
    else if ((p = detectThreeBlackCrows(bars, i))) out.push(p);
  }
  return out;
}
