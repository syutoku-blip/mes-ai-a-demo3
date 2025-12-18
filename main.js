/**************************************************************
 * main.js
 * - レイアウト3追加（body.third-layout）
 * - 商品情報は商品情報枠（zoneState.info）を上から半分ずつで
 *   商品情報①/商品情報②に分割表示（レイアウト3のみ）
 * - ★重要視項目（ソートの下）追加：
 *   pool内の項目を選択→数値条件を設定→全条件(AND)を満たすASINに🔥表示
 **************************************************************/

const $ = (sel, root = document) => root.querySelector(sel);
const FX_RATE = 155;

const fmtJPY = (n) => "￥" + Number(n || 0).toLocaleString("ja-JP");
const num = (v) => {
  const x = Number(String(v ?? "").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const fmtKg = (v) => {
  const x = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(x) || x === 0) return "－";
  return x.toFixed(2) + "kg";
};

/* =========================
   指標（候補）
========================= */
const METRICS_ALL = [
  { id: "過去3月FBA最安値", label: "過去3ヶ月FBA最安値", sourceKey: "過去3月FBA最安値" },
  { id: "FBA最安値", label: "FBA最安値", sourceKey: "FBA最安値" },

  { id: "粗利益率予測", label: "粗利益率予測", sourceKey: "粗利益率予測" },
  { id: "入金額予測", label: "入金額予測（円）", sourceKey: "入金額予測" },
  { id: "粗利益予測", label: "粗利益予測（1個）", sourceKey: "粗利益予測" },

  { id: "粗利益", label: "粗利益", sourceKey: "粗利益" },
  { id: "粗利益率", label: "粗利益率", sourceKey: "粗利益率" },

  { id: "販売額（ドル）", label: "販売額（USD）", sourceKey: "販売額（ドル）" },
  { id: "入金額（円）", label: "入金額（円）", sourceKey: "入金額（円）" },
  { id: "入金額計（円）", label: "入金額計（円）", sourceKey: "入金額計（円）" },

  { id: "30日販売数", label: "30日販売数（実績）", sourceKey: "30日販売数" },
  { id: "90日販売数", label: "90日販売数（実績）", sourceKey: "90日販売数" },
  { id: "180日販売数", label: "180日販売数（実績）", sourceKey: "180日販売数" },
  { id: "予測30日販売数", label: "予測30日販売数", sourceKey: "予測30日販売数" },

  { id: "複数在庫指数45日分", label: "複数在庫指数45日分", sourceKey: "複数在庫指数45日分" },
  { id: "複数在庫指数60日分", label: "複数在庫指数60日分", sourceKey: "複数在庫指数60日分" },

  { id: "ライバル偏差1", label: "ライバル偏差1", sourceKey: "ライバル偏差1" },
  { id: "ライバル偏差2", label: "ライバル偏差2", sourceKey: "ライバル偏差2" },
  { id: "ライバル増加率", label: "ライバル増加率", sourceKey: "ライバル増加率" },

  { id: "在庫数", label: "在庫数", sourceKey: "在庫数" },
  { id: "返品率", label: "返品率", sourceKey: "返品率" },

  { id: "日本最安値", label: "日本最安値", sourceKey: "日本最安値" },

  { id: "仕入れ目安単価", label: "仕入れ目安単価", sourceKey: "仕入れ目安単価" },
  { id: "想定送料", label: "想定送料", sourceKey: "想定送料" },
  { id: "送料", label: "送料", sourceKey: "送料" },
  { id: "関税", label: "関税", sourceKey: "関税" }
];
const METRIC_BY_ID = Object.fromEntries(METRICS_ALL.map((m) => [m.id, m]));

/* =========================
   商品情報（項目）候補
========================= */
const INFO_FIELDS_ALL = [
  { id: "商品名", label: "商品名", kind: "computedTitle" },
  { id: "ブランド", label: "ブランド", kind: "text", sourceKey: "ブランド" },
  { id: "評価", label: "評価", kind: "text", sourceKey: "レビュー評価" },

  { id: "各種ASIN", label: "各種ASIN", kind: "computed" },
  { id: "JAN", label: "JAN", kind: "text", sourceKey: "JAN" },
  { id: "SKU", label: "SKU", kind: "text", sourceKey: "SKU" },

  { id: "サイズ", label: "サイズ", kind: "computed" },
  { id: "重量（容積重量）", label: "重量（容積重量）", kind: "computed" },

  { id: "カテゴリ", label: "カテゴリ", kind: "computed" },
  { id: "注意事項", label: "注意事項", kind: "computedTags" },
  { id: "材質", label: "材質", kind: "text", sourceKey: "材質" }
];
const INFO_BY_ID = Object.fromEntries(INFO_FIELDS_ALL.map((f) => [f.id, f]));

/* =========================
   token
========================= */
const tokM = (id) => `M:${id}`;
const tokI = (id) => `I:${id}`;

function parseToken(token) {
  const [t, ...rest] = String(token).split(":");
  const id = rest.join(":");
  return { type: t, id };
}
function labelOf(token) {
  const { type, id } = parseToken(token);
  if (type === "M") return METRIC_BY_ID[id]?.label || id;
  if (type === "I") return INFO_BY_ID[id]?.label || id;
  return id;
}

/* =========================
   初期配置
========================= */
const DEFAULT_ZONES = {
  pool: [
    ...METRICS_ALL.map((m) => tokM(m.id)),
    ...INFO_FIELDS_ALL.map((f) => tokI(f.id))
  ],
  info: [
    tokI("商品名"),
    tokI("ブランド"),
    tokI("評価"),
    tokI("各種ASIN"),
    tokI("JAN"),
    tokI("SKU"),
    tokI("サイズ"),
    tokI("重量（容積重量）"),
    tokI("カテゴリ"),
    tokI("注意事項"),
    tokI("材質")
  ],
  center: [
    tokM("過去3月FBA最安値"),
    tokM("FBA最安値"),
    tokM("入金額予測"),
    tokM("180日販売数"),
    tokM("90日販売数"),
    tokM("粗利益率予測"),
    tokM("30日販売数"),
    tokM("日本最安値"),
    tokM("粗利益予測")
  ],
  table: [
    tokM("在庫数"),
    tokM("想定送料"),
    tokM("返品率"),
    tokM("仕入れ目安単価"),
    tokM("販売額（ドル）"),
    tokM("送料"),
    tokM("関税"),
    tokM("予測30日販売数"),
    tokM("入金額（円）")
  ],
  hidden: []
};

function normalizeDefaultZones() {
  const used = new Set([...DEFAULT_ZONES.info, ...DEFAULT_ZONES.center, ...DEFAULT_ZONES.table, ...DEFAULT_ZONES.hidden]);
  DEFAULT_ZONES.pool = DEFAULT_ZONES.pool.filter((t) => !used.has(t));
}
normalizeDefaultZones();

const zoneState = {
  pool: [...DEFAULT_ZONES.pool],
  info: [...DEFAULT_ZONES.info],
  center: [...DEFAULT_ZONES.center],
  table: [...DEFAULT_ZONES.table],
  hidden: [...DEFAULT_ZONES.hidden]
};

const cardState = new Map();
const cart = new Map();

/* ===== DOM refs ===== */
const metricsBar = $("#metricsBar");

const zonePool = $("#metricsPoolZone");
const zoneInfo = $("#metricsInfoZone");
const zoneCenter = $("#metricsCenterZone");
const zoneTable = $("#metricsTableZone");
const zoneHidden = $("#metricsHiddenZone");

/* buttons */
const metricsCollapseBtn = $("#metricsCollapseBtn");
const resetBtn = $("#resetCurrentBtn");
const clearCardsBtn = $("#clearCardsBtn");
const clearCartBtn = $("#clearCartBtn");

/* catalog */
const asinCatalog = $("#asinCatalog");
const itemsContainer = $("#itemsContainer");
const emptyState = $("#emptyState");
const headerStatus = $("#headerStatus");

/* cart */
const cartTotalCost = $("#cartTotalCost");
const cartTotalRevenue = $("#cartTotalRevenue");
const cartTotalProfit = $("#cartTotalProfit");
const cartAsinCount = $("#cartAsinCount");
const cartItemCount = $("#cartItemCount");

/* sort */
const sortBar = $("#sortBar");
const sortControls = $("#sortControls");
const addSortRuleBtn = $("#addSortRuleBtn");
const applySortBtn = $("#applySortBtn");
const clearSortBtn = $("#clearSortBtn");
let sortRules = [];

/* important（重要視項目） */
const importantBar = $("#importantBar");
const importantControls = $("#importantControls");
const addImportantRuleBtn = $("#addImportantRuleBtn");
const applyImportantBtn = $("#applyImportantBtn");
const clearImportantBtn = $("#clearImportantBtn");
let importantRules = [];

init();

function init() {
  initPoolUI();
  initCatalog();
  initSortUI();
  initImportantUI();
  initActions();
  updateCartSummary();
  updateHeaderStatus();
  renderTopZones();
}

function initPoolUI() {
  attachZoneDnD(zonePool, { zoneKey: "pool" });
  attachZoneDnD(zoneInfo, { zoneKey: "info" });
  attachZoneDnD(zoneCenter, { zoneKey: "center" });
  attachZoneDnD(zoneTable, { zoneKey: "table" });
  attachZoneDnD(zoneHidden, { zoneKey: "hidden" });
}

function initActions() {
  metricsCollapseBtn?.addEventListener("click", () => {
    metricsBar.classList.toggle("collapsed");
    metricsCollapseBtn.textContent = metricsBar.classList.contains("collapsed") ? "展開する" : "折りたたむ";
  });

  resetBtn?.addEventListener("click", () => {
    zoneState.pool = [...DEFAULT_ZONES.pool];
    zoneState.info = [...DEFAULT_ZONES.info];
    zoneState.center = [...DEFAULT_ZONES.center];
    zoneState.table = [...DEFAULT_ZONES.table];
    zoneState.hidden = [...DEFAULT_ZONES.hidden];

    sortRules = [];
    renderSortControls();

    importantRules = [];
    renderImportantControls();

    renderTopZones();
    rerenderAllCards();
  });

  clearCardsBtn?.addEventListener("click", () => {
    cardState.forEach((v) => {
      if (v.chart) v.chart.destroy();
      v.el.remove();
    });
    cardState.clear();
    itemsContainer.innerHTML = "";
    emptyState.style.display = "block";
    updateHeaderStatus();
    updateImportantMarks();
  });

  clearCartBtn?.addEventListener("click", () => {
    cart.clear();
    updateCartSummary();
  });
}

function initCatalog() {
  const asins = Object.keys(window.ASIN_DATA || {});
  asinCatalog.innerHTML = "";
  asins.forEach((asin) => {
    const b = document.createElement("button");
    b.className = "asin-pill";
    b.type = "button";
    b.textContent = asin;
    b.addEventListener("click", () => addOrFocusCard(asin));
    asinCatalog.appendChild(b);
  });
}

function addOrFocusCard(asin) {
  const data = (window.ASIN_DATA || {})[asin];
  if (!data) return alert("データがありません: " + asin);

  if (cardState.has(asin)) {
    cardState.get(asin).el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const card = createProductCard(asin, data);
  itemsContainer.appendChild(card);

  emptyState.style.display = "none";
  cardState.set(asin, { el: card, data, chart: card.__chart || null });

  updateHeaderStatus();
  updateImportantMarks();
}

function updateHeaderStatus() {
  const count = cardState.size;
  if (headerStatus) headerStatus.textContent = count ? `表示中: ${count} ASIN` : "";
}

/* =========================
   上部5枠：レンダリング
========================= */
function renderTopZones() {
  zonePool.innerHTML = "";
  zoneInfo.innerHTML = "";
  zoneCenter.innerHTML = "";
  zoneTable.innerHTML = "";
  zoneHidden.innerHTML = "";

  zoneState.pool.forEach((t) => zonePool.appendChild(makePill(t)));
  zoneState.info.forEach((t) => zoneInfo.appendChild(makePill(t)));
  zoneState.center.forEach((t) => zoneCenter.appendChild(makePill(t)));
  zoneState.table.forEach((t) => zoneTable.appendChild(makePill(t)));
  zoneState.hidden.forEach((t) => zoneHidden.appendChild(makePill(t)));

  refreshSortRuleOptions();
  refreshImportantRuleOptions();
}

function makePill(token) {
  const pill = document.createElement("div");
  pill.className = "metric-pill";
  pill.draggable = true;
  pill.dataset.token = token;
  pill.textContent = labelOf(token);

  pill.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("text/plain", `item:${token}`);
    e.dataTransfer.effectAllowed = "move";
  });

  return pill;
}

