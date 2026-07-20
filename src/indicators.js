// src/indicators.js — 技術指標全集
// v26 refactor: 從 v25 line 1048-1505 抽出所有 indicator / market regime 計算

import { avg, clamp, pct } from "./utils.js";

// === MA / SMA ===
export function calcATR(bars, period = 14) {
  if (bars.length < period + 1) return 0;
  const trs = [];
  for (let i = 1; i < bars.length; i++) {
    const cur = bars[i];
    const prev = bars[i - 1];
    const tr = Math.max(cur.h - cur.l, Math.abs(cur.h - prev.c), Math.abs(cur.l - prev.c));
    trs.push(tr);
  }
  return avg(trs.slice(-period));
}
export function sma(values, period) {
  if (values.length < period) return null;
  return avg(values.slice(-period));
}
export function calcSmaSeries(bars, period = 20) {
  const out = [];
  const closes = bars.map((b) => b.c);
  for (let i = 0; i < bars.length; i++) {
    if (i + 1 < period) out.push(null);
    else out.push(avg(closes.slice(i + 1 - period, i + 1)));
  }
  return out;
}

// === VWAP ===
export function calcVwapSeries(bars) {
  let pv = 0;
  let vol = 0;
  const out = [];
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    const v = Number(b.v || 0);
    const typical = (b.h + b.l + b.c) / 3;
    pv += typical * v;
    vol += v;
    out.push(vol > 0 ? pv / vol : null);
  }
  return out;
}
export function calcAnchoredVWAP(bars, startIndex = 0) {
  const slice = bars.slice(Math.max(0, startIndex));
  let pv = 0;
  let vol = 0;
  slice.forEach((bar) => {
    const typical = (bar.h + bar.l + bar.c) / 3;
    const size = bar.v || 0;
    pv += typical * size;
    vol += size;
  });
  return vol > 0 ? pv / vol : slice[slice.length - 1]?.c || 0;
}

// === buildIndicatorSeries (composes MA stack for chart overlays) ===
export function buildIndicatorSeries(bars) {
  // 風格參考: MA10 / MA20 / MA50 / MA200
  const series = [];
  series.push({ key: "ma10", label: "MA10", color: "#53b6ff", width: 2, values: calcSmaSeries(bars, 10) });
  series.push({ key: "ma20", label: "MA20", color: "#c565ff", width: 2, values: calcSmaSeries(bars, 20) });
  series.push({ key: "ma50", label: "MA50", color: "#57d38d", width: 2, values: calcSmaSeries(bars, 50) });
  series.push({ key: "ma200", label: "MA200", color: "#7be0e8", width: 2, values: calcSmaSeries(bars, 200) });
  return series;
}

// === Trend ===
export function calcDailyTrend(bars) {
  return calcTrendFromBars(bars, 20);
}
export function calcTrendFromBars(bars, period = 8) {
  const closes = bars.map((b) => b.c);
  const smaNow = sma(closes, period);
  const smaPrev = closes.length >= period + 1 ? avg(closes.slice(-(period + 1), -1)) : null;
  if (smaNow == null || smaPrev == null) return 0;
  const last = closes[closes.length - 1];
  const above = last > smaNow;
  const slopeUp = smaNow > smaPrev;
  if (above && slopeUp) return 2;
  if (above && !slopeUp) return 1;
  if (!above && slopeUp) return -1;
  return -2;
}
export function trendLabel(value) {
  if (value >= 2) return "強多";
  if (value === 1) return "偏多";
  if (value === -1) return "偏空";
  if (value <= -2) return "強空";
  return "中性";
}

