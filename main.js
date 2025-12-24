/**************************************************************
 * main.js
 * - レイアウト3追加（body.third-layout）
 * - 商品情報は商品情報枠（zoneState.info）を上から半分ずつで
 *   商品情報①/商品情報②に分割表示（レイアウト3のみ）
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

init();

function init() {
  initPoolUI();
  initCatalog();
  initSortUI();
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

    // ★tokenに ":" が含まれるため split(":") で壊れるのを回避
    // "item:M:粗利益" のような形を想定
    if (!raw.startsWith("item:")) return;
    const token = raw.slice("item:".length);

    // どこにあるか探して全部から削除（重複禁止）
    Object.keys(zoneState).forEach((k) => {
      zoneState[k] = zoneState[k].filter((x) => x !== token);
    });

    // 追加
    zoneState[zoneKey].push(token);

    renderTopZones();
    rerenderAllCards();
    renderSortControls();
  });
}

/* =========================
   sort
========================= */
function initSortUI() {
  renderSortControls();

  addSortRuleBtn?.addEventListener("click", () => {
    sortRules.push({ metricId: getSortableMetricIds()[0] || "", dir: "desc" });
    renderSortControls();
  });

  applySortBtn?.addEventListener("click", () => {
    applySortToCards();
  });

  clearSortBtn?.addEventListener("click", () => {
    sortRules = [];
    renderSortControls();
    rerenderAllCards(); // 元の順序に戻すなら、ここで再レンダリング
  });
}

function getSortableMetricIds() {
  return zoneState.center
    .map(parseToken)
    .filter((x) => x.type === "M")
    .map((x) => x.id);
}

function refreshSortRuleOptions() {
  // center枠が変わったら、ソート条件のmetricIdが存在するか見直す
  const allowed = new Set(getSortableMetricIds());
  sortRules = sortRules.filter((r) => allowed.has(r.metricId));
  renderSortControls();
}

function renderSortControls() {
  if (!sortBar || !sortControls) return;

  const metricOptions = getSortableMetricIds();
  if (metricOptions.length === 0) {
    sortBar.style.display = "none";
    return;
  }
  sortBar.style.display = "block";

  sortControls.innerHTML = "";

  sortRules.forEach((rule, idx) => {
    const row = document.createElement("div");
    row.className = "sort-rule";

    const selMetric = document.createElement("select");
    metricOptions.forEach((id) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = METRIC_BY_ID[id]?.label || id;
      if (rule.metricId === id) opt.selected = true;
      selMetric.appendChild(opt);
    });

    const selDir = document.createElement("select");
    [
      { v: "desc", t: "降順（大→小）" },
      { v: "asc", t: "昇順（小→大）" }
    ].forEach((x) => {
      const opt = document.createElement("option");
      opt.value = x.v;
      opt.textContent = x.t;
      if (rule.dir === x.v) opt.selected = true;
      selDir.appendChild(opt);
    });

    const btnDel = document.createElement("button");
    btnDel.type = "button";
    btnDel.className = "remove";
    btnDel.textContent = "削除";
    btnDel.addEventListener("click", () => {
      sortRules.splice(idx, 1);
      renderSortControls();
    });

    selMetric.addEventListener("change", () => (rule.metricId = selMetric.value));
    selDir.addEventListener("change", () => (rule.dir = selDir.value));

    row.appendChild(selMetric);
    row.appendChild(selDir);
    row.appendChild(btnDel);
    sortControls.appendChild(row);
  });
}

function applySortToCards() {
  const asins = Array.from(cardState.keys());
  if (!sortRules.length) return;

  asins.sort((a, b) => {
    const da = cardState.get(a)?.data || {};
    const db = cardState.get(b)?.data || {};

    for (const rule of sortRules) {
      const mk = METRIC_BY_ID[rule.metricId];
      if (!mk) continue;
      const va = num(da[mk.sourceKey]);
      const vb = num(db[mk.sourceKey]);
      if (va === vb) continue;
      return rule.dir === "asc" ? va - vb : vb - va;
    }
    return 0;
  });

  const nodes = new Map();
  itemsContainer.querySelectorAll(".product-card").forEach((n) => nodes.set(n.dataset.asin, n));
  itemsContainer.innerHTML = "";
  asins.forEach((asin) => {
    const node = nodes.get(asin);
    if (node) itemsContainer.appendChild(node);
  });
}

/* =========================
   再描画
========================= */
function rerenderAllCards() {
  cardState.forEach(({ el, data }) => {
    const asin = el.dataset.asin;

    // ctx
    const jpAsin = data["日本ASIN"] || "－";
    const usAsin = data["アメリカASIN"] || asin;
    const realW = data["重量kg"] ?? data["重量（kg）"] ?? data["重量"] ?? "";
    const volW = data["容積重量"] ?? "";
    const size = data["サイズ"] || "－";
    const weight = `${fmtKg(realW)}（${fmtKg(volW)}）`;
    const ctx = { asin, jpAsin, usAsin, size, weight, data };

    const isThirdLayout = document.body.classList.contains("third-layout");

    if (isThirdLayout) {
      buildInfoGridSplit(el.querySelector(".js-infoGridA"), el.querySelector(".js-infoGridB"), ctx, data);
    } else {
      buildInfoGrid(el.querySelector(".js-infoGrid"), ctx, data);
    }

    buildCenterList(el.querySelector(".js-center"), ctx, data);
    buildDetailTable(el.querySelector(".js-detailTable"), ctx, data);
  });
}

