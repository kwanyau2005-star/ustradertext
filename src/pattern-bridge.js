// src/pattern-bridge.js — Load pattern-recognition as a module and expose globally
// v26 NEW: 喺 regular script 環境入面用 ES module 載入新功能，
//          然後掛到 window.v26Patterns，等 legacy.js 同步用到

import * as patterns from "./pattern-recognition/index.js";

if (typeof window !== "undefined") {
  window.v26Patterns = patterns;
  window.dispatchEvent(new CustomEvent("v26-patterns-ready"));
}
