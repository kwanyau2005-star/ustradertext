# Render 部署流程

## 你要上傳 / 保留嘅檔

- `us-trading-dashboard.html`
- `rest_proxy_server.py`
- `index.html`
- `manifest.webmanifest`
- `sw.js`
- `assets/ustradertext_app_icon.jpg`
- `render.yaml`

## Render 建議做法

1. 去 Render Dashboard
2. 按 `New`
3. 選 `Web Service`
4. 連接 GitHub repo：`ustradertext`

## 主要設定

- Name：`ustradertext`
- Runtime：`Python 3`
- Branch：`main`
- Build Command：留空
- Start Command：`python3 rest_proxy_server.py`

## 一定要加嘅 Environment Variables

- `MASSIVE_PROXY_KEY` = 你條 Massive / Polygon REST key
- `UPSTREAM_REST_BASE` = `http://44.219.45.87:8081`

## Alpaca（可選，建議）

如果你想用 Alpaca 即時報價（由伺服器代理，前端唔暴露 secret），再加：

- `ALPACA_KEY_ID` = 你嘅 Alpaca Key ID
- `ALPACA_SECRET_KEY` = 你嘅 Alpaca Secret Key
- `ALPACA_DATA_BASE` = `https://data.alpaca.markets`（可留預設）
- `ALPACA_TRADING_BASE` = `https://paper-api.alpaca.markets`（可留預設）

## 部署後

Render 會提供一條網址，例如：

- `https://ustradertext.onrender.com`

之後直接開：

- `https://你的-render-網址/us-trading-dashboard.html`

或者如果 `index.html` 已存在，直接開根網址都得。

## 點知部署成功

打開：

- `/us-trading-dashboard.html`

再撳 `更新數據`。

如果有數據，就代表：

- 前端正常
- 同站 proxy 正常
- `MASSIVE_PROXY_KEY` 正常
