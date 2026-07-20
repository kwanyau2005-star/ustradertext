// src/pattern-recognition/index.js — Pattern recognition module entry
// v26 NEW: 統一 export 所有 pattern 識別 API

export {
  detectHammer, detectInvertedHammer, detectShootingStar, detectDoji,
  detectBullishMarubozu, detectBearishMarubozu, detectSpinningTop, detectAllSingle
} from "./single.js";

export {
  detectBullishEngulfing, detectBearishEngulfing,
  detectTweezerTop, detectTweezerBottom,
  detectPiercingLine, detectDarkCloudCover, detectAllDouble
} from "./double.js";

export {
  detectMorningStar, detectEveningStar,
  detectThreeWhiteSoldiers, detectThreeBlackCrows, detectAllTriple
} from "./triple.js";

export {
  detectHeadShoulders, detectInverseHeadShoulders,
  detectDoubleTop, detectDoubleBottom,
  detectAscendingTriangle, detectDescendingTriangle,
  detectCupAndHandle, detectAllMultiBar
} from "./multi-bar.js";

export { scanPatterns, patternsToChips } from "./markers.js";
