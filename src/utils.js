// src/utils.js — 純函數工具
// v26 refactor: 所有無副作用嘅 utility 都集中喺度

// === math ===
export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function avg(arr) { return arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : 0; }
export function pct(a, b) { return b !== 0 ? (a / b) * 100 : 0; }
export function corr(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const ma = avg(a.slice(0, n));
  const mb = avg(b.slice(0, n));
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma;
    const xb = b[i] - mb;
    num += xa * xb;
    da += xa * xa;
    db += xb * xb;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : num / den;
}

// === format ===
export function formatPrice(v) { return Number(v).toFixed(2); }
export function nowTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
export function toDateStr(d) { return d.toISOString().slice(0, 10); }
export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let idx = 0;
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024;
    idx++;
  }
  return `${v.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
}
export function ymdCompact(d) {
  const dt = d instanceof Date ? d : new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
export function ymdCompactUtc(input) {
  const dt = input instanceof Date ? input : new Date(input);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
export function barTradingDayKey(bar) {
  if (!bar) return "";
  if (bar.dayKey) return String(bar.dayKey);
  if (bar.t) return ymdCompactUtc(bar.t);
  return "";
}
export function formatNewsDateTime(date) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function parseArticleTimestamp(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  const t = Date.parse(String(value));
  return Number.isFinite(t) ? t : 0;
}
export function formatHistoryTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function formatNewsDateKey(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function formatNewsTime(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export function shortText(text, maxLen = 120) {
  if (!text) return "";
  const t = String(text).trim();
  return t.length > maxLen ? `${t.slice(0, maxLen - 1)}…` : t;
}
export function formatPerfSummary(summary) {
  if (!summary) return "—";
  return `D1 ${summary.perf1d?.toFixed(1) ?? "—"}% · D3 ${summary.perf3d?.toFixed(1) ?? "—"}% · D5 ${summary.perf5d?.toFixed(1) ?? "—"}%`;
}

// === array / aggregate ===
export function uniq(arr) { return [...new Set(arr)]; }
export function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
export function parseTickers(text) {
  return uniq(
    text
      .replace(/\r/g, "\n")
      .split(/[\s,\n,]+/g)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  );
}
export function aggregateBars(bars, chunkSize = 4) {
  if (!Array.isArray(bars) || bars.length === 0) return [];
  const out = [];
  for (let i = 0; i < bars.length; i += chunkSize) {
    const chunk = bars.slice(i, i + chunkSize);
    if (!chunk.length) continue;
    const o = chunk[0].o;
    const c = chunk[chunk.length - 1].c;
    const h = Math.max(...chunk.map((b) => b.h));
    const l = Math.min(...chunk.map((b) => b.l));
    const v = chunk.reduce((s, b) => s + (b.v || 0), 0);
    const t = chunk[chunk.length - 1].t;
    out.push({ t, o, h, l, c, v });
  }
  return out;
}
export function dedupeBarsByTradingDay(bars) {
  if (!Array.isArray(bars)) return [];
  const map = new Map();
  for (const b of bars) {
    const k = barTradingDayKey(b);
    if (!k) continue;
    map.set(k, b);
  }
  return Array.from(map.values()).sort((a, b) => (a.t || 0) - (b.t || 0));
}

// === error / parse / sanitize ===
export function isAuthLikeError(err) {
  const msg = String(err?.message || err || "");
  return /invalid session token|invalid api key|unauthorized|forbidden|\b401\b|\b403\b/i.test(msg);
}
export function isUnauthorizedError(error) {
  return isAuthLikeError(error);
}
export function normalizeName(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff ]/g, " ").replace(/\s+/g, " ").trim();
}
export function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// === lookup ===
export function getUsSymbolSet() {
  return new Set([
    "AAPL","MSFT","NVDA","AMZN","META","GOOGL","GOOG","TSLA","AVGO","NFLX","AMD","PLTR","MU","TSM","ASML","ARM",
    "JPM","BAC","GS","MS","C","WFC","XOM","CVX","UNH","LLY","COST","WMT","ORCL","CRM","QCOM",
    "DIS","NKE","COIN","SMCI","BABA","BIDU","PDD","UBER","LYFT","SHOP","ADBE"
  ]);
}
export function getWatchlistSymbolSet() {
  const raw = (typeof window !== "undefined" && window.localStorage) ? (localStorage.getItem("dashboardWatchlist") || "") : "";
  return new Set(parseTickers(raw));
}
export function findScanItem(symbol, dataset = []) {
  return dataset.find((it) => it.symbol === symbol) || null;
}

// === links ===
export function buildExternalLinks(symbol) {
  const s = encodeURIComponent(symbol);
  return {
    finviz: `https://finviz.com/quote.ashx?t=${s}`,
    yahoo: `https://finance.yahoo.com/quote/${s}`,
    tradingview: `https://www.tradingview.com/chart/?symbol=${s}`,
    sec: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${s}&type=10-K&dateb=&owner=include&count=40`
  };
}