// === Levels / Structure ===
export function calcDistToLevels(bars) {
  const last = bars[bars.length - 1];
  const window = bars.slice(-20);
  const high20 = Math.max(...window.map((b) => b.h));
  const low20 = Math.min(...window.map((b) => b.l));
  const price = last.c;
  return {
    high20,
    low20,
    distBreakout: high20 >= price ? pct(high20 - price, price) : 0,
    distBreakdown: price >= low20 ? pct(price - low20, price) : 0
  };
}
export function calcDailyStructurePack(bars) {
  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2] || null;
  if (!last || bars.length < 20) {
    return {
      ma20: null, ma50: null, ma200: null,
      ma20SlopeUp: false, ma50SlopeUp: false,
      rangePos20: 0.5, prev20High: last?.h || null, prev20Low: last?.l || null,
      breakoutClose: false, breakdownClose: false,
      stretchAtr: 0, closeVsMa20Atr: 0,
      maStackLong: false, maStackShort: false,
      insideDay: false, label: "資料不足"
    };
  }
  const ma20Series = calcSmaSeries(bars, 20);
  const ma50Series = calcSmaSeries(bars, 50);
  const ma200Series = calcSmaSeries(bars, 200);
  const ma20 = ma20Series.at(-1);
  const ma50 = ma50Series.at(-1);
  const ma200 = ma200Series.at(-1);
  const ma20Prev = ma20Series.at(-2);
  const ma50Prev = ma50Series.at(-2);
  const prev20Bars = bars.slice(-21, -1).length ? bars.slice(-21, -1) : bars.slice(-20);
  const high20 = Math.max(...bars.slice(-20).map((b) => b.h));
  const low20 = Math.min(...bars.slice(-20).map((b) => b.l));
  const prev20High = Math.max(...prev20Bars.map((b) => b.h));
  const prev20Low = Math.min(...prev20Bars.map((b) => b.l));
  const range20 = Math.max(1e-9, high20 - low20);
  const rangePos20 = clamp((last.c - low20) / range20, 0, 1);
  const atr14 = calcATR(bars, 14);
  const ref3 = bars[bars.length - 4]?.c || last.c;
  const stretchAtr = atr14 > 0 ? Math.abs(last.c - ref3) / atr14 : 0;
  const closeVsMa20Atr = (atr14 > 0 && Number.isFinite(ma20)) ? (last.c - ma20) / atr14 : 0;
  const ma20SlopeUp = Number.isFinite(ma20) && Number.isFinite(ma20Prev) ? ma20 > ma20Prev : false;
  const ma50SlopeUp = Number.isFinite(ma50) && Number.isFinite(ma50Prev) ? ma50 > ma50Prev : false;
  const maStackLong = Number.isFinite(ma20)
    && Number.isFinite(ma50)
    && last.c >= ma20
    && ma20 >= ma50
    && (!Number.isFinite(ma200) || ma50 >= ma200)
    && ma20SlopeUp;
  const maStackShort = Number.isFinite(ma20)
    && Number.isFinite(ma50)
    && last.c <= ma20
    && ma20 <= ma50
    && (!Number.isFinite(ma200) || ma50 <= ma200)
    && !ma20SlopeUp;
  const breakoutClose = last.c >= prev20High * 0.998;
  const breakdownClose = last.c <= prev20Low * 1.002;
  const insideDay = !!(prev && last.h <= prev.h && last.l >= prev.l);
  const label = maStackLong ? "日線多頭健康"
    : maStackShort ? "日線空頭健康"
    : rangePos20 >= 0.65 ? "日線偏強"
    : rangePos20 <= 0.35 ? "日線偏弱"
    : "日線中性";
  return {
    ma20, ma50, ma200,
    ma20SlopeUp, ma50SlopeUp,
    rangePos20, prev20High, prev20Low,
    breakoutClose, breakdownClose,
    stretchAtr, closeVsMa20Atr,
    maStackLong, maStackShort,
    insideDay, label
  };
}

// === Volume / RVOL ===
export function calcRVOL(bars) {
  if (bars.length < 21) return 1;
  const last = bars[bars.length - 1].v;
  const prev20 = bars.slice(-21, -1).map((b) => b.v);
  return avg(prev20) > 0 ? last / avg(prev20) : 1;
}
export function calcVolumeNode(bars, bins = 18) {
  if (!bars.length) return 0;
  const minPrice = Math.min(...bars.map((b) => b.l));
  const maxPrice = Math.max(...bars.map((b) => b.h));
  const range = Math.max(1e-9, maxPrice - minPrice);
  const volumes = Array.from({ length: bins }, () => 0);
  bars.forEach((bar) => {
    const price = (bar.h + bar.l + bar.c) / 3;
    const idx = Math.min(bins - 1, Math.max(0, Math.floor(((price - minPrice) / range) * bins)));
    volumes[idx] += bar.v || 0;
  });
  const best = volumes.reduce((acc, cur, idx) => cur > volumes[acc] ? idx : acc, 0);
  const step = range / bins;
  return minPrice + (best + 0.5) * step;
}
export function calcAvgDollarVolume(bars, period = 20) {
  if (bars.length < period) return 0;
  const slice = bars.slice(-period);
  const total = slice.reduce((s, b) => s + (b.c * (b.v || 0)), 0);
  return total / period / 1_000_000; // in millions
}
export function liquidityLabel(avgDollarVolumeM) {
  if (avgDollarVolumeM >= 200) return "超高流動";
  if (avgDollarVolumeM >= 80) return "高流動";
  if (avgDollarVolumeM >= 30) return "中高流動";
  if (avgDollarVolumeM >= 10) return "中流動";
  return "低流動";
}

