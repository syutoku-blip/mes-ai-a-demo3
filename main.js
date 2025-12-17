/**************************************************************
 * main.js
 * - 指標: ✅プール / ✅商品情報 / ✅真ん中 / ✅下段 / ✅非表示（重複不可）
 * - 商品情報(項目)カスタム: プール / 真ん中 / 下段 / 非表示（重複不可）
 * - 商品情報枠の値は横スクロール（CSS側）
 **************************************************************/

const $ = (sel, root=document) => root.querySelector(sel);
const FX_RATE = 155;

const fmtJPY = (n) => "￥" + Number(n || 0).toLocaleString("ja-JP");
const num = (v) => {
  const x = Number(String(v ?? "").replace(/[^\d.\-]/g, ""));
  return Number.isFinite(x) ? x : 0;
};
const fmtKg = (v) => {
  const x = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  if(!Number.isFinite(x) || x === 0) return "－";
  return x.toFixed(2) + "kg";
};

/* =========================
   指標（従来）
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

const METRIC_BY_ID = Object.fromEntries(METRICS_ALL.map(m => [m.id, m]));

/* =========================
   ✅ 商品情報（項目）候補
   （ユーザーが言ってる「商品情報枠」の項目）
========================= */
const INFO_FIELDS_ALL = [
  { id:"商品名", label:"商品名", kind:"computedTitle" },
  { id:"ブランド", label:"ブランド", kind:"text" },
  { id:"評価", label:"評価", kind:"text", sourceKey:"レビュー評価" },

  { id:"各種ASIN", label:"各種ASIN", kind:"computed" },
  { id:"JAN", label:"JAN", kind:"text" },
  { id:"SKU", label:"SKU", kind:"text" },

  { id:"サイズ", label:"サイズ", kind:"computed" },
  { id:"重量（容積重量）", label:"重量（容積重量）", kind:"computed" },

  { id:"カテゴリ", label:"カテゴリ", kind:"computed" },
  { id:"注意事項", label:"注意事項", kind:"computedTags" },
  { id:"材質", label:"材質", kind:"text" },
];

const INFO_BY_ID = Object.fromEntries(INFO_FIELDS_ALL.map(f => [f.id, f]));

/* =========================
   初期配置（指標）
   ✅ 5枠: pool / info / center / table / hidden
========================= */
const DEFAULT_ZONES = {
  pool: [
    "複数在庫指数45日分","複数在庫指数60日分","ライバル偏差1","ライバル偏差2","ライバル増加率",
    "在庫数","返品率",
    "販売額（ドル）","入金額（円）","入金額計（円）",
    "仕入れ目安単価","想定送料","送料","関税",
    "粗利益","粗利益率","日本最安値"
  ],
  info: [
    // ✅「商品情報枠」に出したい指標（初期例）
    "想定送料","送料","関税"
  ],
  center: [
    "過去3月FBA最安値","FBA最安値",
    "入金額予測","180日販売数","90日販売数",
    "粗利益率予測","30日販売数","日本最安値","粗利益予測"
  ],
  table: [
    "在庫数","想定送料","返品率","仕入れ目安単価",
    "販売額（ドル）","送料","関税","予測30日販売数","入金額（円）"
  ],
  hidden: []
};

const zoneState = {
  pool: [...DEFAULT_ZONES.pool],
  info: [...DEFAULT_ZONES.info],
  center: [...DEFAULT_ZONES.center],
  table: [...DEFAULT_ZONES.table],
  hidden: [...DEFAULT_ZONES.hidden],
};

/* =========================
   商品情報（項目）の初期配置（4枠）
========================= */
const DEFAULT_INFO_ZONES = {
  pool: ["商品名","ブランド","評価","各種ASIN","JAN","SKU","サイズ","重量（容積重量）","カテゴリ","注意事項","材質"],
  center: ["ブランド","評価","各種ASIN","JAN","SKU","サイズ","重量（容積重量）","カテゴリ","材質"],
  table: ["注意事項"],
  hidden: []
};

const infoZoneState = {
  pool: [...DEFAULT_INFO_ZONES.pool],
  center: [...DEFAULT_INFO_ZONES.center],
  table: [...DEFAULT_INFO_ZONES.table],
  hidden: [...DEFAULT_INFO_ZONES.hidden],
};

