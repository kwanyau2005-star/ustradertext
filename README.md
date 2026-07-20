# ustradertext v26 — US Trading Dashboard

> 美股 PWA 選股器 + K 線圖 + 自動 K 線型態識別

## 模組架構 (v26)

```
ustradertext_modular_v26/
├── us-trading-dashboard.html     主 HTML 入口（純 markup，CSS/JS 外部化）
├── styles.css                     全部樣式（1289 行，v25 抽出）
├── sw.js                          Service Worker (v26 cache)
├── manifest.webmanifest           PWA manifest
├── assets/                        PWA icon 等
│   └── ustradertext_app_icon.jpg
└── src/
    ├── legacy.js                  v25 全部 inline JS（4436 行，作為 bridge 保留）
    ├── pattern-bridge.js          ES module 入口，把 pattern-recognition 掛到 window
    ├── utils.js                   通用工具（clamp / formatPrice / escapeHtml / ...）
    ├── dom.js                     DOM refs + 全域 state + 常數
    ├── storage.js                 localStorage / sessionStorage 包裝
    ├── indicators.js              技術指標（SMA / EMA / VWAP / ATR / RSI / MACD / RVOL / ...）
    ├── chart/
    │   ├── svg.js                 SVG mini K 線圖（含 markers 支援）
    │   ├── canvas.js              Canvas mini K 線圖
    │   └── index.js               re-export
    └── pattern-recognition/       🆕 K 線型態識別
        ├── single.js              單根（Hammer / Doji / Marubozu / ...）
        ├── double.js              雙根（Engulfing / Tweezer / Piercing / Dark Cloud）
        ├── triple.js              三根（Morning Star / Evening Star / 3WS / 3BC）
        ├── multi-bar.js           多根（H&S / Double Top/Bottom / Triangle / Cup & Handle）
        ├── markers.js             統一 scanPatterns() 入口
        └── index.js               re-export
```

## 開發

無需 build step。直接用任何 static server 起：

```bash
python3 -m http.server 8080
# → http://localhost:8080/us-trading-dashboard.html
```

## 主要功能

- **做多做空掃描**：自選清單 → 多空 + 觀察三個 tab
- **技術指標**：MA10/20/50/200、VWAP、ATR、RVOL、Relative Strength、Sector Proxy
- **K 線型態識別（v26 新功能）**：自動識別 17 種型態，喺 candidate card 嘅 K 線圖上面標示（▲/▼ 點 + 頸線/趨勢線）同顯示 chip row
- **新聞 / 板塊 / 宏觀**：minishare API + 關鍵字情緒分析
- **匯出**：選股 PNG 圖、JSON 數據、CSV

## API Key

第一次用要喺設定入面填：
- **Polygon.io**（主力 K 線 / 報價）
- **Finnhub**（新聞）
- **minishare**（Realtime US + Daily US）

## 版本

- v25：6081 行單檔 HTML（基線）
- v26：模組化 + K 線型態識別

## License

Personal use only.