// === Pivots / Structure Levels ===
export function findPivotLevels(bars, span = 2) {
  const highs = [];
  const lows = [];
  for (let i = span; i < bars.length - span; i++) {
    const cur = bars[i];
    const isHigh = bars.slice(i - span, i + span + 1).every((b, idx) => idx === span || cur.h >= b.h);
    const isLow = bars.slice(i - span, i + span + 1).every((b, idx) => idx === span || cur.l <= b.l);
    if (isHigh) highs.push({ index: i, price: cur.h, bar: cur });
    if (isLow) lows.push({ index: i, price: cur.l, bar: cur });
  }
  return { highs, lows };
}
export function calcStructureLevels(bars, hourlyBars = []) {
  if (bars.length < 12) return {};
  const last = bars[bars.length - 1];
  const prevDay = bars[bars.length - 2] || null;
  const recentBars = bars.slice(-35);
  const pivots = findPivotLevels(recentBars, 2);
  const highestBar = recentBars.reduce((best, bar, idx) => bar.h > recentBars[best].h ? idx : best, 0);
  const lowestBar = recentBars.reduce((best, bar, idx) => bar.l < recentBars[best].l ? idx : best, 0);
  const supplyBar = recentBars[highestBar];
  const demandBar = recentBars[lowestBar];
  const supplyLow = Math.min(supplyBar.o, supplyBar.c);
  const supplyHigh = supplyBar.h;
  const demandLow = demandBar.l;
  const demandHigh = Math.max(demandBar.o, demandBar.c);
  const pivotHigh = [...pivots.highs].reverse().find((p) => p.price >= last.c * 0.985)?.price || Math.max(...recentBars.map((b) => b.h));
  const pivotLow = [...pivots.lows].reverse().find((p) => p.price <= last.c * 1.015)?.price || Math.min(...recentBars.map((b) => b.l));
  const volumeNode = calcVolumeNode(recentBars);
  const sessionVWAP = calcAnchoredVWAP(hourlyBars.length ? hourlyBars.slice(-24) : recentBars, 0);
  const lastLowPivot = pivots.lows[pivots.lows.length - 1] || { index: lowestBar, price: demandLow };
  const lastHighPivot = pivots.highs[pivots.highs.length - 1] || { index: highestBar, price: supplyHigh };
  const anchorLongIdx = Math.max(0, lastLowPivot.index);
  const anchorShortIdx = Math.max(0, lastHighPivot.index);
  const anchoredVWAPLong = calcAnchoredVWAP(recentBars, anchorLongIdx);
  const anchoredVWAPShort = calcAnchoredVWAP(recentBars, anchorShortIdx);
  const longHighPivot = [...pivots.highs].reverse().find((p) => p.index > lastLowPivot.index) || { price: supplyHigh };
  const longLowPivot = [...pivots.lows].reverse().find((p) => p.index < (longHighPivot.index ?? recentBars.length)) || { price: demandLow };
  const shortLowPivot = [...pivots.lows].reverse().find((p) => p.index > lastHighPivot.index) || { price: demandLow };
  const shortHighPivot = [...pivots.highs].reverse().find((p) => p.index < (shortLowPivot.index ?? recentBars.length)) || { price: supplyHigh };
  const longRange = Math.max(1e-9, longHighPivot.price - longLowPivot.price);
  const shortRange = Math.max(1e-9, shortHighPivot.price - shortLowPivot.price);
  const todayHourly = (hourlyBars || []).slice(-8);
  const firstHour = todayHourly[0] || null;
  return {
    recentResistance: pivotHigh,
    recentSupport: pivotLow,
    prevDayHigh: prevDay?.h || null,
    prevDayLow: prevDay?.l || null,
    supplyLow,
    supplyHigh,
    demandLow,
    demandHigh,
    sessionVWAP,
    anchoredVWAPLong,
    anchoredVWAPShort,
    orbHigh: firstHour?.h || null,
    orbLow: firstHour?.l || null,
    volumeNode,
    fib127Long: longHighPivot.price + longRange * 0.272,
    fib161Long: longHighPivot.price + longRange * 0.618,
    fib127Short: shortLowPivot.price - shortRange * 0.272,
    fib161Short: shortLowPivot.price - shortRange * 0.618
  };
}

