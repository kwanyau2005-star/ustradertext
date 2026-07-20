// src/dom.js — DOM element references + global state
// v26 refactor: 所有 DOM 查詢集中一次過 export 出去

export const el = Object.fromEntries([
  "polygonKey","finnhubKey","minishareRtUsKey","minishareUsDailyKey","saveKeysBtn","clearKeysBtn","tickers","loadExampleBtn","runBtn",
  "dataMode","includeBenchmarks","maxTickersPerRun","priceLookbackDays","newsLookbackDays","polygonDelayMs","finnhubDelayMs","minPrice","minMarketCap","minRvol","maxAtrPct","maxEarningsRisk","minScore","macroTone","scannerBias",
  "statusHint","selectedSummary","exportSelectedBtn","clearSelectedBtn","exportBtn","copyJsonBtn",
  "navScanner","navNews","pageScanner","pageNews","scannerTabLong","scannerTabShort","scannerTabWatch","scannerPanelLong","scannerPanelShort","scannerPanelWatch",
  "openMainMenuBtn","topRunBtn","topExportBtn","quickPresetSelect","mainMenuModal","closeMainMenuBtn",
  "changePolygonKeyBtn","changeFinnhubKeyBtn","openWatchlistModal","openRuntimeModal","openScannerModal","settingsModal","closeModalBtn","modalTitle","modalIntro","modalBadge","modalSectionKeys","modalSectionWatchlist","modalSectionRuntime","modalSectionScanner","modalRunBtn","scannerPresetHint",
  "stockModal","closeStockModalBtn","stockModalTitle","stockModalIntro","stockModalMeta","stockModalBody",
  "newsFilterMode","newsSearch","newsPinHighToggle","newsCompactToggle","newsModal","closeNewsModalBtn","newsModalTitle","newsModalIntro","newsModalMeta","newsModalBody",
  "statProgressFill","statDataText","statBandwidth","statCount","statImportantNews","statTime","heroLong","heroShort","heroErrors","heroAlerts",
  "marketNqTitle","marketNqSub","marketNqPrice","marketNqChange","marketNqUpdated","marketNqChart","marketSpxTitle","marketSpxSub","marketSpxPrice","marketSpxChange","marketSpxUpdated","marketSpxChart",
  "sampleCount","dominantBias","errorCount","historyRuns","previousScanTime","bestLongTicker","bestShortTicker","bestWatchTicker","bestEventTag","trackedDelta","perf1d","perf3d","perf5d",
  "selectedGrid","longGrid","shortGrid","watchGrid",
  "importantCount","companyNewsCount","marketNewsCount","alertsGrid","tagRow","jsonPreview"
].map((id) => [id, document.getElementById(id)]));

// === mutable global state (replaces v25 inline `let ...`) ===
export const state = {
  latestDataset: [],
  latestScan: { long: [], short: [], watch: [] },
  latestScanHistory: [],
  latestFollowupHistory: [],
  latestCompanyNews: [],
  latestMarketNews: [],
  latestAlerts: [],
  activeScannerTab: "long",
  latestBenchmarks: {
    nq: { label: "NQ", symbol: "I:NDX", bars: [], last: null, changePct: null, loadingText: "載入市場中", updatedAt: null },
    spx: { label: "S&P", symbol: "SPY", bars: [], last: null, changePct: null, loadingText: "載入市場中", updatedAt: null }
  },
  latestMarketContext: {
    bias: "中性",
    longBoost: 0,
    shortBoost: 0,
    summary: "等待市場背景",
    volatilityLabel: "正常波動",
    rrFloor: 1.4,
    triggerFloor: 2,
    chaseAtrCap: 0.75
  },
  latestCalibration: {
    byKey: {},
    summary: "未有足夠回測"
  },
  latestFinnhubMode: "normal",
  errorCounter: 0,
  latestNewsView: [],
  currentScannerPresetKey: "balanced",
  selectedSymbols: new Set(),
  currentRunBytes: 0
};

