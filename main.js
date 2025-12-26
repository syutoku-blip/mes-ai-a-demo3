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

/* =========================
   Sort UI
========================= */
function initSortUI() {
  if (!sortBar) return;

  addSortRuleBtn?.addEventListener("click", () => {
    sortRules.push({ keyToken: zoneState.center[0] || tokM(METRICS_ALL[0].id), dir: "desc" });
    renderSortControls();
  });

  applySortBtn?.addEventListener("click", () => {
    applySort();
  });

  clearSortBtn?.addEventListener("click", () => {
    sortRules = [];
    renderSortControls();
  });

  renderSortControls();
}

function renderSortControls() {
  if (!sortControls) return;
  sortControls.innerHTML = "";

  if (sortRules.length === 0) {
    const p = document.createElement("div");
    p.style.fontSize = "12px";
    p.style.color = "#64748b";
    p.textContent = "条件が未設定です。";
    sortControls.appendChild(p);
    return;
  }

  sortRules.forEach((r, idx) => {
    const row = document.createElement("div");
    row.className = "sort-row";

    const sel = document.createElement("select");
    // 候補：centerに置けるもの（METRICS_ALL + INFO_FIELDS_ALL）
    const candidates = [
      ...METRICS_ALL.map((m) => tokM(m.id)),
      ...INFO_FIELDS_ALL.map((f) => tokI(f.id))
    ];
    candidates.forEach((tok) => {
      const opt = document.createElement("option");
      opt.value = tok;
      opt.textContent = labelOf(tok);
      if (tok === r.keyToken) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener("change", () => {
      r.keyToken = sel.value;
    });

    const dir = document.createElement("select");
    const o1 = document.createElement("option");
    o1.value = "desc";
    o1.textContent = "降順";
    const o2 = document.createElement("option");
    o2.value = "asc";
    o2.textContent = "昇順";
    dir.appendChild(o1);
    dir.appendChild(o2);
    dir.value = r.dir;
    dir.addEventListener("change", () => {
      r.dir = dir.value;
    });

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "削除";
    del.addEventListener("click", () => {
      sortRules.splice(idx, 1);
      renderSortControls();
    });

    row.appendChild(sel);
    row.appendChild(dir);
    row.appendChild(del);
    sortControls.appendChild(row);
  });
}

function applySort() {
  // itemsContainer内のカードを、sortRulesで並べ替え
  const cards = Array.from(itemsContainer.querySelectorAll(".product-card"));
  const isThird = document.body.classList.contains("third-layout");
  const isFourth = document.body.classList.contains("fourth-layout");

  const getValueFromToken = (tok, asin) => {
    const st = cardState.get(asin);
    if (!st) return -Infinity;
    const ctx = (() => {
      const data = st.data;
      const jpAsin = data["日本ASIN"] || "－";
      const usAsin = data["アメリカASIN"] || asin || "－";
      const realW = data["重量kg"] ?? data["重量（kg）"] ?? data["重量"] ?? "";
      const volW = data["容積重量"] ?? "";
      const size = data["サイズ"] || "－";
      const weight = `${fmtKg(realW)}（${fmtKg(volW)}）`;
      return { asin, jpAsin, usAsin, size, weight, data };
    })();
    const v = resolveTokenValue(tok, ctx, st.data);
    // numeric優先
    const n = Number(String(v.text ?? "").replace(/[^\d.\-]/g, ""));
    if (Number.isFinite(n)) return n;
    return String(v.text ?? "").length ? 0 : -Infinity;
  };

  cards.sort((a, b) => {
    const asinA = a.dataset.asin;
    const asinB = b.dataset.asin;

    for (const r of sortRules) {
      const va = getValueFromToken(r.keyToken, asinA);
      const vb = getValueFromToken(r.keyToken, asinB);
      if (va === vb) continue;
      const diff = va > vb ? 1 : -1;
      return r.dir === "asc" ? diff : -diff;
    }
    return 0;
  });

  // DOMに反映
  cards.forEach((c) => itemsContainer.appendChild(c));

  // レイアウト3/4の場合は上部再描画も合わせる（見た目崩れ防止）
  if (isThird || isFourth) rerenderAllCards();
}

/* =========================
   Actions
========================= */
function initActions() {
  metricsCollapseBtn?.addEventListener("click", () => {
    metricsBar.classList.toggle("collapsed");
    metricsCollapseBtn.textContent = metricsBar.classList.contains("collapsed")
      ? "展開する"
      : "折りたたむ";
  });

  resetBtn?.addEventListener("click", () => {
    zoneState.pool = [...DEFAULT_ZONES.pool];
    zoneState.info = [...DEFAULT_ZONES.info];
    zoneState.center = [...DEFAULT_ZONES.center];
    zoneState.table = [...DEFAULT_ZONES.table];
    zoneState.hidden = [...DEFAULT_ZONES.hidden];
    renderTopZones();
    rerenderAllCards();
    renderSortControls();
  });

  clearCardsBtn?.addEventListener("click", () => {
    itemsContainer.innerHTML = "";
    cardState.forEach((v) => v.el.__chart?.destroy?.());
    cardState.clear();
    emptyState.style.display = "block";
    updateHeaderStatus();
  });

  clearCartBtn?.addEventListener("click", () => {
    cart.clear();
    updateCartSummary();
  });
}

/* =========================
   Catalog
========================= */
function initCatalog() {
  if (!asinCatalog) return;

  // ASIN_DATA は asin-data.js で定義
  const asins = Object.keys(window.ASIN_DATA || {});
  asins.forEach((asin) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "asin-pill";
    pill.textContent = asin;
    pill.addEventListener("click", () => addCard(asin));
    asinCatalog.appendChild(pill);
  });
}

/* =========================
   Zone DnD
========================= */
function attachZoneDnD(zoneEl, { zoneKey }) {
  if (!zoneEl) return;

  zoneEl.addEventListener("dragstart", (e) => {
    const item = e.target.closest(".metric-tile");
    if (!item) return;
    e.dataTransfer.setData("text/plain", JSON.stringify({
      token: item.dataset.token,
      from: zoneKey
    }));
    e.dataTransfer.effectAllowed = "move";
  });

  zoneEl.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  zoneEl.addEventListener("drop", (e) => {
    e.preventDefault();
    let payload;
    try {
      payload = JSON.parse(e.dataTransfer.getData("text/plain"));
    } catch {
      return;
    }
    const { token, from } = payload;
    if (!token || !from) return;

    // 同じtokenは1つだけ
    removeTokenEverywhere(token);

    // drop先に追加
    zoneState[zoneKey].push(token);

    // 送信元からは削除（念のため）
    if (from !== zoneKey) {
      zoneState[from] = zoneState[from].filter((t) => t !== token);
    }

    renderTopZones();
    rerenderAllCards();
    renderSortControls();
  });
}

function removeTokenEverywhere(token) {
  Object.keys(zoneState).forEach((k) => {
    zoneState[k] = zoneState[k].filter((t) => t !== token);
  });
}

/* =========================
   Render top zones
========================= */
function renderTopZones() {
  renderZone(zonePool, zoneState.pool, { zoneKey: "pool" });
  renderZone(zoneInfo, zoneState.info, { zoneKey: "info" });
  renderZone(zoneCenter, zoneState.center, { zoneKey: "center" });
  renderZone(zoneTable, zoneState.table, { zoneKey: "table" });
  renderZone(zoneHidden, zoneState.hidden, { zoneKey: "hidden" });
}

function renderZone(el, tokens, { zoneKey }) {
  if (!el) return;
  el.innerHTML = "";

  tokens.forEach((token) => {
    const tile = document.createElement("div");
    tile.className = "metric-tile";
    tile.draggable = true;
    tile.dataset.token = token;

    const name = document.createElement("div");
    name.className = "metric-name";
    name.textContent = labelOf(token);

    const hint = document.createElement("div");
    hint.className = "metric-hint";
    hint.textContent = zoneKey === "pool" ? "ドラッグして配置" : "ドラッグで移動";

    tile.appendChild(name);
    tile.appendChild(hint);
    el.appendChild(tile);
  });
}

/* =========================
   Card add/remove
========================= */
function addCard(asin) {
  const data = window.ASIN_DATA?.[asin];
  if (!data) return alert("ASINデータが見つかりません");

  emptyState.style.display = "none";

  // 既に表示中ならスクロール
  if (cardState.has(asin)) {
    cardState.get(asin).el.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  const card = createProductCard(asin, data);
  itemsContainer.appendChild(card);

  cardState.set(asin, { el: card, data });

  updateHeaderStatus();
}

function updateHeaderStatus() {
  if (!headerStatus) return;
  headerStatus.textContent = `表示中: ${cardState.size}件 / カート: ${cart.size}件`;
}

/* =========================
   値解決
========================= */
function resolveTokenValue(token, ctx, data) {
  const { type, id } = parseToken(token);
  if (type === "M") return resolveMetric(id, data);
  if (type === "I") return resolveInfoField(id, ctx, data);
  return { label: id, text: "" };
}

function resolveMetric(id, data) {
  const m = METRIC_BY_ID[id];
  const label = m?.label || id;
  const raw = m?.sourceKey ? data[m.sourceKey] : "";
  return { label, text: raw ?? "－" };
}

function resolveInfoField(id, ctx, data) {
  const f = INFO_BY_ID[id];
  const label = f?.label || id;

  if (f?.kind === "computedTitle") {
    return { label, text: data["品名"] || data["商品名"] || "－" };
  }
  if (f?.kind === "computed") {
    if (id === "各種ASIN") {
      return { label, text: `${ctx.asin} / ${ctx.jpAsin} / ${ctx.usAsin}` };
    }
    if (id === "サイズ") {
      return { label, text: ctx.size || "－" };
    }
    if (id === "重量（容積重量）") {
      return { label, text: ctx.weight || "－" };
    }
    if (id === "カテゴリ") {
      const a = data["親カテゴリ"] || "－";
      const b = data["サブカテゴリ"] || "－";
      return { label, text: `${a} / ${b}` };
    }
    return { label, text: "－" };
  }
  if (f?.kind === "computedTags") {
    const raw = String(data["注意事項（警告系）"] || "");
    const items = raw.split(/[,、]/).map((s) => s.trim()).filter(Boolean);
    if (!items.length) return { label, kind: "tags", html: "" };
    const html = items.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");
    return { label, kind: "tags", html };
  }
  // text
  const raw = f?.sourceKey ? data[f.sourceKey] : "";
  return { label, text: raw ?? "－" };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================
   レイアウト別：上部表示
========================= */
function buildInfoGrid(container, ctx, data) {
  if (!container) return;
  container.innerHTML = "";

  zoneState.info.forEach((tok) => {
    const v = resolveTokenValue(tok, ctx, data);

    const tile = document.createElement("div");
    tile.className = "info-tile";

    const label = document.createElement("div");
    label.className = "info-label";
    label.textContent = v.label;

    const value = document.createElement("div");
    value.className = "info-value";

    if (v.kind === "tags") {
      value.classList.add("v-tags");
      value.innerHTML = v.html;
    } else {
      value.textContent = v.text ?? "－";
    }

    tile.appendChild(label);
    tile.appendChild(value);
    container.appendChild(tile);
  });
}

// layout3: infoを半分ずつ2カラムに分割
function buildInfoGridSplit(containerA, containerB, ctx, data) {
  if (!containerA || !containerB) return;
  containerA.innerHTML = "";
  containerB.innerHTML = "";

  const tokens = [...zoneState.info];
  const half = Math.ceil(tokens.length / 2);
  const left = tokens.slice(0, half);
  const right = tokens.slice(half);

  const renderTo = (container, list) => {
    list.forEach((tok) => {
      const v = resolveTokenValue(tok, ctx, data);

      const tile = document.createElement("div");
      tile.className = "info-tile";

      const label = document.createElement("div");
      label.className = "info-label";
      label.textContent = v.label;

      const value = document.createElement("div");
      value.className = "info-value";

      if (v.kind === "tags") {
        value.classList.add("v-tags");
        value.innerHTML = v.html;
      } else {
        value.textContent = v.text ?? "－";
      }

      tile.appendChild(label);
      tile.appendChild(value);
      container.appendChild(tile);
    });
  };

  renderTo(containerA, left);
  renderTo(containerB, right);
}

function buildCenterList(container, ctx, data) {
  if (!container) return;
  container.innerHTML = "";

  zoneState.center.forEach((tok) => {
    const v = resolveTokenValue(tok, ctx, data);

    const row = document.createElement("div");
    row.className = "metric-row";

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = v.label;

    const value = document.createElement("div");
    value.className = "value";
    value.textContent = v.text ?? "－";

    row.appendChild(label);
    row.appendChild(value);
    container.appendChild(row);
  });
}

// layout4: 真ん中をカード風
function buildCenterCards(container, ctx, data) {
  if (!container) return;
  container.innerHTML = "";

  zoneState.center.forEach((tok) => {
    const v = resolveTokenValue(tok, ctx, data);

    const card = document.createElement("div");
    card.className = "center-metric-card";

    const t = document.createElement("div");
    t.className = "t";
    t.textContent = v.label;

    const val = document.createElement("div");
    val.className = "v";
    val.textContent = v.text ?? "－";

    card.appendChild(t);
    card.appendChild(val);
    container.appendChild(card);
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
  const isFourth = document.body.classList.contains("fourth-layout");

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

    if (isFourth) {
      buildCenterCards(v.el.querySelector(".js-centerCards"), ctx, v.data);
    } else {
      buildCenterList(v.el.querySelector(".js-center"), ctx, v.data);
    }
    buildDetailTable(v.el.querySelector(".js-detailTable"), ctx, v.data);
  });
}

/* =========================
   チャート
========================= */
function renderChart(canvas) {
  const labels = Array.from({ length: 180 }, (_, i) => `${180 - i}日`);

  // ▼Keepaっぽい「相関のある」ダミー生成（需要・供給・価格の動き）
  // ルール：
  // - ランキングが上がる（数値が大きくなる）→ セラー増 → 価格は下がりやすい
  // - ランキングが下がる（数値が小さくなる）→ セラー減 → 少し遅れて価格が上がりやすい
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rnd = (a, b) => a + Math.random() * (b - a);

  const R_MIN = 48000;
  const R_MAX = 68000;
  const S_MIN = 6;
  const S_MAX = 15;
  const P_MIN = 22;
  const P_MAX = 29;

  const rank = [];
  const sellers = [];
  const price = [];

  // rank: ランダムウォーク + たまにトレンド切替
  let r = rnd(56000, 64000);
  let drift = rnd(-220, 220);
  let driftLeft = Math.floor(rnd(16, 34));

  // sellers: rankに追随（少し遅れ＋段階感）
  let s = rnd(7, 10);

  // price: sellers増で下がり、sellers減で遅れて上がる
  let p = rnd(24.5, 27.5);

  for (let i = 0; i < labels.length; i++) {
    // --- rank ---
    driftLeft--;
    if (driftLeft <= 0) {
      drift = rnd(-260, 260);
      driftLeft = Math.floor(rnd(16, 34));
    }
    const noiseR = (Math.random() - 0.5) * 900;
    r = clamp(r + drift + noiseR, R_MIN, R_MAX);
    rank.push(Math.round(r));

    // 0..1（ランキングが高いほど1）
    const r01 = (r - R_MIN) / (R_MAX - R_MIN);

    // --- sellers ---
    const sTarget = S_MIN + r01 * (S_MAX - S_MIN);
    const noiseS = (Math.random() - 0.5) * 0.9;
    s = clamp(s * 0.78 + sTarget * 0.22 + noiseS, 1, 25);

    // Keepaっぽい階段感（0.5刻み）
    const sStep = Math.round(s * 2) / 2;
    sellers.push(sStep);

    // --- price ---
    // セラー減の“後追い”で価格が上がりやすい（4日遅れ）
    const lagIdx = Math.max(0, i - 4);
    const sLag = sellers[lagIdx] ?? sStep;

    const s01 = clamp((sStep - S_MIN) / (S_MAX - S_MIN), 0, 1);
    const sLag01 = clamp((sLag - S_MIN) / (S_MAX - S_MIN), 0, 1);

    // ベース：ランク↑で価格↓／セラー↑で価格↓
    // 追加：セラーが減ってきたら（遅れで）価格↑
    const pTarget =
      26.2
      - r01 * 2.6
      - s01 * 1.7
      + (1 - sLag01) * 2.0;

    const noiseP = (Math.random() - 0.5) * 0.35;
    p = clamp(p * 0.82 + (pTarget + noiseP) * 0.18, P_MIN, P_MAX);

    // Keepaっぽい階段感（0.1刻み）
    const pStep = Math.round(p * 10) / 10;
    price.push(pStep);
  }

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
        x: {
          ticks: {
            // 10日ごとに表示（見やすさ優先）
            callback: function (val, idx) {
              return (idx % 10 === 0) ? this.getLabelForValue(val) : "";
            }
          }
        },
        y: {
          position: "left",
          min: R_MIN,
          max: R_MAX
        },
        y1: {
          position: "right",
          min: S_MIN,
          max: S_MAX,
          grid: { drawOnChartArea: false }
        },
        y2: {
          position: "right",
          min: P_MIN,
          max: P_MAX,
          grid: { drawOnChartArea: false },
          offset: true
        }
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
  const isFourthLayout = document.body.classList.contains("fourth-layout");

  if (isThirdLayout) {
    card.innerHTML = `
      <div class="layout3-grid">
        <div class="l3-block l3-image">
          <div class="head">商品画像</div>
          <div class="image-box">
            <img class="js-img" alt="" />
          </div>
          <div class="image-meta">
            <div class="asin"><span>ASIN</span><b>${asin}</b></div>
            <button class="remove" type="button">削除</button>
          </div>
        </div>

        <div class="l3-block l3-infoA">
          <div class="head">商品情報①</div>
          <div class="info-grid js-infoGridA"></div>
        </div>

        <div class="l3-block l3-infoB">
          <div class="head">商品情報②</div>
          <div class="info-grid js-infoGridB"></div>
        </div>

        <div class="l3-buy">
          <div class="buy-title">仕入れ額（￥）</div>
          <input class="js-cost" type="number" placeholder="例: 3700" />
          <div class="buy-title">販売価格（$）</div>
          <input class="js-sell" type="number" placeholder="例: 39.99" />
          <div class="buy-title">数量</div>
          <input class="js-qty" type="number" value="1" min="1" />
          <button class="cart-btn js-addCart" type="button">カートに追加</button>

          <div class="keepa-link-wrap">
            <a class="keepa-link js-keepaLink" href="#" target="_blank" rel="noopener">Keepaを開く</a>
          </div>
        </div>

        <div class="l3-block l3-center">
          <div class="head">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <div class="l3-block l3-graph">
          <div class="graph-box">
            <div class="graph-head">
              <div class="graph-title">需要供給グラフ（180日）</div>
              <div class="switch js-graphSwitch">
                <button type="button" class="js-btnMES active">MES</button>
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

          <div class="detail-wrap">
            <div class="detail-head"><div class="t">その他項目</div></div>
            <div class="detail-scroll">
              <table class="detail-table js-detailTable">
                <thead><tr></tr></thead>
                <tbody><tr></tr></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (isFourthLayout) {
    card.innerHTML = `
      <div class="layout4-grid">
        <div class="l4-left">
          <div class="l4-block l4-image">
            <div class="head">商品画像</div>
            <div class="image-box">
              <img class="js-img" alt="" />
            </div>
            <div class="image-meta">
              <div class="asin"><span>ASIN</span><b>${asin}</b></div>
              <button class="remove" type="button">削除</button>
            </div>
          </div>

          <div class="l4-block l4-info">
            <div class="head">商品情報</div>
            <div class="info-grid js-infoGrid"></div>
          </div>
        </div>

        <div class="l4-block l4-center">
          <div class="head">主要項目</div>
          <div class="center-cards js-centerCards"></div>
        </div>

        <div class="l4-right">
          <div class="l4-buy">
            <div class="buy-title">仕入れ額（￥）</div>
            <input class="js-cost" type="number" placeholder="例: 3700" />
            <div class="buy-title">販売価格（$）</div>
            <input class="js-sell" type="number" placeholder="例: 39.99" />
            <div class="buy-title">数量</div>
            <input class="js-qty" type="number" value="1" min="1" />
            <button class="cart-btn js-addCart" type="button">カートに追加</button>

            <div class="keepa-link-wrap">
              <a class="keepa-link js-keepaLink" href="#" target="_blank" rel="noopener">Keepaを開く</a>
            </div>
          </div>

          <div class="l4-block l4-graph">
            <div class="graph-box">
              <div class="graph-head">
                <div class="graph-title">需要供給グラフ（180日）</div>
                <div class="switch js-graphSwitch">
                  <button type="button" class="js-btnMES active">MES</button>
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

            <div class="detail-wrap">
              <div class="detail-head"><div class="t">その他項目</div></div>
              <div class="detail-scroll">
                <table class="detail-table js-detailTable">
                  <thead><tr></tr></thead>
                  <tbody><tr></tr></tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (isAltLayout) {
    card.innerHTML = `
      <div class="alt-grid">
        <div class="alt-left">
          <div class="alt-image card">
            <div class="image-box">
              <img class="js-img" alt="" />
            </div>
            <div class="image-meta">
              <div class="asin"><span>ASIN</span><b>${asin}</b></div>
              <button class="remove" type="button">削除</button>
            </div>
          </div>

          <div class="alt-info card">
            <div class="h">商品情報</div>
            <div class="info-grid js-infoGrid"></div>
          </div>
        </div>

        <div class="alt-center card">
          <div class="h">主要項目</div>
          <div class="center-list js-center"></div>
        </div>

        <div class="alt-graph card">
          <div class="graph-box">
            <div class="graph-head">
              <div class="graph-title">需要供給グラフ（180日）</div>
              <div class="switch js-graphSwitch">
                <button type="button" class="js-btnMES active">MES</button>
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

        <div class="alt-buy">
          <p class="buy-title">仕入れ額（￥）</p>
          <input class="js-cost" type="number" placeholder="例: 3700" />
          <p class="buy-title">販売価格（$）</p>
          <input class="js-sell" type="number" placeholder="例: 39.99" />
          <p class="buy-title">数量</p>
          <input class="js-qty" type="number" value="1" min="1" />
          <button class="cart-btn js-addCart" type="button">カートに追加</button>

          <div class="keepa-link-wrap">
            <a class="keepa-link js-keepaLink" href="#" target="_blank" rel="noopener">Keepaを開く</a>
          </div>
        </div>
      </div>
    `;
  } else {
    // default layout
    card.innerHTML = `
      <div class="card-head">
        <div class="head-left">
          <div class="asin"><span>ASIN</span><b>${asin}</b></div>
          <div class="title js-title"></div>
        </div>
        <button class="remove" type="button">削除</button>
      </div>

      <div class="card-body">
        <div class="summary-row">
          <div class="image-box">
            <img class="js-img" alt="" />
          </div>

          <div class="info-grid js-infoGrid"></div>

          <div class="center">
            <div class="center-title">主要項目</div>
            <div class="center-list js-center"></div>
          </div>
        </div>

        <div class="buy-row">
          <div class="buy-box">
            <div class="buy-title">仕入れ額（￥）</div>
            <input class="js-cost" type="number" placeholder="例: 3700" />
          </div>
          <div class="buy-box">
            <div class="buy-title">販売価格（$）</div>
            <input class="js-sell" type="number" placeholder="例: 39.99" />
          </div>
          <div class="buy-box">
            <div class="buy-title">数量</div>
            <input class="js-qty" type="number" value="1" min="1" />
          </div>

          <button class="cart-btn js-addCart" type="button">カートに追加</button>

          <div class="keepa-link-wrap">
            <a class="keepa-link js-keepaLink" href="#" target="_blank" rel="noopener">Keepaを開く</a>
          </div>
        </div>

        <div class="graph-box">
          <div class="graph-head">
            <div class="graph-title">需要供給グラフ（180日）</div>
            <div class="switch js-graphSwitch">
              <button type="button" class="js-btnMES active">MES</button>
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

        <div class="detail-wrap">
          <div class="detail-head"><div class="t">その他項目</div></div>
          <div class="detail-scroll">
            <table class="detail-table js-detailTable">
              <thead><tr></tr></thead>
              <tbody><tr></tr></tbody>
            </table>
          </div>
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

  // image
  const img = card.querySelector(".js-img");
  const imgUrl = data["商品画像"] || "";
  img.src = imgUrl || "https://via.placeholder.com/300x300?text=No+Image";

  // title (default layout only)
  const titleEl = card.querySelector(".js-title");
  if (titleEl) titleEl.textContent = data["品名"] || data["商品名"] || "－";

  // info / center / table
  if (isThirdLayout) {
    buildInfoGridSplit(card.querySelector(".js-infoGridA"), card.querySelector(".js-infoGridB"), ctx, data);
  } else {
    buildInfoGrid(card.querySelector(".js-infoGrid"), ctx, data);
  }

  if (isFourthLayout) {
    buildCenterCards(card.querySelector(".js-centerCards"), ctx, data);
  } else {
    buildCenterList(card.querySelector(".js-center"), ctx, data);
  }

  buildDetailTable(card.querySelector(".js-detailTable"), ctx, data);

  // keepa links
  const keepaLink = card.querySelector(".js-keepaLink");
  const keepaUrl = data["Keepaリンク"] || "";
  if (keepaUrl) keepaLink.href = keepaUrl;
  else keepaLink.style.display = "none";

  const keepaFrame = card.querySelector(".js-keepaFrame");
  if (keepaFrame && keepaUrl) keepaFrame.src = keepaUrl;

  // graph switch
  const btnMES = card.querySelector(".js-btnMES");
  const btnKeepa = card.querySelector(".js-btnKeepa");
  const mesWrap = card.querySelector(".js-mesWrap");
  const keepaWrap = card.querySelector(".js-keepaWrap");
  btnMES?.addEventListener("click", () => {
    btnMES.classList.add("active");
    btnKeepa.classList.remove("active");
    mesWrap.style.display = "";
    keepaWrap.style.display = "none";
  });
  btnKeepa?.addEventListener("click", () => {
    btnKeepa.classList.add("active");
    btnMES.classList.remove("active");
    mesWrap.style.display = "none";
    keepaWrap.style.display = "";
  });

  // chart + visibility
  const canvas = card.querySelector(".js-chart");
  card.__chart = renderChart(canvas);

  const chkDS = card.querySelector(".js-chkDS");
  const chkSP = card.querySelector(".js-chkSP");

  const applyVis = () => {
    const showDS = !!chkDS?.checked;
    const showSP = !!chkSP?.checked;
    updateChartVisibility(card.__chart, showDS, showSP);
  };
  chkDS?.addEventListener("change", applyVis);
  chkSP?.addEventListener("change", applyVis);
  applyVis();

  return card;
}