// === Returns / Relative strength ===
export function calcWeekChange(bars) {
  if (bars.length < 6) return 0;
  return pct(bars[bars.length - 1].c - bars[bars.length - 6].c, bars[bars.length - 6].c);
}
export function calcPeriodReturn(bars, period = 5) {
  if (!bars?.length) return 0;
  const last = bars[bars.length - 1]?.c;
  const prev = bars[Math.max(0, bars.length - 1 - period)]?.c;
  if (!last || !prev) return 0;
  return pct(last - prev, prev);
}
export function calcReturnsSeries(bars, maxLen = 26) {
  const slice = bars.slice(-(maxLen + 1));
  const out = [];
  for (let i = 1; i < slice.length; i++) {
    const prev = slice[i - 1]?.c;
    const cur = slice[i]?.c;
    if (!prev || !cur) continue;
    out.push(pct(cur - prev, prev));
  }
  return out.slice(-maxLen);
}
export function corr(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 8) return 0;
  const aa = a.slice(-n);
  const bb = b.slice(-n);
  const ma = avg(aa);
  const mb = avg(bb);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = aa[i] - ma;
    const xb = bb[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den > 0 ? num / den : 0;
}
export function calcRelativeStrengthMetrics(stockBars, qqqBars = [], spyBars = []) {
  const stock5 = calcPeriodReturn(stockBars, 5);
  const stock20 = calcPeriodReturn(stockBars, 20);
  const qqq5 = calcPeriodReturn(qqqBars, 5);
  const qqq20 = calcPeriodReturn(qqqBars, 20);
  const spy5 = calcPeriodReturn(spyBars, 5);
  const spy20 = calcPeriodReturn(spyBars, 20);
  const diff5 = stock5 - avg([qqq5, spy5]);
  const diff20 = stock20 - avg([qqq20, spy20]);
  const composite = diff5 * 0.45 + diff20 * 0.55;
  const label = composite >= 4 ? "明顯強過大盤"
    : composite >= 1.2 ? "略強過大盤"
    : composite <= -4 ? "明顯弱過大盤"
    : composite <= -1.2 ? "略弱過大盤"
    : "跟大盤同步";
  return {
    vsQqq5: stock5 - qqq5,
    vsSpy5: stock5 - spy5,
    vsQqq20: stock20 - qqq20,
    vsSpy20: stock20 - spy20,
    composite,
    label
  };
}
export function calcSectorProxyAndRS(stockBars, sectorBarMap) {
  const stockR = calcReturnsSeries(stockBars, 24);
  let best = { etf: "", corr: 0 };
  Object.entries(sectorBarMap || {}).forEach(([etf, bars]) => {
    const r = calcReturnsSeries(bars, 24);
    const c = corr(stockR, r);
    if (c > best.corr) best = { etf, corr: c };
  });
  const etfBars = best.etf ? sectorBarMap[best.etf] : null;
  const stock5 = calcPeriodReturn(stockBars, 5);
  const stock20 = calcPeriodReturn(stockBars, 20);
  const etf5 = etfBars ? calcPeriodReturn(etfBars, 5) : 0;
  const etf20 = etfBars ? calcPeriodReturn(etfBars, 20) : 0;
  const etfTrend = etfBars ? calcDailyTrend(etfBars) : 0;
  const composite = (stock5 - etf5) * 0.45 + (stock20 - etf20) * 0.55;
  const label = composite >= 3.5 ? "強過板塊"
    : composite >= 1 ? "略強過板塊"
    : composite <= -3.5 ? "弱過板塊"
    : composite <= -1 ? "略弱過板塊"
    : "跟板塊同步";
  return {
    sectorProxy: best.etf || "",
    sectorCorr: best.corr || 0,
    sectorTrend: etfTrend,
    sectorTrendLabel: trendLabel(etfTrend),
    sector5Change: etf5,
    sector20Change: etf20,
    sectorRsComposite: composite,
    sectorRsLabel: label
  };
}
export function calcSectorAlignment(stock, direction) {
  const proxy = stock.sectorProxy || "";
  const corrV = stock.sectorCorr || 0;
  const sectorTrend = stock.sectorTrend || 0;
  const rs = stock.sectorRsComposite || 0;
  if (!proxy) return { score: 0, label: "未找到板塊代理", confirmed: false, conflicted: false };
  if (corrV < 0.35) return { score: 0, label: `${proxy} 關聯偏低`, confirmed: false, conflicted: false };
  const confirmed = direction === "long" ? sectorTrend >= 1 : sectorTrend <= -1;
  const conflicted = direction === "long" ? sectorTrend <= -1 : sectorTrend >= 1;
  let score = 0;
  let label = `${proxy} ${stock.sectorTrendLabel || "中性"}`;
  if (confirmed) {
    score += corrV >= 0.6 ? 8 : 5;
    label = `${proxy} 同步${direction === "long" ? "偏強" : "偏弱"}`;
  } else if (conflicted) {
    score -= corrV >= 0.6 ? 14 : 9;
    label = `${proxy} 逆向${direction === "long" ? "偏空" : "偏多"}`;
  } else {
    score -= 2;
  }
  if (direction === "long" && rs <= -2) {
    score -= 4;
    label += " · 個股弱過板塊";
  } else if (direction === "short" && rs >= 2) {
    score -= 4;
    label += " · 個股強過板塊";
  }
  return { score, label, confirmed, conflicted };
}