export const constants = {
  scanHistoryKey: "tradingDashboardScanHistory",
  followupHistoryKey: "tradingDashboardForwardPerformance",
  newsUiKey: "dashboardNewsUiV1",
  runtimeSettingsKey: "dashboardRuntimeSettingsV1",
  priceProviderVersionKey: "dashboardPriceProviderVersion",
  priceProviderVersionValue: "massive-render-proxy-v1",
  coreUniverse50: "AAPL, MSFT, NVDA, AMZN, META, GOOGL, TSLA, AVGO, NFLX, AMD, PLTR, MU, TSM, ASML, ARM, JPM, BAC, GS, MS, C, WFC, XOM, CVX, UNH, LLY, COST, WMT, ORCL, CRM, QCOM",
  defaultApiKeys: {
    polygon: "",
    finnhub: "K48p6c7MmDXPM6a2jLn0e53Xqw3w4Xzpts8VB9vcPeQ080lcGQ2JPTOa8393b021",
    minishareRtUs: "dIFnS05lM2Cxm7Nydo7ijr3kxZt4BomWu0s8Rv5jtyOJ2F0iVYIgawhM3e7825ce",
    minishareUsDaily: "d6NcHa2RSm2htu5XpHR8s2Sbd19y4SsBS2y00ZnN899Mwv5EVTJBYk1Gea566c0e"
  },
  deploymentMode: (() => {
    const hostname = location.hostname || "";
    const m = {
      hostname,
      isLocalhost: ["127.0.0.1", "localhost"].includes(hostname),
      isCloudflareHosted: /(?:^|\.)pages\.dev$|(?:^|\.)workers\.dev$/i.test(hostname)
    };
    m.isManagedPolygonProxy = !m.isLocalhost;
    return m;
  })(),
  massivePolygonProxy: {
    restBaseUrl: "/massive-proxy",
    headerName: "X-Proxy-Key"
  }
};

export const scannerPresets = {
  smart: {
    label: "智能建議（推薦）",
    getValues: () => ({ ...scannerPresets[getSmartPresetChoiceKey()].values })
  },
  balanced: {
    label: "平衡模式",
    values: { minPrice: 20, minMarketCap: 0, minRvol: 1.1, maxAtrPct: 8, maxEarningsRisk: 3, minScore: 62, macroTone: 0, scannerBias: "both" }
  },
  liquidityFocus: {
    label: "高流動性優先",
    values: { minPrice: 30, minMarketCap: 20, minRvol: 1.1, maxAtrPct: 7.5, maxEarningsRisk: 4, minScore: 64, macroTone: 0, scannerBias: "both" }
  },
  steadyLong: {
    label: "穩陣做多",
    values: { minPrice: 25, minMarketCap: 10, minRvol: 1.3, maxAtrPct: 6.5, maxEarningsRisk: 5, minScore: 68, macroTone: 1, scannerBias: "long" }
  },
  aggressiveBreakout: {
    label: "進取突破",
    values: { minPrice: 15, minMarketCap: 0, minRvol: 1.6, maxAtrPct: 12, maxEarningsRisk: 2, minScore: 58, macroTone: 1, scannerBias: "long" }
  },
  defensiveShort: {
    label: "防守偏空",
    values: { minPrice: 20, minMarketCap: 10, minRvol: 1.2, maxAtrPct: 7, maxEarningsRisk: 6, minScore: 66, macroTone: -1, scannerBias: "short" }
  }
};

// resolved at runtime by market/session.js to avoid circular import
let _smartPresetChoiceKey = "liquidityFocus";
function getSmartPresetChoiceKey() { return _smartPresetChoiceKey; }
export function setSmartPresetChoiceKey(k) { _smartPresetChoiceKey = k; }

