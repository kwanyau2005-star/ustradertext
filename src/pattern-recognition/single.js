// src/pattern-recognition/single.js — Single-bar candlestick patterns
// v26 NEW: 自動識別 + 標註 6 種單根 K 線型態
//
// 全部函數回傳: { type, kind, confidence, indices:[i], label }
//   kind: "bullish" | "bearish" | "neutral"

const MIN_BODY_PCT = 0.0005; // 0.05% of price — 太小當做無變化
const DOJI_BODY_PCT = 0.001; // < 0.1% body → doji

function candleStats(b) {
  const range = b.h - b.l;
  const body = Math.abs(b.c - b.o);
  const upperWick = b.h - Math.max(b.o, b.c);
  const lowerWick = Math.min(b.o, b.c) - b.l;
  const bodyPct = range > 0 ? body / range : 0;
  const upperPct = range > 0 ? upperWick / range : 0;
  const lowerPct = range > 0 ? lowerWick / range : 0;
  const priceRef = Math.max(1e-9, b.c);
  const rangePct = range / priceRef;
  return { range, body, bodyPct, upperPct, lowerPct, rangePct, isUp: b.c >= b.o };
}

/** Hammer — long lower wick, small body at top, bullish reversal */
export function detectHammer(bars, i) {
  const s = candleStats(bars[i]);
  if (s.rangePct < MIN_BODY_PCT) return null;
  if (s.lowerPct < 0.55) return null;       // 下影線要 > 55%
  if (s.bodyPct > 0.4) return null;          // 實體要 < 40%
  if (s.upperPct > 0.15) return null;        // 上影線要短
  return { type: "Hammer", kind: "bullish", confidence: 0.85, indices: [i], label: "H" };
}

/** Inverted Hammer — long upper wick, small body at bottom, bullish reversal */
export function detectInvertedHammer(bars, i) {
  const s = candleStats(bars[i]);
  if (s.rangePct < MIN_BODY_PCT) return null;
  if (s.upperPct < 0.55) return null;
  if (s.bodyPct > 0.4) return null;
  if (s.lowerPct > 0.15) return null;
  return { type: "Inverted Hammer", kind: "bullish", confidence: 0.8, indices: [i], label: "IH" };
}

/** Shooting Star — long upper wick, small body at bottom, bearish reversal */
export function detectShootingStar(bars, i) {
  const s = candleStats(bars[i]);
  if (s.rangePct < MIN_BODY_PCT) return null;
  if (s.upperPct < 0.55) return null;
  if (s.bodyPct > 0.4) return null;
  if (s.lowerPct > 0.15) return null;
  // 同 IH 形狀，但辨識環境需為上升趨勢，由上層做 context 判斷
  return { type: "Shooting Star", kind: "bearish", confidence: 0.85, indices: [i], label: "SS" };
}

/** Doji — open ≈ close */
export function detectDoji(bars, i) {
  const s = candleStats(bars[i]);
  if (s.bodyPct > DOJI_BODY_PCT) return null;
  if (s.rangePct < MIN_BODY_PCT) return null;
  return { type: "Doji", kind: "neutral", confidence: 0.95, indices: [i], label: "D" };
}

/** Marubozu (Bullish) — 全實體，無上下影線 */
export function detectBullishMarubozu(bars, i) {
  const s = candleStats(bars[i]);
  if (s.rangePct < MIN_BODY_PCT) return null;
  if (s.bodyPct < 0.95) return null;
  if (s.upperPct > 0.02) return null;
  if (s.lowerPct > 0.02) return null;
  if (!s.isUp) return null;
  return { type: "Bullish Marubozu", kind: "bullish", confidence: 0.9, indices: [i], label: "BM" };
}

/** Marubozu (Bearish) */
export function detectBearishMarubozu(bars, i) {
  const s = candleStats(bars[i]);
  if (s.rangePct < MIN_BODY_PCT) return null;
  if (s.bodyPct < 0.95) return null;
  if (s.upperPct > 0.02) return null;
  if (s.lowerPct > 0.02) return null;
  if (s.isUp) return null;
  return { type: "Bearish Marubozu", kind: "bearish", confidence: 0.9, indices: [i], label: "bM" };
}

/** Spinning Top — small body in middle, similar wicks */
export function detectSpinningTop(bars, i) {
  const s = candleStats(bars[i]);
  if (s.rangePct < MIN_BODY_PCT) return null;
  if (s.bodyPct > 0.35 || s.bodyPct < 0.1) return null;
  if (Math.abs(s.upperPct - s.lowerPct) > 0.3) return null;
  if (s.upperPct < 0.2) return null;
  return { type: "Spinning Top", kind: "neutral", confidence: 0.7, indices: [i], label: "ST" };
}

/**
 * Run all single-bar detectors on every bar.
 */
export function detectAllSingle(bars, opts = {}) {
  if (!Array.isArray(bars) || bars.length === 0) return [];
  const ctxTrend = opts.trend; // "up" | "down" | null — 提供 context 給 SS / IH 判斷
  const out = [];
  for (let i = 0; i < bars.length; i++) {
    let p;
    // SS 需要在上升趨勢才有反轉意義
    if ((p = detectHammer(bars, i))) out.push(p);
    else if ((p = detectInvertedHammer(bars, i)) && (!ctxTrend || ctxTrend === "down")) out.push(p);
    else if ((p = detectShootingStar(bars, i)) && (!ctxTrend || ctxTrend === "up")) out.push(p);
    else if ((p = detectDoji(bars, i))) out.push(p);
    else if ((p = detectBullishMarubozu(bars, i))) out.push(p);
    else if ((p = detectBearishMarubozu(bars, i))) out.push(p);
    else if ((p = detectSpinningTop(bars, i))) out.push(p);
  }
  return out;
}