// === Market Regime / Volatility / Day Type ===
export function calcMarketRegime(qqqDaily = [], spyDaily = [], qqqHourly = [], spyHourly = []) {
  const qqqDailyTrend = calcDailyTrend(qqqDaily);
  const spyDailyTrend = calcDailyTrend(spyDaily);
  const qqqH1Trend = calcTrendFromBars(qqqHourly, 8);
  const spyH1Trend = calcTrendFromBars(spyHourly, 8);
  const qqq5 = calcPeriodReturn(qqqDaily, 5);
  const spy5 = calcPeriodReturn(spyDaily, 5);
  const regimeRaw = qqqDailyTrend * 1.2 + spyDailyTrend * 1 + qqqH1Trend * 0.8 + spyH1Trend * 0.7 + clamp((qqq5 + spy5) / 2, -4, 4) * 0.6;
  const bias = regimeRaw >= 4 ? "偏多"
    : regimeRaw <= -4 ? "偏空"
    : "分歧";
  return {
    bias,
    score: regimeRaw,
    longBoost: regimeRaw >= 4 ? 10 : regimeRaw >= 1.5 ? 5 : regimeRaw <= -4 ? -9 : -3,
    shortBoost: regimeRaw <= -4 ? 10 : regimeRaw <= -1.5 ? 5 : regimeRaw >= 4 ? -9 : -3,
    summary: `QQQ ${trendLabel(qqqDailyTrend)}/${trendLabel(qqqH1Trend)} · SPY ${trendLabel(spyDailyTrend)}/${trendLabel(spyH1Trend)}`
  };
}
export function calcVolatilityRegime(qqqDaily = [], spyDaily = []) {
  const qqqLast = qqqDaily.at(-1);
  const spyLast = spyDaily.at(-1);
  const qqqAtr = calcATR(qqqDaily, 14);
  const spyAtr = calcATR(spyDaily, 14);
  const qqqAtrPct = qqqLast?.c ? (qqqAtr / qqqLast.c) * 100 : 0;
  const spyAtrPct = spyLast?.c ? (spyAtr / spyLast.c) * 100 : 0;
  const avgAtrPct = avg([qqqAtrPct, spyAtrPct]);
  const qqqRangePct = qqqLast?.c ? pct((qqqLast.h - qqqLast.l), qqqLast.c) : 0;
  const spyRangePct = spyLast?.c ? pct((spyLast.h - spyLast.l), spyLast.c) : 0;
  const rangePct = avg([qqqRangePct, spyRangePct]);
  if (avgAtrPct >= 2.3 || rangePct >= 2.4) {
    return { volatilityLabel: "高波動", rrFloor: 1.8, triggerFloor: 3, chaseAtrCap: 0.55, summary: `波動高（ATR ${avgAtrPct.toFixed(1)}%）` };
  }
  if (avgAtrPct <= 1.05 && rangePct <= 1.3) {
    return { volatilityLabel: "低波動", rrFloor: 1.2, triggerFloor: 2, chaseAtrCap: 0.95, summary: `波動低（ATR ${avgAtrPct.toFixed(1)}%）` };
  }
  return { volatilityLabel: "正常波動", rrFloor: 1.4, triggerFloor: 2, chaseAtrCap: 0.75, summary: `波動正常（ATR ${avgAtrPct.toFixed(1)}%）` };
}
export function calcMarketDayType(qqqDaily = [], spyDaily = [], qqqHourly = [], spyHourly = []) {
  const qqqLastDay = qqqDaily.at(-1);
  const qqqPrevDay = qqqDaily.at(-2);
  const spyLastDay = spyDaily.at(-1);
  const spyPrevDay = spyDaily.at(-2);
  const qqqGap = (qqqLastDay && qqqPrevDay?.c) ? pct((qqqLastDay.o || qqqLastDay.c) - qqqPrevDay.c, qqqPrevDay.c) : 0;
  const spyGap = (spyLastDay && spyPrevDay?.c) ? pct((spyLastDay.o || spyLastDay.c) - spyPrevDay.c, spyPrevDay.c) : 0;
  const avgGap = avg([qqqGap, spyGap]);
  const qqqIntraday = qqqHourly.length >= 2 ? pct(qqqHourly.at(-1).c - qqqHourly[0].o, qqqHourly[0].o || qqqHourly[0].c) : 0;
  const spyIntraday = spyHourly.length >= 2 ? pct(spyHourly.at(-1).c - spyHourly[0].o, spyHourly[0].o || spyHourly[0].c) : 0;
  if (Math.abs(avgGap) >= 0.8) return "高 gap 開盤";
  if (Math.abs(qqqIntraday) >= 1.2 || Math.abs(spyIntraday) >= 1.2) return "趨勢日";
  if (Math.abs(avgGap) <= 0.2 && Math.abs(qqqIntraday) <= 0.5) return "低波動日";
  return "普通日";
}