/* =========================
   DnD（共通5枠）重複不可
========================= */
function attachZoneDnD(zoneEl, { zoneKey }) {
  if (!zoneEl) return;

  zoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  zoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if (!raw) return;
    const [kind, token] = raw.split(":");
    if (kind !== "item" || !token) return;

    moveTokenToZone(token, zoneKey);
    renderTopZones();
    rerenderAllCards();
  });
}

function moveTokenToZone(token, toZone) {
  for (const z of ["pool", "info", "center", "table", "hidden"]) {
    const idx = zoneState[z].indexOf(token);
    if (idx >= 0) zoneState[z].splice(idx, 1);
  }
  zoneState[toZone].push(token);
}

/* =========================
   Sort（真ん中枠：指標のみ対象）
========================= */
function initSortUI() {
  sortRules = [];
  renderSortControls();

  addSortRuleBtn?.addEventListener("click", () => {
    const firstMetric = zoneState.center.find((t) => parseToken(t).type === "M") || tokM(METRICS_ALL[0].id);
    sortRules.push({ metricToken: firstMetric, order: "desc" });
    renderSortControls();
  });

  applySortBtn?.addEventListener("click", () => applySort());
  clearSortBtn?.addEventListener("click", () => {
    sortRules = [];
    renderSortControls();
  });
}