const cardState = new Map();
const cart = new Map();

/* ===== DOM refs ===== */
const metricsBar = $("#metricsBar");

/* 指標 5枠 */
const metricsPoolZone   = $("#metricsPoolZone");
const metricsInfoZone   = $("#metricsInfoZone");
const metricsCenterZone = $("#metricsCenterZone");
const metricsTableZone  = $("#metricsTableZone");
const metricsHiddenZone = $("#metricsHiddenZone");

/* 商品情報(項目) 4枠 */
const infoPoolZone   = $("#infoPoolZone");
const infoCenterZone = $("#infoCenterZone");
const infoTableZone  = $("#infoTableZone");
const infoHiddenZone = $("#infoHiddenZone");

const metricsCollapseBtn = $("#metricsCollapseBtn");
const metricsResetBtn = $("#metricsResetBtn");
const infoResetBtn = $("#infoResetBtn");

const clearCardsBtn = $("#clearCardsBtn");
const clearCartBtn = $("#clearCartBtn");

const asinCatalog = $("#asinCatalog");
const itemsContainer = $("#itemsContainer");
const emptyState = $("#emptyState");
const headerStatus = $("#headerStatus");

const cartTotalCost = $("#cartTotalCost");
const cartTotalRevenue = $("#cartTotalRevenue");
const cartTotalProfit = $("#cartTotalProfit");
const cartAsinCount = $("#cartAsinCount");
const cartItemCount = $("#cartItemCount");

/* sort */
const sortControls = $("#sortControls");
const addSortRuleBtn = $("#addSortRuleBtn");
const applySortBtn = $("#applySortBtn");
const clearSortBtn = $("#clearSortBtn");
let sortRules = [];

init();

function init(){
  initMetricsBar();
  initCatalog();
  initSortUI();
  initActions();
  updateCartSummary();
  updateHeaderStatus();
}

function initActions(){
  metricsCollapseBtn?.addEventListener("click", () => {
    metricsBar.classList.toggle("collapsed");
    metricsCollapseBtn.textContent = metricsBar.classList.contains("collapsed") ? "展開する" : "折りたたむ";
  });

  metricsResetBtn?.addEventListener("click", () => {
    zoneState.pool = [...DEFAULT_ZONES.pool];
    zoneState.info = [...DEFAULT_ZONES.info];
    zoneState.center = [...DEFAULT_ZONES.center];
    zoneState.table = [...DEFAULT_ZONES.table];
    zoneState.hidden = [...DEFAULT_ZONES.hidden];
    renderMetricsZones();
    rerenderAllCards();
  });

  infoResetBtn?.addEventListener("click", () => {
    infoZoneState.pool = [...DEFAULT_INFO_ZONES.pool];
    infoZoneState.center = [...DEFAULT_INFO_ZONES.center];
    infoZoneState.table = [...DEFAULT_INFO_ZONES.table];
    infoZoneState.hidden = [...DEFAULT_INFO_ZONES.hidden];
    renderInfoZones();
    rerenderAllCards();
  });

  clearCardsBtn?.addEventListener("click", () => {
    cardState.forEach((v) => {
      if(v.chart) v.chart.destroy();
      v.el.remove();
    });
    cardState.clear();
    itemsContainer.innerHTML = "";
    emptyState.style.display = "block";
    updateHeaderStatus();
  });

  clearCartBtn?.addEventListener("click", () => {
    cart.clear();
    updateCartSummary();
  });
}

function initCatalog(){
  const asins = Object.keys(window.ASIN_DATA || {});
  asinCatalog.innerHTML = "";
  asins.forEach(asin => {
    const b = document.createElement("button");
    b.className = "asin-pill";
    b.type = "button";
    b.textContent = asin;
    b.addEventListener("click", () => addOrFocusCard(asin));
    asinCatalog.appendChild(b);
  });
}