// === Entry triggers / Breakout / Gap / Volume / Cleanliness / Style ===
export function calcEntryTriggers(bars, structure = {}, direction = "long") {
  const last = bars[bars.length - 1];
  if (!last) return { triggers: 0, labels: [] };
  const range = last.h - last.l || 1e-9;
  const closeNearHigh = (last.c - last.l) / range >= 0.62;
  const closeNearLow = (last.h - last.c) / range >= 0.62;
  const atr = calcATR(bars, 14);
  const longSignals = [
    closeNearHigh && "收近高位",
    structure?.breakoutClose && "突破 20 日高",
    structure?.maStackLong && "MA 結構向上",
    atr > 0 && last.c > (structure?.sessionVWAP || 0) && "站穩 VWAP"
  ];
  const shortSignals = [
    closeNearLow && "收近低位",
    structure?.breakdownClose && "跌破 20 日低",
    structure?.maStackShort && "MA 結構向下",
    atr > 0 && last.c < (structure?.sessionVWAP || 0) && "失守 VWAP"
  ];
  const hits = (direction === "long" ? longSignals : shortSignals).filter((item) => item);
  return { triggers: hits.length, labels: hits };
}
export function calcBreakoutQuality(bars, structure = {}, direction = "long") {
  if (!bars?.length) return { score: 0, labels: [] };
  const last = bars[bars.length - 1];
  const range = last.h - last.l || 1e-9;
  const closeNearHigh = (last.c - last.l) / range >= 0.62;
  const closeNearLow = (last.h - last.c) / range >= 0.62;
  const rvol = calcRVOL(bars);
  const labels = [];
  let score = 0;
  if (direction === "long") {
    if (closeNearHigh) { score += 6; labels.push("收近高位"); }
    if (structure?.breakoutClose) { score += 8; labels.push("突破 20 日高"); }
    if (rvol >= 1.5) { score += 4; labels.push(`量能 ${rvol.toFixed(1)}x`); }
  } else {
    if (closeNearLow) { score += 6; labels.push("收近低位"); }
    if (structure?.breakdownClose) { score += 8; labels.push("跌破 20 日低"); }
    if (rvol >= 1.5) { score += 4; labels.push(`量能 ${rvol.toFixed(1)}x`); }
  }
  return { score, labels };
}
export function calcGapMetrics(bars) {
  if (bars.length < 2) return { gapPct: 0, gapDirection: "flat" };
  const last = bars[bars.length - 1];
  const prev = bars[bars.length - 2];
  const gapPct = pct((last.o || last.c) - prev.c, prev.c);
  const gapDirection = gapPct >= 0.5 ? "up" : gapPct <= -0.5 ? "down" : "flat";
  return { gapPct, gapDirection };
}
export function calcVolumeConfirmation(bars, direction = "long") {
  if (!bars?.length) return { score: 0, label: "量能資料不足" };
  const rvol = calcRVOL(bars);
  const last = bars[bars.length - 1];
  const isUpDay = last.c >= last.o;
  if (direction === "long") {
    if (rvol >= 2 && isUpDay) return { score: 8, label: `放量上漲 ${rvol.toFixed(1)}x` };
    if (rvol >= 1.4) return { score: 4, label: `量能 ${rvol.toFixed(1)}x` };
    if (rvol < 0.8) return { score: -4, label: `量縮 ${rvol.toFixed(1)}x` };
    return { score: 0, label: `量能 ${rvol.toFixed(1)}x` };
  }
  if (rvol >= 2 && !isUpDay) return { score: 8, label: `放量下跌 ${rvol.toFixed(1)}x` };
  if (rvol >= 1.4) return { score: 4, label: `量能 ${rvol.toFixed(1)}x` };
  if (rvol < 0.8) return { score: -4, label: `量縮 ${rvol.toFixed(1)}x` };
  return { score: 0, label: `量能 ${rvol.toFixed(1)}x` };
}
export function calcStructureCleanliness(setup, direction = "long") {
  const push = (value, label) => {
    if (value) { score += 4; labels.push(label); }
  };
  let score = 0;
  const labels = [];
  const structure = setup.structure || {};
  push(structure.maStackLong && direction === "long", "MA 多頭排列");
  push(structure.maStackShort && direction === "short", "MA 空頭排列");
  push(!structure.insideDay, "非 inside day");
  push(structure.rangePos20 > 0.6 && direction === "long", "區間上半部");
  push(structure.rangePos20 < 0.4 && direction === "short", "區間下半部");
  return { score, labels };
}
export function classifySetupStyle(setup, direction = "long") {
  const labels = (setup.reasons || []).map((r) => r.label || "");
  const joined = labels.join(" ");
  const atr = setup.atrDollar || 0;
  const vwap = setup.structure?.sessionVWAP;
  const vwapDistAtr = (Number.isFinite(vwap) && atr > 0) ? Math.abs(setup.price - vwap) / atr : 0;
  if (vwapDistAtr <= 0.3) return { style: "VWAP 反彈", score: 4 };
  if (/突破|breakout/i.test(joined)) return { style: "突破追擊", score: 6 };
  if (/均值回歸|reversion/i.test(joined)) return { style: "均值回歸", score: 4 };
  if (/板塊|代理/.test(joined) && direction === "long") return { style: "板塊共振", score: 5 };
  return { style: "綜合 setup", score: 2 };
}
export function calcRiskReward(entry, stop, target) {
  if (!Number.isFinite(entry) || !Number.isFinite(stop) || !Number.isFinite(target)) return 0;
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  return risk > 0 ? reward / risk : 0;
}