function renderSortControls() {
  if (!sortControls) return;
  sortControls.innerHTML = "";

  sortRules.forEach((r, idx) => {
    const row = document.createElement("div");
    row.className = "sort-row";

    const metricOptions = zoneState.center
      .filter((t) => parseToken(t).type === "M")
      .map((t) => `<option value="${t}" ${t === r.metricToken ? "selected" : ""}>${labelOf(t)}</option>`)
      .join("");

    const selMetric = document.createElement("select");
    selMetric.innerHTML = metricOptions || `<option value="${tokM(METRICS_ALL[0].id)}">${METRICS_ALL[0].label}</option>`;
    selMetric.addEventListener("change", () => (r.metricToken = selMetric.value));

    const selOrder = document.createElement("select");
    selOrder.innerHTML = `
      <option value="desc" ${r.order === "desc" ? "selected" : ""}>降順</option>
      <option value="asc" ${r.order === "asc" ? "selected" : ""}>昇順</option>
    `;
    selOrder.addEventListener("change", () => (r.order = selOrder.value));

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "削除";
    del.addEventListener("click", () => {
      sortRules.splice(idx, 1);
      renderSortControls();
    });

    row.appendChild(selMetric);
    row.appendChild(selOrder);
    row.appendChild(del);
    sortControls.appendChild(row);
  });
}

