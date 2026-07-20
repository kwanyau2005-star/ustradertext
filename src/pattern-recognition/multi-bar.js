// src/pattern-recognition/multi-bar.js — Multi-bar chart patterns
// v26 NEW: 6 種多根型態 — Head & Shoulders, Double Top/Bottom, Triangle, Cup & Handle
//
// 全部函數回傳: { type, kind, confidence, indices:[...], label }

function isPivotHigh(bars, i, left, right) {
  if (i - left < 0 || i + right >= bars.length) return false;
  const h = bars[i].h;
  for (let j = i - left; j <= i + right; j++) {
    if (j === i) continue;
    if (bars[j].h >= h) return false;
  }
  return true;
}
function isPivotLow(bars, i, left, right) {
  if (i - left < 0 || i + right >= bars.length) return false;
  const l = bars[i].l;
  for (let j = i - left; j <= i + right; j++) {
    if (j === i) continue;
    if (bars[j].l <= l) return false;
  }
  return true;
}

/** Find local pivot highs in the series */
function findPivotHighs(bars, left = 3, right = 3) {
  const out = [];
  for (let i = left; i < bars.length - right; i++) {
    if (isPivotHigh(bars, i, left, right)) out.push({ index: i, value: bars[i].h });
  }
  return out;
}
function findPivotLows(bars, left = 3, right = 3) {
  const out = [];
  for (let i = left; i < bars.length - right; i++) {
    if (isPivotLow(bars, i, left, right)) out.push({ index: i, value: bars[i].l });
  }
  return out;
}

/** Head & Shoulders (Top) — 三高，中間最高，兩肩近似 */
export function detectHeadShoulders(bars) {
  const highs = findPivotHighs(bars, 4, 4);
  if (highs.length < 3) return null;
  // 取尾段三個 pivot highs
  for (let i = highs.length - 3; i >= 0; i--) {
    const [ls, h, rs] = [highs[i], highs[i + 1], highs[i + 2]];
    if (h.value <= ls.value || h.value <= rs.value) continue;
    const shoulderSym = Math.abs(ls.value - rs.value) / h.value;
    if (shoulderSym > 0.04) continue; // 兩肩差距 > 4% 就不算
    // 找兩個谷 (neckline)
    const neckStart = Math.min(ls.index, h.index) + 1;
    const neckEnd = Math.max(h.index, rs.index);
    let neckline = null;
    let bestNeck = null;
    for (let j = neckStart; j < neckEnd; j++) {
      if (isPivotLow(bars, j, 2, 2)) {
        if (!neckline || bars[j].l < neckline) {
          neckline = bars[j].l;
          bestNeck = j;
        }
      }
    }
    if (neckline == null) continue;
    return {
      type: "Head & Shoulders",
      kind: "bearish",
      confidence: 0.8,
      indices: [ls.index, h.index, rs.index, bestNeck],
      label: "H&S",
      neckline
    };
  }
  return null;
}

/** Inverse Head & Shoulders (Bottom) */
export function detectInverseHeadShoulders(bars) {
  const lows = findPivotLows(bars, 4, 4);
  if (lows.length < 3) return null;
  for (let i = lows.length - 3; i >= 0; i--) {
    const [ls, h, rs] = [lows[i], lows[i + 1], lows[i + 2]];
    if (h.value >= ls.value || h.value >= rs.value) continue;
    const shoulderSym = Math.abs(ls.value - rs.value) / h.value;
    if (shoulderSym > 0.04) continue;
    const neckStart = Math.min(ls.index, h.index) + 1;
    const neckEnd = Math.max(h.index, rs.index);
    let neckline = null;
    let bestNeck = null;
    for (let j = neckStart; j < neckEnd; j++) {
      if (isPivotHigh(bars, j, 2, 2)) {
        if (!neckline || bars[j].h > neckline) {
          neckline = bars[j].h;
          bestNeck = j;
        }
      }
    }
    if (neckline == null) continue;
    return {
      type: "Inverse Head & Shoulders",
      kind: "bullish",
      confidence: 0.8,
      indices: [ls.index, h.index, rs.index, bestNeck],
      label: "iH&S",
      neckline
    };
  }
  return null;
}

/** Double Top — 兩個近似高點，第二個高點後下破頸線 */
export function detectDoubleTop(bars) {
  const highs = findPivotHighs(bars, 4, 4);
  if (highs.length < 2) return null;
  for (let i = highs.length - 2; i >= 0; i--) {
    const [a, b] = [highs[i], highs[i + 1]];
    if (Math.abs(a.value - b.value) / a.value > 0.025) continue;
    // 找中間 valley
    let valley = null;
    for (let j = a.index + 1; j < b.index; j++) {
      if (!valley || bars[j].l < bars[valley].l) valley = j;
    }
    if (valley == null) continue;
    return {
      type: "Double Top",
      kind: "bearish",
      confidence: 0.75,
      indices: [a.index, valley, b.index],
      label: "DT",
      neckline: bars[valley].l
    };
  }
  return null;
}