function addOrFocusCard(asin){
  const data = (window.ASIN_DATA || {})[asin];
  if(!data) return alert("データがありません: " + asin);

  if(cardState.has(asin)){
    cardState.get(asin).el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const card = createProductCard(asin, data);
  itemsContainer.appendChild(card);

  emptyState.style.display = "none";
  cardState.set(asin, { el: card, data, chart: card.__chart || null });

  updateHeaderStatus();
}

function updateHeaderStatus(){
  const count = cardState.size;
  if(headerStatus){
    headerStatus.textContent = count ? `表示中: ${count} ASIN` : "";
  }
}

/* =========================
   指標プール（✅5枠）
========================= */
function initMetricsBar(){
  renderMetricsZones();
  attachZoneDnD(metricsPoolZone,   { zoneKey:"pool",   accept:"metric" });
  attachZoneDnD(metricsInfoZone,   { zoneKey:"info",   accept:"metric" }); // ✅商品情報
  attachZoneDnD(metricsCenterZone, { zoneKey:"center", accept:"metric" });
  attachZoneDnD(metricsTableZone,  { zoneKey:"table",  accept:"metric" });
  attachZoneDnD(metricsHiddenZone, { zoneKey:"hidden", accept:"metric" });

  /* 商品情報（項目）4枠 */
  renderInfoZones();
  attachZoneDnD(infoPoolZone,   { zoneKey:"pool",   accept:"info" });
  attachZoneDnD(infoCenterZone, { zoneKey:"center", accept:"info" });
  attachZoneDnD(infoTableZone,  { zoneKey:"table",  accept:"info" });
  attachZoneDnD(infoHiddenZone, { zoneKey:"hidden", accept:"info" });
}

function renderMetricsZones(){
  renderMetricZone(metricsPoolZone, zoneState.pool);
  renderMetricZone(metricsInfoZone, zoneState.info);   // ✅商品情報
  renderMetricZone(metricsCenterZone, zoneState.center);
  renderMetricZone(metricsTableZone, zoneState.table);
  renderMetricZone(metricsHiddenZone, zoneState.hidden);
  refreshSortRuleOptions();
}

function renderMetricZone(zoneEl, list){
  if(!zoneEl) return;
  zoneEl.innerHTML = "";
  list.forEach(id => {
    const m = METRIC_BY_ID[id];
    if(!m) return;

    const pill = document.createElement("div");
    pill.className = "metric-pill";
    pill.draggable = true;
    pill.dataset.metricId = id;
    pill.textContent = m.label;

    pill.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", `metric:${id}`);
      e.dataTransfer.effectAllowed = "move";
    });

    zoneEl.appendChild(pill);
  });
}

/* ✅重複不可：移動時に全枠から除去→移動先へ */
function moveMetricToZone(metricId, toZone){
  for(const z of ["pool","info","center","table","hidden"]){
    const idx = zoneState[z].indexOf(metricId);
    if(idx >= 0) zoneState[z].splice(idx, 1);
  }
  zoneState[toZone].push(metricId);

  renderMetricsZones();
  rerenderAllCards();
}

/* =========================
   ✅ 商品情報(項目)プール（4枠）
========================= */
function renderInfoZones(){
  renderInfoZone(infoPoolZone, infoZoneState.pool);
  renderInfoZone(infoCenterZone, infoZoneState.center);
  renderInfoZone(infoTableZone, infoZoneState.table);
  renderInfoZone(infoHiddenZone, infoZoneState.hidden);
}

function renderInfoZone(zoneEl, list){
  if(!zoneEl) return;
  zoneEl.innerHTML = "";
  list.forEach(id => {
    const f = INFO_BY_ID[id];
    if(!f) return;

    const pill = document.createElement("div");
    pill.className = "metric-pill info-pill";
    pill.draggable = true;
    pill.dataset.infoId = id;
    pill.textContent = f.label;

    pill.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", `info:${id}`);
      e.dataTransfer.effectAllowed = "move";
    });

    zoneEl.appendChild(pill);
  });
}

/* ✅重複不可：移動時に全枠から除去→移動先へ */
function moveInfoToZone(infoId, toZone){
  for(const z of ["pool","center","table","hidden"]){
    const idx = infoZoneState[z].indexOf(infoId);
    if(idx >= 0) infoZoneState[z].splice(idx, 1);
  }
  infoZoneState[toZone].push(infoId);

  renderInfoZones();
  rerenderAllCards();
}