function refreshSortRuleOptions() {
  const centerMetrics = zoneState.center.filter((t) => parseToken(t).type === "M");
  sortRules.forEach((r) => {
    if (!centerMetrics.includes(r.metricToken)) {
      r.metricToken = centerMetrics[0] || tokM(METRICS_ALL[0].id);
    }
  });
  renderSortControls();
}

function applySort() {
  if (sortRules.length === 0) return;

  const entries = Array.from(cardState.entries());
  const score = (data, metricToken) => {
    const { id } = parseToken(metricToken);
    const m = METRIC_BY_ID[id];
    if (!m) return -Infinity;
    const v = data[m.sourceKey];
    if (v == null) return -Infinity;
    const n = Number(String(v).trim().replace(/[^\d.\-]/g, ""));
    return Number.isFinite(n) ? n : -Infinity;
  };

  entries.sort((a, b) => {
    const da = a[1].data;
    const db = b[1].data;

    for (const r of sortRules) {
      const va = score(da, r.metricToken);
      const vb = score(db, r.metricToken);
      if (va === vb) continue;
      if (r.order === "asc") return va - vb;
      return vb - va;
    }
    return 0;
  });

  entries.forEach(([_, v]) => itemsContainer.appendChild(v.el));

  updateImportantMarks();
}

/* =========================
   Important（重要視項目）
   - pool内の項目（token）から選択
   - 数値比較（>=, <=, =）
   - 複数条件は AND（全部満たすと🔥）
========================= */
function initImportantUI() {
  importantRules = [];
  renderImportantControls();

  addImportantRuleBtn?.addEventListener("click", () => {
    const candidates = getImportantCandidates();
    const first = candidates[0] || tokM(METRICS_ALL[0].id);
    importantRules.push({ token: first, op: "gte", value: 0 });
    renderImportantControls();
  });

  applyImportantBtn?.addEventListener("click", () => {
    updateImportantMarks();
  });

  clearImportantBtn?.addEventListener("click", () => {
    importantRules = [];
    renderImportantControls();
    updateImportantMarks();
  });
}

function renderImportantControls() {
  if (!importantControls) return;
  importantControls.innerHTML = "";

  importantRules.forEach((r, idx) => {
    const row = document.createElement("div");
    row.className = "important-row";

    const selToken = document.createElement("select");
    const opts = getImportantCandidates()
      .map((t) => `<option value="${t}" ${t === r.token ? "selected" : ""}>${labelOf(t)}</option>`)
      .join("");
    selToken.innerHTML = opts || `<option value="${tokM(METRICS_ALL[0].id)}">${METRICS_ALL[0].label}</option>`;
    selToken.addEventListener("change", () => {
      r.token = selToken.value;
      updateImportantMarks();
    });

    const selOp = document.createElement("select");
    selOp.innerHTML = `
      <option value="gte" ${r.op === "gte" ? "selected" : ""}>以上</option>
      <option value="lte" ${r.op === "lte" ? "selected" : ""}>以下</option>
      <option value="eq"  ${r.op === "eq"  ? "selected" : ""}>一致</option>
    `;
    selOp.addEventListener("change", () => {
      r.op = selOp.value;
      updateImportantMarks();
    });

    const inp = document.createElement("input");
    inp.type = "number";
    inp.step = "0.01";
    inp.value = String(r.value ?? 0);
    inp.placeholder = "数値";
    inp.addEventListener("input", () => {
      r.value = Number(inp.value || 0);
      updateImportantMarks();
    });

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "削除";
    del.addEventListener("click", () => {
      importantRules.splice(idx, 1);
      renderImportantControls();
      updateImportantMarks();
    });

    row.appendChild(selToken);
    row.appendChild(selOp);
    row.appendChild(inp);
    row.appendChild(del);
    importantControls.appendChild(row);
  });
}

function getImportantCandidates() {
  // 「プールに存在する項目」から選択（M/Iどちらも選べる）
  // ※ 数値評価できない項目は条件判定で弾かれる（false）
  return zoneState.pool.slice();
}

function refreshImportantRuleOptions() {
  const poolTokens = new Set(zoneState.pool);
  importantRules.forEach((r) => {
    if (!poolTokens.has(r.token)) {
      r.token = zoneState.pool[0] || tokM(METRICS_ALL[0].id);
    }
  });
  renderImportantControls();
}

function tokenNumericValue(token, ctx, data) {
  const { type, id } = parseToken(token);

  if (type === "M") {
    const m = METRIC_BY_ID[id];
    if (!m) return NaN;
    const raw = data?.[m.sourceKey];
    const n = Number(String(raw ?? "").trim().replace(/[^\d.\-]/g, ""));
    return Number.isFinite(n) ? n : NaN;
  }

  if (type === "I") {
    const v = resolveTokenValue(token, ctx, data);
    if (!v) return NaN;
    if (v.kind === "tags") return NaN;
    return num(v.text);
  }

  return NaN;
}