/** Double Bottom */
export function detectDoubleBottom(bars) {
  const lows = findPivotLows(bars, 4, 4);
  if (lows.length < 2) return null;
  for (let i = lows.length - 2; i >= 0; i--) {
    const [a, b] = [lows[i], lows[i + 1]];
    if (Math.abs(a.value - b.value) / a.value > 0.025) continue;
    let peak = null;
    for (let j = a.index + 1; j < b.index; j++) {
      if (!peak || bars[j].h > bars[peak].h) peak = j;
    }
    if (peak == null) continue;
    return {
      type: "Double Bottom",
      kind: "bullish",
      confidence: 0.75,
      indices: [a.index, peak, b.index],
      label: "DB",
      neckline: bars[peak].h
    };
  }
  return null;
}

/** Ascending Triangle — 高點近似 + 低點遞增 (看尾段) */
export function detectAscendingTriangle(bars) {
  if (bars.length < 10) return null;
  const slice = bars.slice(-20);
  const highs = findPivotHighs(slice, 2, 2);
  const lows = findPivotLows(slice, 2, 2);
  if (highs.length < 2 || lows.length < 2) return null;
  const flatHigh = (highs[highs.length - 1].value - highs[0].value) / highs[0].value;
  if (Math.abs(flatHigh) > 0.02) return null;
  const risingLow = (lows[lows.length - 1].value - lows[0].value) / lows[0].value;
  if (risingLow < 0.005) return null;
  const offset = bars.length - slice.length;
  return {
    type: "Ascending Triangle",
    kind: "bullish",
    confidence: 0.7,
    indices: [
      highs[0].index + offset,
      lows[0].index + offset,
      highs[highs.length - 1].index + offset,
      lows[lows.length - 1].index + offset
    ],
    label: "AT",
    resistance: highs[highs.length - 1].value
  };
}

/** Descending Triangle — 低點近似 + 高點遞減 */
export function detectDescendingTriangle(bars) {
  if (bars.length < 10) return null;
  const slice = bars.slice(-20);
  const highs = findPivotHighs(slice, 2, 2);
  const lows = findPivotLows(slice, 2, 2);
  if (highs.length < 2 || lows.length < 2) return null;
  const flatLow = (lows[lows.length - 1].value - lows[0].value) / lows[0].value;
  if (Math.abs(flatLow) > 0.02) return null;
  const fallingHigh = (highs[highs.length - 1].value - highs[0].value) / highs[0].value;
  if (fallingHigh > -0.005) return null;
  const offset = bars.length - slice.length;
  return {
    type: "Descending Triangle",
    kind: "bearish",
    confidence: 0.7,
    indices: [
      highs[0].index + offset,
      lows[0].index + offset,
      highs[highs.length - 1].index + offset,
      lows[lows.length - 1].index + offset
    ],
    label: "DT",
    support: lows[lows.length - 1].value
  };
}

/** Cup & Handle — U 型 + 輕回調 handle (簡化版) */
export function detectCupAndHandle(bars) {
  if (bars.length < 20) return null;
  const slice = bars.slice(-30);
  const offset = bars.length - slice.length;
  const startV = slice[0].c;
  const midIdx = Math.floor(slice.length / 2);
  const midV = slice[midIdx].l;
  const endV = slice[slice.length - 1].c;
  // 1) 起點收 ≈ 終點收
  if (Math.abs(startV - endV) / startV > 0.04) return null;
  // 2) 中間是 deep low
  const dropPct = (startV - midV) / startV;
  if (dropPct < 0.06) return null;
  // 3) 後半部有小型回調 (handle)
  const handle = slice.slice(-8);
  const handleLow = Math.min(...handle.map(b => b.l));
  const handleEnd = handle[handle.length - 1].c;
  if ((endV - handleLow) / endV < 0.01) return null;
  return {
    type: "Cup & Handle",
    kind: "bullish",
    confidence: 0.65,
    indices: [0 + offset, midIdx + offset, slice.length - 1 + offset, slice.length - 8 + offset],
    label: "C&H"
  };
}

export function detectAllMultiBar(bars) {
  if (!Array.isArray(bars) || bars.length < 10) return [];
  const out = [];
  let p;
  if ((p = detectHeadShoulders(bars))) out.push(p);
  if ((p = detectInverseHeadShoulders(bars))) out.push(p);
  if ((p = detectDoubleTop(bars))) out.push(p);
  if ((p = detectDoubleBottom(bars))) out.push(p);
  if ((p = detectAscendingTriangle(bars))) out.push(p);
  if ((p = detectDescendingTriangle(bars))) out.push(p);
  if ((p = detectCupAndHandle(bars))) out.push(p);
  return out;
}
