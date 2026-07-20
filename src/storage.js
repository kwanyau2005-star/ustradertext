// src/storage.js — localStorage / sessionStorage 管理
// v26 refactor: keys + runtime settings + history + news ui settings

import { el, state, constants } from "./dom.js";

const { deploymentMode, defaultApiKeys, priceProviderVersionKey, priceProviderVersionValue, runtimeSettingsKey } = constants;

// === bandwidth tracking (for status bar) ===
export function addRunBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return;
  state.currentRunBytes += bytes;
  if (el.statBandwidth) el.statBandwidth.textContent = formatBytes(state.currentRunBytes);
}
function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B","KB","MB","GB"];
  let v = bytes;
  let idx = 0;
  while (v >= 1024 && idx < units.length - 1) { v /= 1024; idx++; }
  return `${v.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
}

// === runtime settings ===
export function loadRuntimeSettings() {
  try {
    const raw = localStorage.getItem(runtimeSettingsKey);
    if (!raw) return;
    const cfg = JSON.parse(raw);
    if (cfg.dataMode && el.dataMode) el.dataMode.value = cfg.dataMode;
    if (cfg.includeBenchmarks && el.includeBenchmarks) el.includeBenchmarks.value = cfg.includeBenchmarks;
    if (Number.isFinite(cfg.maxTickersPerRun) && el.maxTickersPerRun) el.maxTickersPerRun.value = String(cfg.maxTickersPerRun);
  } catch {}
}
export function saveRuntimeSettings() {
  const cfg = {
    dataMode: el.dataMode?.value || "standard",
    includeBenchmarks: el.includeBenchmarks?.value || "on",
    maxTickersPerRun: Number(el.maxTickersPerRun?.value) || 0
  };
  localStorage.setItem(runtimeSettingsKey, JSON.stringify(cfg));
}

// === API keys ===
export function importKeysFromUrlOnce() {
  const hash = String(location.hash || "").replace(/^#/, "");
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  const pk = params.get("pk");
  const fh = params.get("fh");
  const mrt = params.get("mrt");
  const mdy = params.get("mdy");
  let changed = false;
  if (!deploymentMode.isManagedPolygonProxy && pk && String(pk).trim().length >= 8) {
    const v = String(pk).trim();
    localStorage.setItem("dashboardPolygonKey", v);
    el.polygonKey.value = v;
    changed = true;
  }
  if (fh && String(fh).trim().length >= 8) {
    const v = String(fh).trim();
    localStorage.setItem("dashboardFinnhubKey", v);
    el.finnhubKey.value = v;
    changed = true;
  }
  if (mrt && String(mrt).trim().length >= 8) {
    const v = String(mrt).trim();
    localStorage.setItem("dashboardMinishareRtUsKey", v);
    el.minishareRtUsKey.value = v;
    changed = true;
  }
  if (mdy && String(mdy).trim().length >= 8) {
    const v = String(mdy).trim();
    localStorage.setItem("dashboardMinishareUsDailyKey", v);
    el.minishareUsDailyKey.value = v;
    changed = true;
  }
  if (changed) history.replaceState(null, "", location.pathname + location.search);
  return changed;
}
export function saveKeys() {
  if (!deploymentMode.isManagedPolygonProxy) {
    localStorage.setItem("dashboardPolygonKey", el.polygonKey.value.trim());
  }
  localStorage.setItem("dashboardFinnhubKey", el.finnhubKey.value.trim());
  localStorage.setItem("dashboardMinishareRtUsKey", el.minishareRtUsKey.value.trim());
  localStorage.setItem("dashboardMinishareUsDailyKey", el.minishareUsDailyKey.value.trim());
  applyKeyUiState();
  el.statusHint.textContent = deploymentMode.isManagedPolygonProxy
    ? "Render 模式：Massive key 由伺服器管理；本機保存 minishare 新聞 / 美股即時 / 美股日線授權碼。"
    : "Keys 已永久儲存到本機瀏覽器。";
}
export function loadKeys() {
  const localPolygon = localStorage.getItem("dashboardPolygonKey");
  const localFinnhub = localStorage.getItem("dashboardFinnhubKey");
  const localMinishareRtUs = localStorage.getItem("dashboardMinishareRtUsKey");
  const localMinishareUsDaily = localStorage.getItem("dashboardMinishareUsDailyKey");
  const sessionPolygon = sessionStorage.getItem("dashboardPolygonKey");
  const sessionFinnhub = sessionStorage.getItem("dashboardFinnhubKey");
  const sessionMinishareRtUs = sessionStorage.getItem("dashboardMinishareRtUsKey");
  const sessionMinishareUsDaily = sessionStorage.getItem("dashboardMinishareUsDailyKey");
  const localProviderVersion = localStorage.getItem(priceProviderVersionKey);
  const shouldMigratePolygonKey = localProviderVersion !== priceProviderVersionValue;
  const imported = importKeysFromUrlOnce();
  const p = deploymentMode.isManagedPolygonProxy
    ? ""
    : (shouldMigratePolygonKey ? defaultApiKeys.polygon : (localPolygon || sessionPolygon || defaultApiKeys.polygon));
  const f = localFinnhub || sessionFinnhub || defaultApiKeys.finnhub;
  const rt = localMinishareRtUs || sessionMinishareRtUs || defaultApiKeys.minishareRtUs;
  const dy = localMinishareUsDaily || sessionMinishareUsDaily || defaultApiKeys.minishareUsDaily;
  if (p) {
    el.polygonKey.value = p;
    localStorage.setItem("dashboardPolygonKey", p);
    localStorage.setItem(priceProviderVersionKey, priceProviderVersionValue);
  }
  if (f) { el.finnhubKey.value = f; localStorage.setItem("dashboardFinnhubKey", f); }
  if (rt) { el.minishareRtUsKey.value = rt; localStorage.setItem("dashboardMinishareRtUsKey", rt); }
  if (dy) { el.minishareUsDailyKey.value = dy; localStorage.setItem("dashboardMinishareUsDailyKey", dy); }
  if (sessionPolygon) sessionStorage.removeItem("dashboardPolygonKey");
  if (sessionFinnhub) sessionStorage.removeItem("dashboardFinnhubKey");
  if (sessionMinishareRtUs) sessionStorage.removeItem("dashboardMinishareRtUsKey");
  if (sessionMinishareUsDaily) sessionStorage.removeItem("dashboardMinishareUsDailyKey");
  applyKeyUiState();
  if (imported) el.statusHint.textContent = "已由網址導入並永久保存 key。";
}
export function clearKeys() {
  if (!deploymentMode.isManagedPolygonProxy) localStorage.removeItem("dashboardPolygonKey");
  localStorage.removeItem("dashboardFinnhubKey");
  localStorage.removeItem("dashboardMinishareRtUsKey");
  localStorage.removeItem("dashboardMinishareUsDailyKey");
  localStorage.removeItem(priceProviderVersionKey);
  if (!deploymentMode.isManagedPolygonProxy) sessionStorage.removeItem("dashboardPolygonKey");
  sessionStorage.removeItem("dashboardFinnhubKey");
  sessionStorage.removeItem("dashboardMinishareRtUsKey");
  sessionStorage.removeItem("dashboardMinishareUsDailyKey");
  if (!deploymentMode.isManagedPolygonProxy) el.polygonKey.value = "";
  el.finnhubKey.value = "";
  el.minishareRtUsKey.value = "";
  el.minishareUsDailyKey.value = "";
  applyKeyUiState();
  el.statusHint.textContent = deploymentMode.isManagedPolygonProxy
    ? "已清除本機 minishare 授權碼（新聞 / 美股即時 / 美股日線）。Massive key 由伺服器端管理。"
    : "本機已清除已保存 Keys。";
}
export function hasSavedPolygonKey() {
  if (deploymentMode.isManagedPolygonProxy) return true;
  return !!String(localStorage.getItem("dashboardPolygonKey") || el.polygonKey.value || "").trim();
}
export function applyKeyUiState() {
  const saved = hasSavedPolygonKey();
  if (deploymentMode.isManagedPolygonProxy) {
    if (el.changePolygonKeyBtn) el.changePolygonKeyBtn.style.display = "none";
    if (el.modalSectionKeys) el.modalSectionKeys.style.display = "block";
    const polygonBox = el.polygonKey?.closest?.("div");
    if (polygonBox) polygonBox.style.display = "none";
    if (el.modalIntro) {
      el.modalIntro.textContent = "Render / 伺服器代理模式：Massive / Polygon key 由伺服器端管理；你仍然可以喺呢度填 minishare 新聞 / 美股即時 / 美股日線授權碼。";
    }
    return;
  }
  const polygonBox = el.polygonKey?.closest?.("div");
  if (polygonBox) polygonBox.style.display = "block";
  if (el.modalSectionKeys) el.modalSectionKeys.style.display = saved ? "none" : "block";
  if (saved) {
    if (el.modalTitle?.textContent === "Keys（本機永久保存）") {
      try { document.getElementById("settingsModal")?.classList.remove("show"); } catch {}
    }
    el.modalIntro.textContent = "已自動使用本機永久保存 key，一般情況唔使再手動填。";
  }
}
export async function promptAndSaveKey(kind) {
  if (kind === "polygon" && deploymentMode.isManagedPolygonProxy) {
    el.statusHint.textContent = "伺服器代理模式：Massive / Polygon key 唔喺前端改，請去 Render 設定環境變數。";
    return;
  }
  const title = kind === "polygon" ? "貼入 Massive / Polygon 代理 Key" : "貼入 minishare 授權碼";
  const example = kind === "polygon" ? "例如：RES-XXXX-XXXX..." : "例如：K48p6c7MmD......";
  const current = kind === "polygon"
    ? (localStorage.getItem("dashboardPolygonKey") || "")
    : (localStorage.getItem("dashboardFinnhubKey") || "");
  const value = window.prompt(`${title}\n\n${example}\n\n(會永久保存到本機 localStorage)`, current ? "（已保存，重新貼入覆蓋）" : "");
  if (value == null) return;
  const trimmed = String(value).trim();
  if (!trimmed) {
    el.statusHint.textContent = "你未貼入 key，所以未更改。";
    return;
  }
  if (kind === "polygon") localStorage.setItem("dashboardPolygonKey", trimmed);
  else localStorage.setItem("dashboardFinnhubKey", trimmed);
  if (kind === "polygon") el.polygonKey.value = trimmed;
  else el.finnhubKey.value = trimmed;
  applyKeyUiState();
  el.statusHint.textContent = "已保存 key。下次打開自動載入。";
}

// === auth codes for minishare (re-export) ===
export function getNewsAuthCode() { return el.finnhubKey?.value?.trim() || defaultApiKeys.finnhub; }
export function getUsRealtimeAuthCode() { return el.minishareRtUsKey?.value?.trim() || defaultApiKeys.minishareRtUs; }
export function getUsDailyAuthCode() { return el.minishareUsDailyKey?.value?.trim() || defaultApiKeys.minishareUsDaily; }

// === scan history / followup ===
export function loadScanHistory() {
  try {
    const raw = localStorage.getItem(constants.scanHistoryKey);
    state.latestScanHistory = raw ? JSON.parse(raw) : [];
  } catch { state.latestScanHistory = []; }
}
export function saveScanHistory(snapshot) {
  const arr = [snapshot, ...(state.latestScanHistory || [])].slice(0, 20);
  state.latestScanHistory = arr;
  try { localStorage.setItem(constants.scanHistoryKey, JSON.stringify(arr)); } catch {}
}
export function loadFollowupHistory() {
  try {
    const raw = localStorage.getItem(constants.followupHistoryKey);
    state.latestFollowupHistory = raw ? JSON.parse(raw) : [];
  } catch { state.latestFollowupHistory = []; }
}
export function saveFollowupHistory(history) {
  state.latestFollowupHistory = history;
  try { localStorage.setItem(constants.followupHistoryKey, JSON.stringify(history)); } catch {}
}
export function updateFollowupHistory(history, priceMap) {
  const now = Date.now();
  return history.map((item) => {
    if (item.d5 != null) return item;
    const px = priceMap?.[item.symbol];
    if (!Number.isFinite(px) || !Number.isFinite(item.price)) return item;
    const ageDays = (now - new Date(item.createdAt).getTime()) / (24 * 3600 * 1000);
    if (ageDays < 1) return item;
    const d = (px - item.price) / item.price * 100;
    const hit = item.direction === "long" ? d >= 0 : d <= 0;
    return { ...item, d1: d, d3: d, d5: d, hit, finalPx: px };
  });
}
export function appendCurrentSignalsToFollowup(history, scan) {
  const now = new Date().toISOString();
  const all = [...(scan.long || []), ...(scan.short || [])];
  for (const item of all) {
    history.push({
      symbol: item.symbol,
      direction: item.direction || (scan.long?.includes(item) ? "long" : "short"),
      price: item.price,
      score: item.score,
      createdAt: now
    });
  }
  // keep last 90 days
  const cutoff = Date.now() - 90 * 24 * 3600 * 1000;
  return history.filter((it) => new Date(it.createdAt).getTime() >= cutoff);
}
export function summarizeFollowupHistory(history) {
  const summarize = (key) => {
    const items = history.filter((it) => it[key] != null);
    if (!items.length) return { count: 0, avgReturn: 0, hitRate: 0 };
    const total = items.reduce((s, it) => s + (it[key] || 0), 0);
    const hits = items.filter((it) => it.hit).length;
    return {
      count: items.length,
      avgReturn: total / items.length,
      hitRate: (hits / items.length) * 100
    };
  };
  return { d1: summarize("d1"), d3: summarize("d3"), d5: summarize("d5") };
}
export function buildPreviousSymbolMap() {
  const map = new Map();
  for (const snap of state.latestScanHistory || []) {
    for (const item of snap.long || []) map.set(item.symbol, snap.timestamp);
    for (const item of snap.short || []) map.set(item.symbol, snap.timestamp);
    for (const item of snap.watch || []) map.set(item.symbol, snap.timestamp);
  }
  return map;
}

// === news UI settings ===
export function loadNewsUiSettings() {
  try {
    const raw = localStorage.getItem(constants.newsUiKey);
    return raw ? JSON.parse(raw) : { filter: "all", search: "", pinHigh: false, compact: false };
  } catch { return { filter: "all", search: "", pinHigh: false, compact: false }; }
}
export function saveNewsUiSettings(cfg) {
  try { localStorage.setItem(constants.newsUiKey, JSON.stringify(cfg)); } catch {}
}