function matchImportantRules(data, ctx) {
  if (!importantRules || importantRules.length === 0) return false;

  return importantRules.every((r) => {
    const v = tokenNumericValue(r.token, ctx, data);
    if (!Number.isFinite(v)) return false;

    const target = Number(r.value ?? 0);
    if (r.op === "gte") return v >= target;
    if (r.op === "lte") return v <= target;
    if (r.op === "eq") return v === target;
    return false;
  });
}

function updateImportantMarks() {
  cardState.forEach((v) => {
    const el = v.el;
    const asin = el.dataset.asin;

    const jpAsin = v.data["日本ASIN"] || "－";
    const usAsin = v.data["アメリカASIN"] || asin || "－";
    const realW = v.data["重量kg"] ?? v.data["重量（kg）"] ?? v.data["重量"] ?? "";
    const volW = v.data["容積重量"] ?? "";
    const size = v.data["サイズ"] || "－";
    const weight = `${fmtKg(realW)}（${fmtKg(volW)}）`;
    const ctx = { asin, jpAsin, usAsin, size, weight, data: v.data };

    const ok = matchImportantRules(v.data, ctx);

    el.classList.toggle("is-important", ok);

    const badge = el.querySelector(".important-badge");
    if (badge) badge.style.display = ok ? "inline-flex" : "none";
  });
}

/* =========================
   値の解決（token）
========================= */
function renderWarningTags(str) {
  const s = (str || "").toString();
  const parts = s.split(/[,\s、]+/).map((x) => x.trim()).filter(Boolean);
  if (parts.length === 0) return "";

  return parts
    .map((p) => {
      let cls = "tag";
      if (p.includes("輸出不可") || p.includes("出荷禁止")) cls += " danger";
      else if (p.includes("知財")) cls += " info";
      else if (p.includes("大型")) cls += " warn";
      return `<span class="${cls}">${p}</span>`;
    })
    .join("");
}

function resolveInfoValueById(id, ctx) {
  const f = INFO_BY_ID[id];
  if (!f) return { type: "text", text: "－" };

  const { jpAsin, usAsin, size, weight, data } = ctx;

  const computed = {
    商品名: data["品名"] || "－",
    各種ASIN: `日本: ${jpAsin} / US: ${usAsin}`,
    サイズ: size,
    "重量（容積重量）": weight,
    カテゴリ: `${data["親カテゴリ"] || "－"} / ${data["サブカテゴリ"] || "－"}`,
    注意事項: renderWarningTags(data["注意事項（警告系）"])
  };

  if (f.kind === "computedTags") return { type: "tags", html: computed[id] || "－" };
  if (f.kind === "computed" || f.kind === "computedTitle") return { type: "text", text: computed[id] || "－" };

  const sourceKey = f.sourceKey || f.id;
  return { type: "text", text: data[sourceKey] ?? "－" };
}

function resolveTokenValue(token, ctx, data) {
  const { type, id } = parseToken(token);

  if (type === "M") {
    const m = METRIC_BY_ID[id];
    return { kind: "text", label: m?.label || id, text: data?.[m?.sourceKey] ?? "－" };
  }

  if (type === "I") {
    const rv = resolveInfoValueById(id, ctx);
    if (rv.type === "tags") return { kind: "tags", label: INFO_BY_ID[id]?.label || id, html: rv.html };
    return { kind: "text", label: INFO_BY_ID[id]?.label || id, text: rv.text };
  }

  return { kind: "text", label: id, text: "－" };
}

/* =========================
   商品情報描画
========================= */
function buildInfoGrid(container, ctx, data, tokens) {
  if (!container) return;
  container.innerHTML = "";

  const list = tokens ?? zoneState.info;
  if (!list || list.length === 0) {
    container.style.display = "none";
    return;
  }
  container.style.display = "grid";

  list.forEach((tok) => {
    const v = resolveTokenValue(tok, ctx, data);

    const k = document.createElement("div");
    k.className = "k";
    k.textContent = v.label;

    const val = document.createElement("div");
    val.className = "v";

    if (v.kind === "tags") {
      val.classList.add("v-tags");
      val.innerHTML = v.html;
    } else {
      val.textContent = v.text;
    }

    container.appendChild(k);
    container.appendChild(val);
  });
}

function buildInfoGridSplit(containerA, containerB, ctx, data) {
  const tokens = [...zoneState.info];
  const mid = Math.ceil(tokens.length / 2);
  const first = tokens.slice(0, mid);
  const second = tokens.slice(mid);

  buildInfoGrid(containerA, ctx, data, first);
  buildInfoGrid(containerB, ctx, data, second);
}

/* =========================
   真ん中 / 下段
========================= */
function buildCenterList(container, ctx, data) {
  if (!container) return;
  container.innerHTML = "";

  zoneState.center.forEach((tok) => {
    const v = resolveTokenValue(tok, ctx, data);

    const row = document.createElement("div");
    row.className = "metric-row";
    row.innerHTML = `
      <div class="label">${v.label}</div>
      <div class="value">${v.kind === "tags" ? "" : (v.text ?? "－")}</div>
    `;

    if (v.kind === "tags") {
      const valueEl = row.querySelector(".value");
      valueEl.classList.add("v-tags");
      valueEl.innerHTML = v.html;
    }

    container.appendChild(row);
  });
}