export const symbolAliasMap = {
  AAPL: ["apple","iphone","ipad","macbook","ios","app store","tim cook","apple intelligence","siri"],
  MSFT: ["microsoft","windows","azure","openai","xbox","satya nadella","linkedin","github","chatgpt","copilot","activision","office 365"],
  NVDA: ["nvidia","geforce","cuda","jensen huang","blackwell","h100","gb200"],
  AMD: ["amd","advanced micro devices","ryzen","epyc","radeon","lisa su","instinct mi300","pensando"],
  META: ["meta","facebook","instagram","whatsapp","threads","zuckerberg","mark zuckerberg","reels","quest","oculus"],
  TSLA: ["tesla","elon musk","model y","model 3","cybertruck","robotaxi","autopilot","fsd","full self driving","spacex","xai","grok"],
  GOOGL: ["google","alphabet","youtube","gemini","waymo","sundar pichai","android","google cloud","deepmind","pixel"],
  GOOG: ["google","alphabet","youtube","gemini","waymo","sundar pichai","android","google cloud","deepmind","pixel"],
  AMZN: ["amazon","aws","prime day","andy jassy","whole foods","kindle","amazon web services","prime video","twitch","zoox"],
  NFLX: ["netflix","streaming giant","ted sarandos","reed hastings","subscriber growth"],
  AVGO: ["broadcom","hock tan","vmware"],
  PLTR: ["palantir","alex karp","us government contractor"],
  COIN: ["coinbase","crypto exchange","brian armstrong","bitcoin platform","crypto brokerage"],
  SMCI: ["super micro","supermicro","super micro computer"],
  JPM: ["jpmorgan","jp morgan","jamie dimon","chase bank"],
  BAC: ["bank of america","bofa","merrill"],
  WMT: ["walmart","sam's club","flipkart"],
  DIS: ["disney","espn","marvel","pixar","bob iger","disney+"],
  NKE: ["nike","jordan brand","air jordan"],
  TSM: ["tsmc","taiwan semiconductor","morris chang","tsmc arizona"],
  BABA: ["alibaba","taobao","jack ma","aliexpress","alicloud"],
  BIDU: ["baidu","ernie bot","apollo go"],
  PDD: ["pdd","pinduoduo","temu"],
  UBER: ["uber","uber eats","dara khosrowshahi"],
  LYFT: ["lyft","ride hailing app"],
  SHOP: ["shopify","tobi lutke"],
  CRM: ["salesforce","marc benioff","slack"],
  ORCL: ["oracle","larry ellison","cerner"],
  ADBE: ["adobe","photoshop","illustrator","acrobat","firefly"]
};

export const positiveKeywords = [
  "beat","beats","surge","jump","gain","growth","upgrade","bullish","strong","record","expands","partnership","buyback","profit","outperform","raises",
  "突破","利好","增長","上調","創新高","回購","合作","強勁","超預期","盈利","approval","approved"
];
export const negativeKeywords = [
  "miss","drop","fall","cuts","cut","downgrade","bearish","weak","lawsuit","probe","delay","recall","decline","slump","warning","underperform",
  "下跌","利空","下調","疲弱","訴訟","調查","延遲","警告","失守","衰退","investigation","fda rejection","bankruptcy"
];
export const highImpactKeywords = [
  "earnings","guidance","merger","acquisition","lawsuit","probe","investigation","fda","approval","sec","downgrade","upgrade","ceo","cfo","forecast","dividend","buyback","bankruptcy","recall","layoff","layoffs",
  "財報","指引","收購","合併","訴訟","調查","FDA","批准","降評","升評","行政總裁","裁員","破產","回購"
];
export const newsEventRules = [
  { label: "財報利多", keywords: ["earnings beat","beats expectations","beat estimates","raises guidance","record revenue","超預期","上調指引","盈利勝預期"], bias: 2, impact: 2.8 },
  { label: "財報利空", keywords: ["earnings miss","missed expectations","cuts guidance","warning","miss estimates","不及預期","下調指引","盈利警告"], bias: -2, impact: 3 },
  { label: "升評 / 合作", keywords: ["upgrade","partnership","strategic deal","合作","升評","簽約","大單"], bias: 1.4, impact: 1.8 },
  { label: "降評 / 調查", keywords: ["downgrade","probe","investigation","sec","lawsuit","訴訟","調查","降評"], bias: -1.8, impact: 2.4 },
  { label: "批准 / 新產品", keywords: ["approval","approved","launch","unveil","fda approval","批准","發佈","推出"], bias: 1.2, impact: 1.8 },
  { label: "收購 / 合併", keywords: ["merger","acquisition","takeover","buyout","收購","合併"], bias: 1, impact: 2.6 },
  { label: "裁員 / 破產", keywords: ["layoff","layoffs","bankruptcy","restructuring","裁員","破產","重組"], bias: -1.6, impact: 2.4 },
  { label: "回購 / 股息", keywords: ["buyback","dividend","special dividend","回購","派息","股息"], bias: 1, impact: 1.6 }
];