/* =========================
   値取得（商品情報）
========================= */
function getInfoValue(id, ctx, data) {
  switch (id) {
    case "商品名":
      return data["商品名"] || data["タイトル"] || "－";
    case "ブランド":
      return data["ブランド"] || "－";
    case "評価":
      return data["レビュー評価"] || "－";
    case "各種ASIN": {
      const a = ctx.asin || "－";
      const jp = ctx.jpAsin || "－";
      const us = ctx.usAsin || "－";
      return `JP:${jp} / US:${us} / ASIN:${a}`;
    }
    case "JAN":
      return data["JAN"] || "－";
    case "SKU":
      return data["SKU"] || "－";
    case "サイズ":
      return ctx.size || "－";
    case "重量（容積重量）":
      return ctx.weight || "－";
    case "カテゴリ":
      return data["カテゴリ"] || data["カテゴリー"] || "－";
    case "注意事項":
      return computeNoticeTags(data);
    case "材質":
      return data["材質"] || "－";
    default:
      return "－";
  }
}

function computeNoticeTags(data) {
  const tags = [];

  const title = String(data["商品名"] || data["タイトル"] || "");
  const cat = String(data["カテゴリ"] || data["カテゴリー"] || "");

  // 例：危険物/電池/液体などっぽいワードを拾う（必要に応じて拡張）
  const text = (title + " " + cat).toLowerCase();

  if (text.includes("battery") || text.includes("電池") || text.includes("リチウム")) tags.push("電池注意");
  if (text.includes("liquid") || text.includes("液体") || text.includes("オイル")) tags.push("液体注意");
  if (text.includes("magnet") || text.includes("磁石")) tags.push("磁石注意");
  if (text.includes("food") || text.includes("食品") || text.includes("drink") || text.includes("飲料")) tags.push("食品注意");

  return tags.length ? tags.join(" / ") : "－";
}

/* =========================
   値取得（指標）
========================= */
function getMetricValue(id, data) {
  const m = METRIC_BY_ID[id];
  if (!m) return "－";
  const v = data?.[m.sourceKey];

  // % 表示
  if (id.includes("率")) {
    const n = num(v);
    if (!n) return "－";
    return (n * 100).toFixed(0) + "%";
  }

  // 円表示（ざっくり）
  if (id.includes("金額") || id.includes("利益") || id.includes("最安値") || id.includes("仕入れ") || id === "送料" || id === "関税") {
    const n = num(v);
    if (!n) return "－";
    return fmtJPY(n);
  }

  if (v === undefined || v === null || v === "") return "－";
  return String(v);
}

/* =========================
   info UI
========================= */
function buildInfoGrid(el, ctx, data) {
  if (!el) return;
  el.innerHTML = "";

  zoneState.info
    .map(parseToken)
    .filter((x) => x.type === "I")
    .forEach(({ id }) => {
      const row = document.createElement("div");
      row.className = "info-row";

      const k = document.createElement("div");
      k.className = "k";
      k.textContent = INFO_BY_ID[id]?.label || id;

      const v = document.createElement("div");
      v.className = "v";
      v.textContent = getInfoValue(id, ctx, data);

      row.appendChild(k);
      row.appendChild(v);
      el.appendChild(row);
    });
}

// レイアウト3のみ：商品情報を半分ずつに分ける
function buildInfoGridSplit(elA, elB, ctx, data) {
  if (!elA || !elB) return;
  elA.innerHTML = "";
  elB.innerHTML = "";

  const items = zoneState.info
    .map(parseToken)
    .filter((x) => x.type === "I");

  const half = Math.ceil(items.length / 2);
  const top = items.slice(0, half);
  const bottom = items.slice(half);

  const put = (root, arr) => {
    arr.forEach(({ id }) => {
      const row = document.createElement("div");
      row.className = "info-row";

      const k = document.createElement("div");
      k.className = "k";
      k.textContent = INFO_BY_ID[id]?.label || id;

      const v = document.createElement("div");
      v.className = "v";
      v.textContent = getInfoValue(id, ctx, data);

      row.appendChild(k);
      row.appendChild(v);
      root.appendChild(row);
    });
  };

  put(elA, top);
  put(elB, bottom);
}

/* =========================
   center UI（主要項目）
========================= */
function buildCenterList(el, ctx, data) {
  if (!el) return;
  el.innerHTML = "";

  zoneState.center
    .map(parseToken)
    .filter((x) => x.type === "M")
    .forEach(({ id }) => {
      const box = document.createElement("div");
      box.className = "center-item";

      const k = document.createElement("div");
      k.className = "k";
      k.textContent = METRIC_BY_ID[id]?.label || id;

      const v = document.createElement("div");
      v.className = "v";
      v.textContent = getMetricValue(id, data);

      box.appendChild(k);
      box.appendChild(v);
      el.appendChild(box);
    });
}