function buildDetailTable(tableEl, ctx, data) {
  if (!tableEl) return;
  const theadRow = tableEl.querySelector("thead tr");
  const tbodyRow = tableEl.querySelector("tbody tr");
  theadRow.innerHTML = "";
  tbodyRow.innerHTML = "";

  zoneState.table.forEach((tok) => {
    const v = resolveTokenValue(tok, ctx, data);

    const th = document.createElement("th");
    th.textContent = v.label;
    theadRow.appendChild(th);

    const td = document.createElement("td");
    td.className = "info-td";

    if (v.kind === "tags") {
      td.classList.add("info-td-tags");
      td.innerHTML = v.html;
    } else {
      const span = document.createElement("div");
      span.className = "info-td-scroll";
      span.textContent = v.text;
      td.appendChild(span);
    }

    tbodyRow.appendChild(td);
  });
}

function rerenderAllCards() {
  const isThird = document.body.classList.contains("third-layout");

  cardState.forEach((v) => {
    const asin = v.el.dataset.asin;
    const jpAsin = v.data["日本ASIN"] || "－";
    const usAsin = v.data["アメリカASIN"] || asin || "－";
    const realW = v.data["重量kg"] ?? v.data["重量（kg）"] ?? v.data["重量"] ?? "";
    const volW = v.data["容積重量"] ?? "";
    const size = v.data["サイズ"] || "－";
    const weight = `${fmtKg(realW)}（${fmtKg(volW)}）`;
    const ctx = { asin, jpAsin, usAsin, size, weight, data: v.data };

    if (isThird) {
      buildInfoGridSplit(
        v.el.querySelector(".js-infoGridA"),
        v.el.querySelector(".js-infoGridB"),
        ctx,
        v.data
      );
    } else {
      buildInfoGrid(v.el.querySelector(".js-infoGrid"), ctx, v.data);
    }

    buildCenterList(v.el.querySelector(".js-center"), ctx, v.data);
    buildDetailTable(v.el.querySelector(".js-detailTable"), ctx, v.data);
  });

  updateImportantMarks();
}

/* =========================
   チャート
========================= */
function renderChart(canvas) {
  const labels = Array.from({ length: 180 }, (_, i) => `${180 - i}日`);
  const rank = labels.map(() => 52000 + (Math.random() - 0.5) * 8000);
  const sellers = labels.map(() => Math.max(1, Math.round(1 + Math.random() * 8)));
  const price = labels.map(() => 22 + (Math.random() - 0.5) * 8);

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "ランキング", data: rank, yAxisID: "y", tension: 0.25 },
        { label: "セラー数", data: sellers, yAxisID: "y1", tension: 0.25 },
        { label: "価格(USD)", data: price, yAxisID: "y2", tension: 0.25 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: true } },
      scales: {
        y: { position: "left" },
        y1: { position: "right", grid: { drawOnChartArea: false } },
        y2: { position: "right", grid: { drawOnChartArea: false } }
      }
    }
  });

  return chart;
}

function updateChartVisibility(chart, showDS, showSP) {
  chart.data.datasets.forEach((ds) => {
    if (ds.label === "ランキング") ds.hidden = !showDS;
    if (ds.label === "セラー数") ds.hidden = !(showDS || showSP);
    if (ds.label === "価格(USD)") ds.hidden = !showSP;
  });
  chart.update();
}

/* =========================
   カート
========================= */
function updateCartSummary() {
  let totalCost = 0;
  let totalRevenueJPY = 0;
  let asinCount = cart.size;
  let itemCount = 0;

  cart.forEach((v) => {
    const qty = Math.max(1, Number(v.qty || 1));
    const sellUSD = Number(v.sellUSD || 0);
    const costJPY = Number(v.costJPY || 0);

    itemCount += qty;
    totalCost += costJPY * qty;
    totalRevenueJPY += sellUSD * FX_RATE * qty;
  });

  const profit = totalRevenueJPY - totalCost;

  cartTotalCost.textContent = fmtJPY(totalCost);
  cartTotalRevenue.textContent = fmtJPY(totalRevenueJPY);
  cartTotalProfit.textContent = fmtJPY(profit);
  cartAsinCount.textContent = String(asinCount);
  cartItemCount.textContent = String(itemCount);
}