/* =========================
   DnD 共通
========================= */
function attachZoneDnD(zoneEl, { zoneKey, accept }){
  if(!zoneEl) return;

  zoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });
  zoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/plain");
    if(!raw) return;

    const [type, id] = raw.split(":");
    if(type !== accept || !id) return;

    if(type === "metric") moveMetricToZone(id, zoneKey);
    if(type === "info") moveInfoToZone(id, zoneKey);
  });
}

/* =========================
   Sort（中心枠の指標でソート）
========================= */
function initSortUI(){
  sortRules = [];
  renderSortControls();

  addSortRuleBtn?.addEventListener("click", () => {
    sortRules.push({ metricId: zoneState.center[0] || METRICS_ALL[0].id, order: "desc" });
    renderSortControls();
  });

  applySortBtn?.addEventListener("click", () => applySort());
  clearSortBtn?.addEventListener("click", () => {
    sortRules = [];
    renderSortControls();
  });
}

function renderSortControls(){
  if(!sortControls) return;
  sortControls.innerHTML = "";

  sortRules.forEach((r, idx) => {
    const row = document.createElement("div");
    row.className = "sort-row";

    const selMetric = document.createElement("select");
    selMetric.innerHTML = zoneState.center.map(id => {
      const m = METRIC_BY_ID[id];
      return `<option value="${id}" ${id===r.metricId ? "selected":""}>${m?.label || id}</option>`;
    }).join("");
    selMetric.addEventListener("change", () => { r.metricId = selMetric.value; });

    const selOrder = document.createElement("select");
    selOrder.innerHTML = `
      <option value="desc" ${r.order==="desc"?"selected":""}>降順</option>
      <option value="asc" ${r.order==="asc"?"selected":""}>昇順</option>
    `;
    selOrder.addEventListener("change", () => { r.order = selOrder.value; });

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

function refreshSortRuleOptions(){
  sortRules.forEach(r => {
    if(!zoneState.center.includes(r.metricId)){
      r.metricId = zoneState.center[0] || METRICS_ALL[0].id;
    }
  });
  renderSortControls();
}

function applySort(){
  if(sortRules.length === 0) return;

  const entries = Array.from(cardState.entries());
  const score = (data, metricId) => {
    const m = METRIC_BY_ID[metricId];
    if(!m) return -Infinity;
    const v = data[m.sourceKey];
    if(v == null) return -Infinity;
    const n = Number(String(v).trim().replace(/[^\d.\-]/g, ""));
    return Number.isFinite(n) ? n : -Infinity;
  };

  entries.sort((a, b) => {
    const da = a[1].data;
    const db = b[1].data;

    for(const r of sortRules){
      const va = score(da, r.metricId);
      const vb = score(db, r.metricId);
      if(va === vb) continue;
      if(r.order === "asc") return va - vb;
      return vb - va;
    }
    return 0;
  });

  entries.forEach(([_, v]) => itemsContainer.appendChild(v.el));
}

/* =========================
   描画（指標）
========================= */
function buildCenterMetrics(container, data){
  container.innerHTML = "";
  zoneState.center.forEach(id => {
    const m = METRIC_BY_ID[id];
    if(!m) return;
    const val = data[m.sourceKey];
    const row = document.createElement("div");
    row.className = "metric-row";
    row.innerHTML = `
      <div class="label">${m.label}</div>
      <div class="value">${val ?? "－"}</div>
    `;
    container.appendChild(row);
  });
}

function buildDetailTable(tableEl, data){
  const theadRow = tableEl.querySelector("thead tr");
  const tbodyRow = tableEl.querySelector("tbody tr");

  theadRow.innerHTML = "";
  tbodyRow.innerHTML = "";

  zoneState.table.forEach(id => {
    const m = METRIC_BY_ID[id];
    if(!m) return;
    const th = document.createElement("th");
    th.textContent = m.label;
    theadRow.appendChild(th);

    const td = document.createElement("td");
    td.textContent = data[m.sourceKey] ?? "－";
    tbodyRow.appendChild(td);
  });
}

/* ✅ 指標を「商品情報枠」に表示する領域 */
function buildInfoMetrics(container, data){
  if(!container) return;
  container.innerHTML = "";

  if(zoneState.info.length === 0){
    container.style.display = "none";
    return;
  }
  container.style.display = "flex";

  zoneState.info.forEach(id => {
    const m = METRIC_BY_ID[id];
    if(!m) return;

    const chip = document.createElement("div");
    chip.className = "info-metric-chip";
    chip.innerHTML = `
      <div class="k">${m.label}</div>
      <div class="v info-scroll">${data[m.sourceKey] ?? "－"}</div>
    `;
    container.appendChild(chip);
  });
}

function renderWarningTags(str){
  const s = (str || "").toString();
  const parts = s.split(/[,\s、]+/).map(x => x.trim()).filter(Boolean);
  if(parts.length === 0) return "";

  return parts.map(p => {
    let cls = "tag";
    if(p.includes("輸出不可") || p.includes("出荷禁止")) cls += " danger";
    else if(p.includes("知財")) cls += " info";
    else if(p.includes("大型")) cls += " warn";
    return `<span class="${cls}">${p}</span>`;
  }).join("");
}

/* =========================
   商品情報（値の解決）
========================= */
function resolveInfoValue(id, ctx){
  const f = INFO_BY_ID[id];
  if(!f) return { type:"text", text:"－" };

  const { asin, jpAsin, usAsin, size, weight, data } = ctx;

  const computed = {
    "商品名": data["品名"] || "－",
    "各種ASIN": `日本: ${jpAsin} / US: ${usAsin}`,
    "サイズ": size,
    "重量（容積重量）": weight,
    "カテゴリ": `${data["親カテゴリ"] || "－"} / ${data["サブカテゴリ"] || "－"}`,
    "注意事項": renderWarningTags(data["注意事項（警告系）"]),
  };

  if(f.kind === "computedTags"){
    return { type:"tags", html: computed[id] || "－" };
  }
  if(f.kind === "computed" || f.kind === "computedTitle"){
    return { type:"text", text: computed[id] || "－" };
  }

  const sourceKey = f.sourceKey || f.id;
  return { type:"text", text: (data[sourceKey] ?? "－") };
}

function buildInfoCenterGrid(gridEl, ctx){
  if(!gridEl) return;
  gridEl.innerHTML = "";

  // 商品名は見出しで出すので、grid側では除外（置きたい場合はここを外してOK）
  const list = infoZoneState.center.filter(x => x !== "商品名");

  list.forEach(id => {
    const k = document.createElement("div");
    k.className = "k";
    k.textContent = INFO_BY_ID[id]?.label || id;

    const v = document.createElement("div");
    v.className = "v info-scroll";

    const rv = resolveInfoValue(id, ctx);
    if(rv.type === "tags"){
      v.classList.add("v-tags");
      v.innerHTML = rv.html;
    }else{
      v.textContent = rv.text;
    }

    gridEl.appendChild(k);
    gridEl.appendChild(v);
  });
}

function buildInfoTable(tableEl, ctx){
  if(!tableEl) return;

  const theadRow = tableEl.querySelector("thead tr");
  const tbodyRow = tableEl.querySelector("tbody tr");
  theadRow.innerHTML = "";
  tbodyRow.innerHTML = "";

  infoZoneState.table.forEach(id => {
    const th = document.createElement("th");
    th.textContent = INFO_BY_ID[id]?.label || id;
    theadRow.appendChild(th);

    const td = document.createElement("td");
    td.className = "info-td";
    const rv = resolveInfoValue(id, ctx);

    if(rv.type === "tags"){
      td.classList.add("info-td-tags");
      td.innerHTML = rv.html;
    }else{
      const span = document.createElement("div");
      span.className = "info-td-scroll";
      span.textContent = rv.text;
      td.appendChild(span);
    }

    tbodyRow.appendChild(td);
  });

  const wrap = tableEl.closest(".info-table-wrap");
  if(wrap){
    wrap.style.display = infoZoneState.table.length ? "block" : "none";
  }
}

function rerenderAllCards(){
  cardState.forEach((v) => {
    const center = v.el.querySelector(".js-center");
    const table = v.el.querySelector(".js-detailTable");
    if(center) buildCenterMetrics(center, v.data);
    if(table) buildDetailTable(table, v.data);

    const asin = v.el.dataset.asin;
    const jpAsin = v.data["日本ASIN"] || "－";
    const usAsin = v.data["アメリカASIN"] || asin || "－";
    const realW = v.data["重量kg"] ?? v.data["重量（kg）"] ?? v.data["重量"] ?? "";
    const volW  = v.data["容積重量"] ?? "";
    const size  = v.data["サイズ"] || "－";
    const weight = `${fmtKg(realW)}（${fmtKg(volW)}）`;

    const ctx = { asin, jpAsin, usAsin, size, weight, data: v.data };

    const infoTitle = v.el.querySelector(".js-infoTitle");
    if(infoTitle){
      infoTitle.textContent = v.data["品名"] || "－";
    }

    const infoCenterGrid = v.el.querySelector(".js-infoCenterGrid");
    const infoTable = v.el.querySelector(".js-infoTable");
    if(infoCenterGrid) buildInfoCenterGrid(infoCenterGrid, ctx);
    if(infoTable) buildInfoTable(infoTable, ctx);

    // ✅商品情報枠に出す「指標」
    const infoMetrics = v.el.querySelector(".js-infoMetrics");
    if(infoMetrics) buildInfoMetrics(infoMetrics, v.data);
  });
}

/* =========================
   チャート
========================= */
function renderChart(canvas){
  const labels = Array.from({length: 180}, (_,i)=> `${180-i}日`);
  const rank = labels.map(() => 52000 + (Math.random()-0.5)*8000);
  const sellers = labels.map(() => Math.max(1, Math.round(1 + Math.random()*8)));
  const price = labels.map(() => 22 + (Math.random()-0.5)*8);

  const chart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "ランキング", data: rank, yAxisID:"y", tension: .25 },
        { label: "セラー数", data: sellers, yAxisID:"y1", tension: .25 },
        { label: "価格(USD)", data: price, yAxisID:"y2", tension: .25 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: true } },
      scales: {
        y: { position:"left", grid:{} },
        y1: { position:"right", grid:{ drawOnChartArea:false } },
        y2: { position:"right", grid:{ drawOnChartArea:false } },
      }
    }
  });

  return chart;
}