/* =========================
   detail table（その他項目）
========================= */
function buildDetailTable(tableEl, ctx, data) {
  if (!tableEl) return;

  // どのレイアウトでも table 要素は同じ構造（thead/tbodyのtrがある前提）
  const theadTr = tableEl.querySelector("thead tr");
  const tbodyTr = tableEl.querySelector("tbody tr");
  if (!theadTr || !tbodyTr) return;

  theadTr.innerHTML = "";
  tbodyTr.innerHTML = "";

  zoneState.table
    .map(parseToken)
    .filter((x) => x.type === "M")
    .forEach(({ id }) => {
      const th = document.createElement("th");
      th.textContent = METRIC_BY_ID[id]?.label || id;
      theadTr.appendChild(th);

      const td = document.createElement("td");
      td.textContent = getMetricValue(id, data);
      tbodyTr.appendChild(td);
    });
}

/* =========================
   chart
========================= */
function renderChart(canvas) {
  if (!canvas) return null;

  // Chart.js を想定
  const ctx = canvas.getContext("2d");

  return new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "セラー数", data: [] },
        { label: "価格(USD)", data: [] },
        { label: "ランキング", data: [] }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: true } }
    }
  });
}

function updateChartVisibility(chart, showDemandSupply, showSupplyPrice) {
  if (!chart) return;

  // 需要＆供給: セラー数 + ランキング
  // 供給＆価格: セラー数 + 価格
  // セラー数は常に表示、あとはチェックに応じて
  chart.data.datasets[0].hidden = !(showDemandSupply || showSupplyPrice); // セラー数
  chart.data.datasets[1].hidden = !showSupplyPrice; // 価格
  chart.data.datasets[2].hidden = !showDemandSupply; // ランキング

  chart.update();
}

/* =========================
   cart summary
========================= */
function updateCartSummary() {
  let totalCost = 0;
  let totalRevenue = 0;
  let totalProfit = 0;
  let itemCount = 0;

  for (const { qty, sellUSD, costJPY } of cart.values()) {
    totalCost += costJPY * qty;
    totalRevenue += sellUSD * FX_RATE * qty;
    totalProfit += (sellUSD * FX_RATE - costJPY) * qty;
    itemCount += qty;
  }

  cartTotalCost.textContent = fmtJPY(totalCost);
  cartTotalRevenue.textContent = fmtJPY(totalRevenue);
  cartTotalProfit.textContent = fmtJPY(totalProfit);
  cartAsinCount.textContent = String(cart.size);
  cartItemCount.textContent = String(itemCount);
}

/* =========================
   product card
========================= */
function createProductCard(asin, data) {
  const card = document.createElement("section");
  card.className = "product-card card";
  card.dataset.asin = asin;

  const isAltLayout = document.body.classList.contains("alt-layout");
  const isThirdLayout = document.body.classList.contains("third-layout");
  const isFourthLayout = document.body.classList.contains("fourth-layout");

  if (isThirdLayout) {
    card.innerHTML = `
      <div class="card-top">
        <div class="title">ASIN: ${asin}</div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="layout3-grid">
        <div class="l3-image l3-block">
          <div class="head">商品画像</div>
          <div class="image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
          </div>
        </div>

        <div class="l3-infoA l3-block">
          <div class="head">商品情報①</div>
          <div class="info-grid js-infoGridA"></div>
        </div>

        <div class="l3-infoB l3-block">
          <div class="head">商品情報②</div>
          <div class="info-grid js-infoGridB"></div>
        </div>

        <div class="l3-center l3-block">
          <div class="head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <div class="l3-buy l3-block">
          <div class="head">数量</div>

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

        <div class="l3-keepa l3-block">
          <div class="head">keepaグラフ</div>
          <div class="keepa-mini">
            <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
          </div>
        </div>

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
  } else if (isFourthLayout) {
    // レイアウト4（画像参考：左=画像 / 中=商品情報 / 右=主要項目+カート / 左下=keepa / 下=需要供給）
    card.innerHTML = `
      <div class="card-top">
        <div class="title">ASIN: ${asin}</div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="layout4-grid">
        <div class="l4-image l4-block">
          <div class="head">商品画像</div>
          <div class="image-box">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
          </div>
        </div>

        <div class="l4-info l4-block">
          <div class="head">商品情報①</div>
          <div class="info-grid js-infoGrid"></div>
        </div>

        <div class="l4-center l4-block">
          <div class="head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <div class="l4-buy l4-block">
          <div class="head">数量</div>

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

        <div class="l4-keepa l4-block">
          <div class="head">keepaグラフ</div>
          <div class="keepa-mini">
            <iframe class="js-keepaFrame" src="" loading="lazy"></iframe>
          </div>
        </div>

        <div class="l4-mes l4-block">
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
        <div class="title">ASIN: ${asin}</div>
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
  if (!isAltLayout && !isThirdLayout && !isFourthLayout) {
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

  return card;
}