/* =========================
   カード生成
========================= */
function createProductCard(asin, data) {
  const card = document.createElement("section");
  card.className = "product-card card";
  card.dataset.asin = asin;

  const isAltLayout = document.body.classList.contains("alt-layout");
  const isThirdLayout = document.body.classList.contains("third-layout");

  if (isThirdLayout) {
    card.innerHTML = `
      <div class="card-top">
        <div class="title">ASIN: ${asin} <span class="important-badge" style="display:none" title="重要視項目を満たしています">🔥</span></div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="layout3-grid">
        <!-- 商品画像 -->
        <div class="l3-image l3-block">
          <div class="head">商品画像</div>
          <div class="image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
          </div>
        </div>

        <!-- 商品情報① -->
        <div class="l3-infoA l3-block">
          <div class="head">商品情報①</div>
          <div class="info-grid js-infoGridA"></div>
        </div>

        <!-- 商品情報② -->
        <div class="l3-infoB l3-block">
          <div class="head">商品情報②</div>
          <div class="info-grid js-infoGridB"></div>
        </div>

        <!-- 主要項目 -->
        <div class="l3-center l3-block">
          <div class="head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <!-- カート（右縦） -->
        <div class="l3-buy">
          <div class="buy-title">数量</div>
          <select class="js-qty">
            <option value="1" selected>1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <div class="buy-title" style="margin-top:10px;">販売価格（$）</div>
          <input class="js-sell" type="number" step="0.01" placeholder="例: 39.99" />

          <div class="buy-title" style="margin-top:10px;">仕入れ額（￥）</div>
          <input class="js-cost" type="number" step="1" placeholder="例: 3700" />

          <button class="cart-btn js-addCart" type="button" style="margin-top:12px;">カートに入れる</button>
        </div>

        <!-- keepa（小） -->
        <div class="l3-keepa l3-block">
          <div class="head">keepaグラフ</div>
          <div class="keepa-mini">
            <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
          </div>
        </div>

        <!-- 需要供給（大） -->
        <div class="l3-mes l3-block">
          <div class="head">需要供給グラフ（180日）</div>

          <div class="graph-options js-graphOptions" style="margin-bottom:10px;">
            <label><input type="checkbox" class="js-chkDS" checked />《需要＆供給》</label>
            <label><input type="checkbox" class="js-chkSP" />《供給＆価格》</label>
          </div>

          <div class="mes-big">
            <canvas class="js-chart"></canvas>
          </div>
        </div>
      </div>

      <div class="detail-wrap">
        <div class="detail-head"><div class="t">その他項目</div></div>
        <div class="detail-scroll">
          <table class="detail-table js-detailTable">
            <thead><tr></tr></thead>
            <tbody><tr></tr></tbody>
          </table>
        </div>
      </div>
    `;
  } else {
    // 既存：alt / 通常
    card.innerHTML = isAltLayout
      ? `
      <div class="card-top">
        <div class="title">ASIN: ${asin} <span class="important-badge" style="display:none" title="重要視項目を満たしています">🔥</span></div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="alt-grid">
        <div class="alt-left">
          <div class="alt-image image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
          </div>

          <div class="alt-info info-box">
            <div class="info-grid js-infoGrid"></div>
          </div>
        </div>

        <div class="alt-center center-box">
          <div class="center-head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <div class="alt-graph graph-box">
          <div class="graph-head">
            <div class="graph-title">グラフ（180日）</div>
          </div>

          <div class="graph-options js-graphOptions">
            <label><input type="checkbox" class="js-chkDS" checked />《需要＆供給》</label>
            <label><input type="checkbox" class="js-chkSP" />《供給＆価格》</label>
          </div>

          <div class="graph-body">
            <div class="keepa-wrap js-keepaWrap">
              <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
            </div>

            <div class="canvas-wrap js-mesWrap">
              <canvas class="js-chart"></canvas>
            </div>
          </div>
        </div>

        <div class="alt-buy buy-box">
          <div class="buy-title">数量</div>
          <select class="js-qty">
            <option value="1" selected>1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>

          <div class="buy-title">販売価格（$）</div>
          <input class="js-sell" type="number" step="0.01" placeholder="例: 39.99" />

          <div class="buy-title">仕入れ額（￥）</div>
          <input class="js-cost" type="number" step="1" placeholder="例: 3700" />

          <button class="cart-btn js-addCart" type="button">カートに入れる</button>
        </div>
      </div>

      <div class="detail-wrap">
        <div class="detail-head"><div class="t">その他項目</div></div>
        <div class="detail-scroll">
          <table class="detail-table js-detailTable">
            <thead><tr></tr></thead>
            <tbody><tr></tr></tbody>
          </table>
        </div>
      </div>
    `
      : `
      <div class="card-top">
        <div class="title">ASIN: ${asin} <span class="important-badge" style="display:none" title="重要視項目を満たしています">🔥</span></div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="summary-row">
        <div class="left-wrap">
          <div class="image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />

            <div class="field">
              <label>数量</label>
              <select class="js-qty">
                <option value="1" selected>1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
              </select>

              <label>販売価格（$）</label>
              <input class="js-sell" type="number" step="0.01" placeholder="例: 39.99" />

              <label>仕入れ額（￥）</label>
              <input class="js-cost" type="number" step="1" placeholder="例: 3700" />

              <button class="cart-btn js-addCart" type="button">カートに入れる</button>
            </div>
          </div>

          <div class="info-box">
            <div class="info-grid js-infoGrid"></div>
          </div>
        </div>

        <div class="center-box">
          <div class="center-head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <div class="graph-box">
          <div class="graph-head">
            <div class="graph-title">グラフ（180日）</div>
            <div class="switch">
              <button type="button" class="js-btnMes active">MES-AI-A</button>
              <button type="button" class="js-btnKeepa">Keepa</button>
            </div>
          </div>

          <div class="graph-options js-graphOptions">
            <label><input type="checkbox" class="js-chkDS" checked />《需要＆供給》</label>
            <label><input type="checkbox" class="js-chkSP" />《供給＆価格》</label>
          </div>

          <div class="graph-body">
            <div class="canvas-wrap js-mesWrap">
              <canvas class="js-chart"></canvas>
            </div>
            <div class="keepa-wrap js-keepaWrap" style="display:none;">
              <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-wrap">
        <div class="detail-head"><div class="t">その他項目</div></div>
        <div class="detail-scroll">
          <table class="detail-table js-detailTable">
            <thead><tr></tr></thead>
            <tbody><tr></tr></tbody>
          </table>
        </div>
      </div>
    `;
  }

  // remove
  card.querySelector(".remove").addEventListener("click", () => {
    if (cart.has(asin)) {
      cart.delete(asin);
      updateCartSummary();
    }
    if (card.__chart) card.__chart.destroy();
    card.remove();
    cardState.delete(asin);

    if (cardState.size === 0) emptyState.style.display = "block";
    updateHeaderStatus();
    updateImportantMarks();
  });

  // inputs
  const sellInput = card.querySelector(".js-sell");
  const costInput = card.querySelector(".js-cost");

  if (data["販売額（ドル）"]) {
    const s = String(data["販売額（ドル）"]).replace(/[^\d.]/g, "");
    if (s) sellInput.value = s;
  }
  if (data["仕入れ目安単価"]) {
    const c = String(data["仕入れ目安単価"]).replace(/[^\d]/g, "");
    if (c) costInput.value = c;
  }

  card.querySelector(".js-addCart").addEventListener("click", () => {
    const qty = Math.max(1, Number(card.querySelector(".js-qty").value || 1));
    const sellUSD = num(sellInput.value);
    const costJPY = num(costInput.value);

    if (sellUSD <= 0) return alert("販売価格（$）を入力してください");
    if (costJPY <= 0) return alert("仕入れ額（￥）を入力してください");

    cart.set(asin, { qty, sellUSD, costJPY });
    updateCartSummary();
  });

  // ctx
  const jpAsin = data["日本ASIN"] || "－";
  const usAsin = data["アメリカASIN"] || asin;
  const realW = data["重量kg"] ?? data["重量（kg）"] ?? data["重量"] ?? "";
  const volW = data["容積重量"] ?? "";
  const size = data["サイズ"] || "－";
  const weight = `${fmtKg(realW)}（${fmtKg(volW)}）`;
  const ctx = { asin, jpAsin, usAsin, size, weight, data };

  // info
  if (isThirdLayout) {
    buildInfoGridSplit(card.querySelector(".js-infoGridA"), card.querySelector(".js-infoGridB"), ctx, data);
  } else {
    buildInfoGrid(card.querySelector(".js-infoGrid"), ctx, data);
  }

  // center / table
  buildCenterList(card.querySelector(".js-center"), ctx, data);
  buildDetailTable(card.querySelector(".js-detailTable"), ctx, data);

  // chart
  const canvas = card.querySelector(".js-chart");
  const chart = renderChart(canvas);
  card.__chart = chart;

  const chkDS = card.querySelector(".js-chkDS");
  const chkSP = card.querySelector(".js-chkSP");
  const refreshVis = () => updateChartVisibility(chart, chkDS.checked, chkSP.checked);
  chkDS?.addEventListener("change", refreshVis);
  chkSP?.addEventListener("change", refreshVis);
  updateChartVisibility(chart, true, false);

  // keepa
  const keepaFrame = card.querySelector(".js-keepaFrame");
  if (keepaFrame) keepaFrame.src = `https://keepa.com/#!product/1-${asin}`;

  // 通常レイアウトのみ：トグル維持
  if (!isAltLayout && !isThirdLayout) {
    const keepaWrap = card.querySelector(".js-keepaWrap");
    const mesWrap = card.querySelector(".js-mesWrap");
    const graphOptions = card.querySelector(".js-graphOptions");
    const btnMes = card.querySelector(".js-btnMes");
    const btnKeepa = card.querySelector(".js-btnKeepa");

    function setMode(mode) {
      if (mode === "MES") {
        btnMes.classList.add("active");
        btnKeepa.classList.remove("active");
        graphOptions.style.display = "flex";
        mesWrap.style.display = "block";
        keepaWrap.style.display = "none";
      } else {
        btnKeepa.classList.add("active");
        btnMes.classList.remove("active");
        graphOptions.style.display = "none";
        mesWrap.style.display = "none";
        keepaWrap.style.display = "block";
      }
    }
    btnMes.addEventListener("click", () => setMode("MES"));
    btnKeepa.addEventListener("click", () => setMode("KEEPA"));
    setMode("MES");
  }

  updateImportantMarks();
  return card;
}