function updateChartVisibility(chart, showDS, showSP){
  chart.data.datasets.forEach(ds => {
    if(ds.label === "ランキング") ds.hidden = !showDS;
    if(ds.label === "セラー数") ds.hidden = !(showDS || showSP);
    if(ds.label === "価格(USD)") ds.hidden = !showSP;
  });
  chart.update();
}

/* =========================
   カート
========================= */
function updateCartSummary(){
  let totalCost = 0;
  let totalRevenueJPY = 0;
  let asinCount = cart.size;
  let itemCount = 0;

  cart.forEach(v => {
    const qty = Math.max(1, Number(v.qty || 1));
    const sellUSD = Number(v.sellUSD || 0);
    const costJPY = Number(v.costJPY || 0);

    itemCount += qty;
    totalCost += costJPY * qty;
    totalRevenueJPY += (sellUSD * FX_RATE) * qty;
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
function createProductCard(asin, data){
  const card = document.createElement("section");
  card.className = "product-card card";
  card.dataset.asin = asin;

  const isAltLayout = document.body.classList.contains("alt-layout");

  card.innerHTML = isAltLayout ? `
    <div class="card-top">
      <div class="title">ASIN: ${asin}</div>
      <button class="remove" type="button">この行を削除</button>
    </div>

    <div class="alt-grid">
      <div class="alt-left">
        <div class="alt-image image-box">
          <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
        </div>

        <div class="alt-info info-box">
          <h3 class="info-title js-infoTitle">${data["品名"] || "－"}</h3>

          <div class="info-grid js-infoCenterGrid"></div>

          <!-- ✅ 指標(商品情報枠) -->
          <div class="info-metrics js-infoMetrics"></div>

          <div class="info-table-wrap">
            <div class="info-table-title">商品情報（下段）</div>
            <div class="detail-scroll">
              <table class="detail-table info-table js-infoTable">
                <thead><tr></tr></thead>
                <tbody><tr></tr></tbody>
              </table>
            </div>
          </div>
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
      <div class="detail-head">
        <div class="t">その他項目</div>
      </div>
      <div class="detail-scroll">
        <table class="detail-table js-detailTable">
          <thead><tr></tr></thead>
          <tbody><tr></tr></tbody>
        </table>
      </div>
    </div>
  ` : `
    <div class="card-top">
      <div class="title">ASIN: ${asin}</div>
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
          <h3 class="info-title js-infoTitle">${data["品名"] || "－"}</h3>

          <div class="info-grid js-infoCenterGrid"></div>

          <!-- ✅ 指標(商品情報枠) -->
          <div class="info-metrics js-infoMetrics"></div>

          <div class="info-table-wrap">
            <div class="info-table-title">商品情報（下段）</div>
            <div class="detail-scroll">
              <table class="detail-table info-table js-infoTable">
                <thead><tr></tr></thead>
                <tbody><tr></tr></tbody>
              </table>
            </div>
          </div>
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
      <div class="detail-head">
        <div class="t">その他項目</div>
      </div>
      <div class="detail-scroll">
        <table class="detail-table js-detailTable">
          <thead><tr></tr></thead>
          <tbody><tr></tr></tbody>
        </table>
      </div>
    </div>
  `;

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

  card.querySelector(".remove").addEventListener("click", () => {
    if(cart.has(asin)){
      cart.delete(asin);
      updateCartSummary();
    }
    if(card.__chart) card.__chart.destroy();
    card.remove();
    cardState.delete(asin);

    if(cardState.size === 0){
      emptyState.style.display = "block";
    }
    updateHeaderStatus();
  });

  card.querySelector(".js-addCart").addEventListener("click", () => {
    const qty = Math.max(1, Number(card.querySelector(".js-qty").value || 1));
    const sellUSD = num(sellInput.value);
    const costJPY = num(costInput.value);

    if (sellUSD <= 0) return alert("販売価格（$）を入力してください");
    if (costJPY <= 0) return alert("仕入れ額（￥）を入力してください");

    cart.set(asin, { qty, sellUSD, costJPY });
    updateCartSummary();
  });

  // 指標
  buildCenterMetrics(card.querySelector(".js-center"), data);
  buildDetailTable(card.querySelector(".js-detailTable"), data);

  // 商品情報（center + table）
  const jpAsin = data["日本ASIN"] || "－";
  const usAsin = data["アメリカASIN"] || asin;
  const realW = data["重量kg"] ?? data["重量（kg）"] ?? data["重量"] ?? "";
  const volW  = data["容積重量"] ?? "";
  const size  = data["サイズ"] || "－";
  const weight = `${fmtKg(realW)}（${fmtKg(volW)}）`;
  const ctx = { asin, jpAsin, usAsin, size, weight, data };

  buildInfoCenterGrid(card.querySelector(".js-infoCenterGrid"), ctx);
  buildInfoTable(card.querySelector(".js-infoTable"), ctx);

  // ✅ 指標(商品情報枠)
  buildInfoMetrics(card.querySelector(".js-infoMetrics"), data);

  // chart
  const canvas = card.querySelector(".js-chart");
  const chart = renderChart(canvas);
  card.__chart = chart;

  const chkDS = card.querySelector(".js-chkDS");
  const chkSP = card.querySelector(".js-chkSP");
  const refreshVis = () => updateChartVisibility(chart, chkDS.checked, chkSP.checked);
  chkDS.addEventListener("change", refreshVis);
  chkSP.addEventListener("change", refreshVis);
  updateChartVisibility(chart, true, false);

  const keepaWrap = card.querySelector(".js-keepaWrap");
  const keepaFrame = card.querySelector(".js-keepaFrame");
  const mesWrap = card.querySelector(".js-mesWrap");
  const graphOptions = card.querySelector(".js-graphOptions");

  if (keepaFrame) keepaFrame.src = `https://keepa.com/#!product/1-${asin}`;

  if (isAltLayout) {
    if (graphOptions) graphOptions.style.display = "flex";
    if (mesWrap) mesWrap.style.display = "block";
    if (keepaWrap) keepaWrap.style.display = "block";
  } else {
    const btnMes = card.querySelector(".js-btnMes");
    const btnKeepa = card.querySelector(".js-btnKeepa");

    function setMode(mode){
      if(mode === "MES"){
        btnMes.classList.add("active");
        btnKeepa.classList.remove("active");
        graphOptions.style.display = "flex";
        mesWrap.style.display = "block";
        keepaWrap.style.display = "none";
      }else{
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

  return card;
}
