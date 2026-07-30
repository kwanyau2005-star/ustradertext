#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Render / 本機兩用的 REST 轉發 server。

本機：
  python3 rest_proxy_server.py --port 8767
  打開 http://127.0.0.1:8767/us-trading-dashboard.html

Render：
  以環境變數 PORT / MASSIVE_PROXY_KEY 啟動。

前端請求：
  /massive-proxy/...
本 server 轉發到：
  http://44.219.45.87:8081/...

優先使用環境變數 MASSIVE_PROXY_KEY；
如果未設定，才退回接受前端傳入的 X-Proxy-Key（方便本機測試）。
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
import urllib.request
import urllib.error


UPSTREAM_REST_BASE = os.environ.get("UPSTREAM_REST_BASE", "http://44.219.45.87:8081").rstrip("/")
ENV_PROXY_KEY = os.environ.get("MASSIVE_PROXY_KEY", "").strip()
MINISHARE_API_BASE = os.environ.get("MINISHARE_API_BASE", "http://mapi.mintree.site:8081").rstrip("/")
ENV_MINISHARE_AUTH_CODE = os.environ.get("MINISHARE_AUTH_CODE", "").strip()


class Handler(SimpleHTTPRequestHandler):
    # 令 console 乾淨啲
    def log_message(self, fmt, *args):
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), fmt % args))

    def do_GET(self):
        if self.path.startswith("/massive-proxy/"):
            return self._proxy_to_upstream()
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/minishare/"):
            return self._proxy_to_minishare()
        self.send_response(405)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b'{"error":"method_not_allowed"}')

    def do_HEAD(self):
        if self.path.startswith("/massive-proxy/"):
            return self._proxy_to_upstream(head_only=True)
        return super().do_HEAD()

    def _proxy_to_upstream(self, head_only: bool = False):
        parsed = urlparse(self.path)
        upstream_url = UPSTREAM_REST_BASE + parsed.path[len("/massive-proxy") :]  # keep leading /
        if parsed.query:
            upstream_url += "?" + parsed.query

        # Render 上線時用環境變數；本機測試時可退回前端帶入的 key
        proxy_key = ENV_PROXY_KEY or self.headers.get("X-Proxy-Key", "").strip()
        if not proxy_key:
            self.send_response(400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(b'{"error":"missing_proxy_key","message":"Set MASSIVE_PROXY_KEY or send X-Proxy-Key."}')
            return

        req = urllib.request.Request(
            upstream_url,
            method="HEAD" if head_only else "GET",
            headers={
                "X-Proxy-Key": proxy_key,
                "Accept": "application/json",
                "User-Agent": "us-trading-dashboard-proxy/1.0",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                status = resp.getcode()
                body = b"" if head_only else resp.read()
                self.send_response(status)
                # 轉發必要 headers
                content_type = resp.headers.get("Content-Type") or "application/json"
                self.send_header("Content-Type", content_type)
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                if not head_only:
                    self.wfile.write(body)
        except Exception as e:
            msg = str(e).replace('"', '\\"')
            self.send_response(502)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(f'{{"error":"proxy_failed","message":"{msg}"}}'.encode("utf-8"))

    def _proxy_to_minishare(self):
        endpoint = self.path[len("/api/minishare/"):].split("?", 1)[0].strip("/")
        if not endpoint:
            self.send_response(400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(b'{"error":"missing_endpoint"}')
            return

        length = int(self.headers.get("Content-Length", "0") or 0)
        raw_body = self.rfile.read(length) if length > 0 else b"{}"
        try:
            payload = json.loads(raw_body.decode("utf-8") or "{}")
        except Exception:
            payload = {}

        auth_code = ENV_MINISHARE_AUTH_CODE or str(payload.get("auth_code") or "").strip()
        params = payload.get("params")
        if not isinstance(params, dict):
            params = {}
        if not auth_code:
            self.send_response(400)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(b'{"error":"missing_auth_code","message":"Set MINISHARE_AUTH_CODE or send auth_code."}')
            return

        upstream_url = f"{MINISHARE_API_BASE}/api/minishare/{endpoint}"
        upstream_payload = json.dumps({
            "auth_code": auth_code,
            "params": params
        }).encode("utf-8")
        req = urllib.request.Request(
            upstream_url,
            data=upstream_payload,
            method="POST",
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "us-trading-dashboard-minishare-proxy/1.0",
            },
        )
        try:
            with urllib.request.urlopen(req, timeout=25) as resp:
                body = resp.read()
                self.send_response(resp.getcode())
                self.send_header("Content-Type", resp.headers.get("Content-Type") or "application/json; charset=utf-8")
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
        except urllib.error.HTTPError as e:
            body = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", e.headers.get("Content-Type") or "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            msg = str(e).replace('"', '\\"')
            self.send_response(502)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(f'{{"error":"proxy_failed","message":"{msg}"}}'.encode("utf-8"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=int(os.environ.get("PORT", "8767")))
    args = parser.parse_args()

    repo_root = os.path.dirname(os.path.abspath(__file__))
    os.chdir(repo_root)
    server = ThreadingHTTPServer(("0.0.0.0", args.port), Handler)
    mode = "env-key" if ENV_PROXY_KEY else "passthrough-key"
    print(f"Serving on http://127.0.0.1:{args.port}/  (proxy -> {UPSTREAM_REST_BASE}, mode={mode})", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
