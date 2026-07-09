# Cloudflare 部署說明

## 你要上傳嘅檔案

- `us-trading-dashboard.html`
- `functions/massive-proxy/[[path]].js`
- `wrangler.toml`
- `.gitignore`

其他 HTML / 測試檔可以唔上傳。

## Cloudflare Pages 建議做法

1. 去 `Cloudflare Dashboard`
2. 開 `Workers & Pages`
3. `Create application`
4. 選 `Pages`
5. 用 `Connect to Git`
6. 揀你個 GitHub repo

## Build 設定

- Framework preset: `None`
- Build command: 留空
- Build output directory: `.`

## 一定要加嘅 Secret

喺 Pages project 入面加：

- `MASSIVE_PROXY_KEY` = 你條 Massive / Polygon key

可選：

- `UPSTREAM_REST_BASE` = `http://44.219.45.87:8081`

## 點解咁做

- 前端唔會見到你條 key
- 用戶唔使再填 Massive key
- 前端只打 `/massive-proxy/*`
- Cloudflare Function 會自動幫你加 `X-Proxy-Key`

## 本機模式

本機 `localhost` / `127.0.0.1` 仍然保留手動填 key 邏輯，方便你自己測試。

## 發布後

Pages URL 大概會係：

- `https://你的專案名.pages.dev/us-trading-dashboard.html`

如果你之後想直接用根目錄網址，可以再將首頁改名做 `index.html`。
