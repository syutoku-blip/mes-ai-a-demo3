/* =========================================================
   MES-AI-A main.js - FINAL (UI fix + 商品情報も並び替え対応)
========================================================= */

/* =========================
   DOM
========================= */
const headerStatus = document.getElementById("headerStatus");
const asinCatalog = document.getElementById("asinCatalog");
const emptyState = document.getElementById("emptyState");
const itemsContainer = document.getElementById("itemsContainer");

const metricsBarEl = document.getElementById("metricsBar");
const metricsCollapseBtn = document.getElementById("metricsCollapseBtn");

const metricsPoolZone = document.getElementById("metricsPoolZone");
const metricsCenterZone = document.getElementById("metricsCenterZone");
const metricsTableZone = document.getElementById("metricsTableZone");
const metricsHiddenZone = document.getElementById("metricsHiddenZone");
const metricsInfoZone = document.getElementById("metricsInfoZone");

const metricsResetBtn = document.getElementById("metricsResetBtn");
const clearCardsBtn = document.getElementById("clearCardsBtn");
const clearCartBtn = document.getElementById("clearCartBtn");

/* sort UI（index.htmlに無い場合もあるのでnull許容） */
const sortRuleList = document.getElementById("sortRuleList");
const addSortRuleBtn = document.getElementById("addSortRuleBtn");
const applySortBtn = document.getElementById("applySortBtn");
const clearSortBtn = document.getElementById("clearSortBtn");

/* cart summary */
const cartTotalCostEl = document.getElementById("cartTotalCost");
const cartTotalRevenueEl = document.getElementById("cartTotalRevenue");
const cartTotalProfitEl = document.getElementById("cartTotalProfit");
const cartAsinCountEl = document.getElementById("cartAsinCount");
const cartItemCountEl = document.getElementById("cartItemCount");

/* =========================
   Globals
========================= */
const FX_USDJPY = 150; // 固定（将来UI化OK）

const METRICS_STORAGE_KEY = "MES_AI_METRICS_ZONES_V1";
const SORT_STORAGE_KEY = "MES_AI_SORT_RULES_V1";

const cardState = new Map(); // asin -> { el, data, chart, centerBox, tableEl, infoGridEl, ctx }
const cartState = new Map(); // asin -> { qty, sellUsd, costJpy, data }

function clone(obj){ return JSON.parse(JSON.stringify(obj)); }

/* =========================
   Helpers
========================= */
function safeNum(x){
  if (x === null || x === undefined) return 0;
  const n = Number(String(x).replace(/[^\d.\-]/g,""));
  return Number.isFinite(n) ? n : 0;
}

function fmtUSD(x){
  const n = safeNum(x);
  return "$" + n.toFixed(2);
}
function fmtJPY(x){
  const n = Math.round(safeNum(x));
  return n.toLocaleString("ja-JP") + "円";
}
function usdToJpy(usd){
  return safeNum(usd) * FX_USDJPY;
}
function fmtKg(x){
  const n = safeNum(x);
  if(!n) return "－";
  return n.toFixed(2) + "kg";
}

/* =========================
   Metrics 定義
========================= */
function metricById(id){
  return METRICS_ALL.find(m => m.id === id);
}

const METRICS_ALL = [
  { id: "過去3月FBA最安値", label: "過去3月FBA最安値", sourceKey: "過去3月FBA最安値" },
  { id: "FBA最安値", label: "FBA最安値", sourceKey: "FBA最安値" },
  { id: "日本最安値", label: "日本最安値", sourceKey: "日本最安値" },

  { id: "30日販売数", label: "30日販売数（実績）", sourceKey: "30日販売数" },
  { id: "90日販売数", label: "90日販売数（実績）", sourceKey: "90日販売数" },
  { id: "180日販売数", label: "180日販売数（実績）", sourceKey: "180日販売数" },
  { id: "予測30日販売数", label: "予測30日販売数", sourceKey: "予測30日販売数" },

  { id: "粗利益率予測", label: "粗利益率予測", sourceKey: "粗利益率予測" },
  { id: "粗利益予測", label: "粗利益予測（1個）", sourceKey: "粗利益予測" },

  { id: "在庫数", label: "在庫数", sourceKey: "在庫数" },
  { id: "返品率", label: "返品率", sourceKey: "返品率" },
  { id: "販売額（ドル）", label: "販売額（USD）", sourceKey: "販売額（ドル）" },
  { id: "入金額（円）", label: "入金額（円）", sourceKey: "入金額（円）" },
  { id: "入金額計（円）", label: "入金額計（円）", sourceKey: "入金額計（円）" },

  { id: "仕入れ目安単価", label: "仕入れ目安単価", sourceKey: "仕入れ目安単価" },
  { id: "想定送料", label: "想定送料", sourceKey: "想定送料" },
  { id: "送料", label: "送料", sourceKey: "送料" },
  { id: "関税", label: "関税", sourceKey: "関税" }
];

// =========================
// 商品情報（並び替え対象）
// =========================
const INFO_FIELDS = [
  { id: "ブランド", label: "ブランド" },
  { id: "評価", label: "評価" },
  { id: "ASIN", label: "ASIN" },
  { id: "各種ASIN", label: "各種ASIN" },
  { id: "JAN", label: "JAN" },
  { id: "SKU", label: "SKU" },
  { id: "サイズ", label: "サイズ" },
  { id: "重量（容積重量）", label: "重量（容積重量）" },
  { id: "材質", label: "材質" },
  { id: "カテゴリ", label: "カテゴリ" },
  { id: "注意事項", label: "注意事項" }
];
const INFO_BY_ID = Object.fromEntries(INFO_FIELDS.map(x => [x.id, x]));

/* =========================
   Zones
========================= */
const DEFAULT_ZONES = {
  pool: [
    "日本最安値","90日販売数","180日販売数",
    "入金額計（円）","仕入れ目安単価","想定送料","送料","関税"
  ],
  center: ["FBA最安値","過去3月FBA最安値","粗利益率予測","粗利益予測","予測30日販売数"],
  table: ["30日販売数","在庫数","返品率","販売額（ドル）","入金額（円）"],
  // 商品情報（デフォルトの順序は現状と同じ）
  info: INFO_FIELDS.map(x => x.id),
  hidden: []
};

function sanitizeZones(zones){
  const metricIds = METRICS_ALL.map(m => m.id);
  const infoIds = INFO_FIELDS.map(m => m.id);

  const z = { pool:[], center:[], table:[], hidden:[], info:[] };

  // metrics
  ["pool","center","table","hidden"].forEach(k => {
    z[k] = Array.isArray(zones?.[k]) ? zones[k].filter(id => metricIds.includes(id)) : [];
  });

  // info
  z.info = Array.isArray(zones?.info) ? zones.info.filter(id => infoIds.includes(id)) : [];

  const totalMetrics = z.pool.length + z.center.length + z.table.length + z.hidden.length;
  if (totalMetrics === 0) return clone(DEFAULT_ZONES);

  // 未配置指標は pool へ
  const used = new Set([...z.pool, ...z.center, ...z.table, ...z.hidden]);
  metricIds.forEach(id => { if (!used.has(id)) z.pool.push(id); });

  // 重複排除（metrics内）
  const seen = new Set();
  ["pool","center","table","hidden"].forEach(k => {
    z[k] = z[k].filter(id => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  });

  // info が空ならデフォルトに戻す
  if(!z.info.length){
    z.info = [...DEFAULT_ZONES.info];
  }else{
    // info 内の重複排除
    const s2 = new Set();
    z.info = z.info.filter(id => {
      if(s2.has(id)) return false;
      s2.add(id);
      return true;
    });
  }

  return z;
}

let ZONES = (() => {
  try{
    const raw = localStorage.getItem(METRICS_STORAGE_KEY);
    if(!raw) return clone(DEFAULT_ZONES);
    return sanitizeZones(JSON.parse(raw));
  }catch{
    return clone(DEFAULT_ZONES);
  }
})();

function saveZones(){
  localStorage.setItem(METRICS_STORAGE_KEY, JSON.stringify(ZONES));
}

/* =========================
   Drag & Drop（指標プール）
========================= */
function getBeforeIdInZone(containerEl, clientX, clientY){
  const pills = [...containerEl.querySelectorAll(".metric-pill")];
  if(!pills.length) return null;

  let best = null;
  let bestDist = Infinity;

  for(const p of pills){
    const r = p.getBoundingClientRect();
    const cx = (r.left + r.right) / 2;
    const cy = (r.top + r.bottom) / 2;
    const d = Math.hypot(clientX - cx, clientY - cy);
    if(d < bestDist){
      bestDist = d;
      best = p;
    }
  }
  if(!best) return null;

  const r = best.getBoundingClientRect();
  const dropOnLeft = clientX < (r.left + r.right) / 2;
  if(dropOnLeft) return best.dataset.itemId;

  const idx = pills.indexOf(best);
  if(idx >= 0 && idx + 1 < pills.length){
    return pills[idx + 1].dataset.itemId;
  }
  return null;
}

function removeFromZones(id, type){
  if(type === "info"){
    ZONES.info = (ZONES.info || []).filter(x => x !== id);
    return;
  }
  ["pool","center","table","hidden"].forEach(z => {
    ZONES[z] = ZONES[z].filter(x => x !== id);
  });
}

function moveItem(id, toZone, beforeId, type){
  removeFromZones(id, type);

  const list = ZONES[toZone] || (ZONES[toZone] = []);
  if(!beforeId) list.push(id);
  else{
    const idx = list.indexOf(beforeId);
    if(idx === -1) list.push(id);
    else list.splice(idx, 0, id);
  }

  saveZones();
  renderAllZones();
  rerenderAllCards();
  renderSortUI();
}

function attachZoneDrop(zoneListEl, zoneName, acceptType){
  const zoneBox = zoneListEl.parentElement;

  zoneBox.addEventListener("dragover", (e) => {
    const raw = e.dataTransfer.getData("text/plain") || "";
    if(acceptType && !raw.startsWith(acceptType + ":")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  zoneBox.addEventListener("drop", (e) => {
    const raw = e.dataTransfer.getData("text/plain") || "";
    if(acceptType && !raw.startsWith(acceptType + ":")) return;

    e.preventDefault();
    if(!raw) return;

    const [type, ...rest] = raw.split(":");
    const draggedId = rest.join(":");
    if(!draggedId) return;

    const beforeId = getBeforeIdInZone(zoneListEl, e.clientX, e.clientY);
    moveItem(draggedId, zoneName, beforeId, type);
  });
}

function renderZone(el, zoneName){
  el.innerHTML = "";
  ZONES[zoneName].forEach(id => {
    const m = metricById(id);
    if(!m) return;

    const pill = document.createElement("div");
    pill.className = "metric-pill";
    pill.textContent = m.label;
    pill.draggable = true;
    pill.dataset.metricId = id; // 既存互換
    pill.dataset.itemId = id;
    pill.dataset.itemType = "metric";

    pill.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", "metric:" + id);
      e.dataTransfer.effectAllowed = "move";
    });

    el.appendChild(pill);
  });
}

function renderInfoZone(el){
  el.innerHTML = "";
  (ZONES.info || []).forEach(id => {
    const m = INFO_BY_ID[id];
    if(!m) return;

    const pill = document.createElement("div");
    pill.className = "metric-pill";
    pill.textContent = m.label;
    pill.draggable = true;
    pill.dataset.itemId = id;
    pill.dataset.itemType = "info";

    pill.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", "info:" + id);
      e.dataTransfer.effectAllowed = "move";
    });

    el.appendChild(pill);
  });
}

function renderAllZones(){
  ZONES = sanitizeZones(ZONES);
  renderZone(metricsPoolZone, "pool");
  renderZone(metricsCenterZone, "center");
  renderZone(metricsTableZone, "table");
  renderInfoZone(metricsInfoZone);
  renderZone(metricsHiddenZone, "hidden");
}

/* =========================
   Sort
========================= */
let sortRules = [];

function saveSortRules(){
  localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(sortRules));
}
function loadSortRules(){
  try{
    const raw = localStorage.getItem(SORT_STORAGE_KEY);
    sortRules = raw ? JSON.parse(raw) : [];
    if(!Array.isArray(sortRules)) sortRules = [];
  }catch{
    sortRules = [];
  }
}
function getCenterMetricOptions(){
  return ZONES.center
    .map(id => metricById(id))
    .filter(Boolean)
    .map(m => ({ id: m.id, label: m.label, sourceKey: m.sourceKey }));
}

function renderSortUI(){
  if(!sortRuleList) return;
  sortRuleList.innerHTML = "";

  const options = getCenterMetricOptions();
  if(!options.length){
    sortRuleList.innerHTML = `<div class="muted">主要項目に指標がありません</div>`;
    return;
  }

  sortRules.forEach((r, idx) => {
    const row = document.createElement("div");
    row.className = "sort-row";

    const sel = document.createElement("select");
    options.forEach(op => {
      const o = document.createElement("option");
      o.value = op.id;
      o.textContent = op.label;
      if(op.id === r.metricId) o.selected = true;
      sel.appendChild(o);
    });

    const dir = document.createElement("select");
    dir.innerHTML = `
      <option value="desc">降順</option>
      <option value="asc">昇順</option>
    `;
    dir.value = r.dir || "desc";

    const rm = document.createElement("button");
    rm.type = "button";
    rm.textContent = "削除";
    rm.addEventListener("click", () => {
      sortRules.splice(idx, 1);
      saveSortRules();
      renderSortUI();
    });

    sel.addEventListener("change", () => {
      r.metricId = sel.value;
      saveSortRules();
    });
    dir.addEventListener("change", () => {
      r.dir = dir.value;
      saveSortRules();
    });

    row.appendChild(sel);
    row.appendChild(dir);
    row.appendChild(rm);
    sortRuleList.appendChild(row);
  });
}

/* =========================
   Build UI helpers
========================= */
function buildInfoGrid(infoGridEl, data, ctx){
  if(!infoGridEl) return;
  infoGridEl.innerHTML = "";

  const getVal = (id) => {
    switch(id){
      case "ブランド": return data["ブランド"] || "－";
      case "評価": return data["レビュー評価"] || "－";
      case "ASIN": return ctx.asin || "－";
      case "各種ASIN": return `日本: ${ctx.jpAsin || "－"} / US: ${ctx.usAsin || "－"}`;
      case "JAN": return data["JAN"] || "－";
      case "SKU": return data["SKU"] || "－";
      case "サイズ": return ctx.size || (data["サイズ"] || "－");
      case "重量（容積重量）": return ctx.weight || "－";
      case "材質": return data["材質"] || "－";
      case "カテゴリ": return `${data["親カテゴリ"] || "－"} / ${data["サブカテゴリ"] || "－"}`;
      case "注意事項": return data["注意事項（警告系）"] || "";
      default: return "－";
    }
  };

  (ZONES.info || DEFAULT_ZONES.info).forEach(id => {
    const def = INFO_BY_ID[id];
    if(!def) return;

    const k = document.createElement("div");
    k.className = "k";
    k.textContent = def.label;

    const v = document.createElement("div");
    v.className = "v";

    if(id === "注意事項"){
      const row = document.createElement("div");
      row.className = "warning-row";
      row.innerHTML = renderWarningTags(getVal(id));
      v.appendChild(row);
    }else{
      v.textContent = getVal(id);
    }

    infoGridEl.appendChild(k);
    infoGridEl.appendChild(v);
  });
}

function buildCenterMetrics(containerEl, data){
  containerEl.innerHTML = "";

  ZONES.center.forEach(id => {
    const m = metricById(id);
    if(!m) return;
    const v = data[m.sourceKey];

    const row = document.createElement("div");
    row.className = "metric-row";
    row.innerHTML = `
      <div class="label">${m.label}</div>
      <div class="value">${v ?? "－"}</div>
    `;
    containerEl.appendChild(row);
  });
}

function buildDetailTable(tableEl, data){
  const ids = ZONES.table.map(id => metricById(id)).filter(Boolean);
  const thead = ids.map(m => `<th>${m.label}</th>`).join("");
  const tds = ids.map(m => `<td>${data[m.sourceKey] ?? "－"}</td>`).join("");

  tableEl.innerHTML = `
    <table class="detail-table">
      <thead><tr>${thead}</tr></thead>
      <tbody><tr>${tds}</tr></tbody>
    </table>
  `;
}

function renderWarningTags(str){
  const s = String(str || "");
  if(!s) return "";
  const parts = s.split(/[,\s]+/).map(x => x.trim()).filter(Boolean);

  return parts.map(p => {
    if(p.includes("禁止")) return `<span class="badge red">${p}</span>`;
    if(p.includes("知財")) return `<span class="badge purple">${p}</span>`;
    if(p.includes("大型")) return `<span class="badge orange">${p}</span>`;
    return `<span class="badge purple">${p}</span>`;
  }).join("");
}

/* =========================
   Card Create
========================= */
function createProductCard(asin, data){
  const jpAsin = data["日本ASIN"] || "－";
  const usAsin = data["アメリカASIN"] || asin;

  const size = data["サイズ"] || "－";
  const weight = `${fmtKg(data["重量kg"])}（${fmtKg(data["容積重量"])}）`;

  const imgSrc = data["商品画像"] || "";

  const card = document.createElement("section");
  card.className = "item-card card";
  card.dataset.asin = asin;

  card.innerHTML = `
    <div class="item-topline">
      <div class="asin-title">ASIN: ${asin}</div>
      <div class="btns">
        <button type="button" class="js-removeCard">この行を削除</button>
      </div>
    </div>

    <div class="item-grid">
      <!-- LEFT -->
      <div class="left-box">
        <div class="img-box">
          <img src="${imgSrc}" alt="${asin}" />
        </div>

        <!-- 左カート枠は維持（右にも同じ枠があるので、必要なら削除OK） -->
        <div class="cart-box">
          <div class="field">
            <label>数量</label>
            <select class="js-qty">
              ${[...Array(10)].map((_,i)=>`<option value="${i+1}">${i+1}</option>`).join("")}
            </select>
          </div>

          <div class="field">
            <label>販売価格（$）</label>
            <input class="js-sellUsd" type="number" step="0.01" value="${safeNum(data["販売額（ドル）"]) || 0}" />
          </div>

          <div class="field">
            <label>仕入れ額（￥）</label>
            <input class="js-costJpy" type="number" step="1" value="${safeNum(data["仕入れ目安単価"]) || 0}" />
          </div>

          <button class="cart-btn js-addCart" type="button">カートに入れる</button>
        </div>

        <div class="info-box">
          <h3 class="info-title">${data["品名"] || "－"}</h3>
          <div class="info-grid js-infoGrid"></div>
        </div>
      </div>

      <!-- CENTER -->
      <div class="center-box">
        <div class="center-head">主要項目</div>
        <div class="center-list js-center"></div>
      </div>

      <!-- GRAPH -->
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

        <div class="graph-canvas-wrap">
          <canvas class="js-chart"></canvas>
        </div>
      </div>

      <!-- RIGHT CART -->
      <div class="cart-box">
        <div class="field">
          <label>数量</label>
          <select class="js-qty">
            ${[...Array(10)].map((_,i)=>`<option value="${i+1}">${i+1}</option>`).join("")}
          </select>
        </div>

        <div class="field">
          <label>販売価格（$）</label>
          <input class="js-sellUsd" type="number" step="0.01" value="${safeNum(data["販売額（ドル）"]) || 0}" />
        </div>

        <div class="field">
          <label>仕入れ額（￥）</label>
          <input class="js-costJpy" type="number" step="1" value="${safeNum(data["仕入れ目安単価"]) || 0}" />
        </div>

        <button class="cart-btn js-addCart" type="button">カートに入れる</button>
      </div>
    </div>

    <div class="detail-wrap">
      <div class="detail-head">
        <div class="t">その他項目</div>
      </div>
      <div class="detail-scroll js-detailTable"></div>
    </div>
  `;

  const centerBox = card.querySelector(".js-center");
  const tableEl = card.querySelector(".js-detailTable");
  const infoGridEl = card.querySelector(".js-infoGrid");

  // chart
  const canvas = card.querySelector(".js-chart");
  const chart = buildChart(canvas, data);

  buildCenterMetrics(centerBox, data);
  buildDetailTable(tableEl, data);
  buildInfoGrid(infoGridEl, data, { asin, jpAsin, usAsin, size, weight });

  // remove
  card.querySelector(".js-removeCard").addEventListener("click", () => {
    removeCard(asin);
  });

  // cart controls (左右2つの入力を同期)
  const qtyEls = card.querySelectorAll(".js-qty");
  const sellUsdEls = card.querySelectorAll(".js-sellUsd");
  const costJpyEls = card.querySelectorAll(".js-costJpy");
  const addCartBtns = card.querySelectorAll(".js-addCart");

  function syncQty(v){ qtyEls.forEach(el => el.value = v); }
  function syncSell(v){ sellUsdEls.forEach(el => el.value = v); }
  function syncCost(v){ costJpyEls.forEach(el => el.value = v); }

  qtyEls.forEach(el => el.addEventListener("change", () => syncQty(el.value)));
  sellUsdEls.forEach(el => el.addEventListener("input", () => syncSell(el.value)));
  costJpyEls.forEach(el => el.addEventListener("input", () => syncCost(el.value)));

  addCartBtns.forEach(btn => btn.addEventListener("click", () => {
    const qty = safeNum(qtyEls[0].value) || 1;
    const sellUsd = safeNum(sellUsdEls[0].value);
    const costJpy = safeNum(costJpyEls[0].value);
    putCart(asin, qty, sellUsd, costJpy, data);
  }));

  return { card, chart, centerBox, tableEl, infoGridEl, ctx: { asin, jpAsin, usAsin, size, weight } };
}

/* =========================
   Chart（ダミー）
========================= */
function buildChart(canvas, data){
  const labels = [...Array(180)].map((_,i)=>`${180-i}日`);
  const ds = labels.map(()=>Math.random()*100);
  const sp = labels.map(()=>Math.random()*100);

  return new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label:"ランキング", data: ds, borderWidth: 2, tension: .25 },
        { label:"セラー数", data: sp, borderWidth: 2, tension: .25 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true },
        tooltip: { enabled: true }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

/* =========================
   Card / Cart ops
========================= */
function removeCard(asin){
  const v = cardState.get(asin);
  if(!v) return;
  try{ v.chart.destroy(); }catch{}
  v.el.remove();
  cardState.delete(asin);

  if(cardState.size === 0){
    emptyState.style.display = "block";
  }
}

function rerenderAllCards(){
  cardState.forEach((v) => {
    buildCenterMetrics(v.centerBox, v.data);
    buildDetailTable(v.tableEl, v.data);
    buildInfoGrid(v.infoGridEl, v.data, v.ctx || {});
  });
}

function putCart(asin, qty, sellUsd, costJpy, data){
  cartState.set(asin, { qty, sellUsd, costJpy, data });
  updateCartSummary();
}

function updateCartSummary(){
  let totalCost = 0;
  let totalRev = 0;
  let totalProfit = 0;
  let totalItems = 0;

  cartState.forEach(v => {
    totalItems += v.qty;
    totalCost += v.costJpy * v.qty;
    totalRev += usdToJpy(v.sellUsd) * v.qty;
  });

  totalProfit = totalRev - totalCost;

  cartTotalCostEl.textContent = fmtJPY(totalCost);
  cartTotalRevenueEl.textContent = fmtJPY(totalRev);
  cartTotalProfitEl.textContent = fmtJPY(totalProfit);
  cartAsinCountEl.textContent = String(cartState.size);
  cartItemCountEl.textContent = String(totalItems);
}

function clearCart(){
  cartState.clear();
  updateCartSummary();
}

/* =========================
   Catalog
========================= */
function initCatalog(){
  asinCatalog.innerHTML = "";

  Object.keys(ASIN_DATA).forEach(asin => {
    const data = ASIN_DATA[asin];

    const box = document.createElement("div");
    box.className = "asin-item";
    box.innerHTML = `
      <div class="asin">${asin}</div>
      <div class="name">${data["品名"] || ""}</div>
    `;

    box.addEventListener("click", () => {
      addCard(asin);
    });

    asinCatalog.appendChild(box);
  });
}

function addCard(asin){
  if(cardState.has(asin)){
    headerStatus.textContent = "すでに表示中のASINです";
    setTimeout(()=>headerStatus.textContent="", 1200);
    return;
  }

  const data = ASIN_DATA[asin];
  if(!data) return;

  emptyState.style.display = "none";

  const { card, chart, centerBox, tableEl, infoGridEl, ctx } = createProductCard(asin, data);
  itemsContainer.prepend(card);
  cardState.set(asin, { el: card, data, chart, centerBox, tableEl, infoGridEl, ctx });
}

/* =========================
   Collapse
========================= */
function initCollapse(){
  if(!metricsCollapseBtn) return;
  metricsCollapseBtn.addEventListener("click", () => {
    metricsBarEl.classList.toggle("is-collapsed");
  });
}

/* =========================
   Buttons
========================= */
function wireButtons(){
  metricsResetBtn.addEventListener("click", () => {
    ZONES = clone(DEFAULT_ZONES);
    saveZones();
    renderAllZones();
    rerenderAllCards();
    renderSortUI();
  });

  clearCardsBtn.addEventListener("click", () => {
    itemsContainer.innerHTML = "";
    cardState.forEach(v => { try{ v.chart.destroy(); }catch{} });
    cardState.clear();
    emptyState.style.display = "block";
  });

  clearCartBtn.addEventListener("click", () => {
    clearCart();
  });

  if(addSortRuleBtn){
    addSortRuleBtn.addEventListener("click", () => {
      const opts = getCenterMetricOptions();
      if(!opts.length) return;
      sortRules.push({ metricId: opts[0].id, dir: "desc" });
      saveSortRules();
      renderSortUI();
    });
  }
  if(applySortBtn){
    applySortBtn.addEventListener("click", () => {
      headerStatus.textContent = "ソート設定を保存しました";
      setTimeout(()=>headerStatus.textContent="", 900);
    });
  }
  if(clearSortBtn){
    clearSortBtn.addEventListener("click", () => {
      sortRules = [];
      saveSortRules();
      renderSortUI();
    });
  }
}

/* =========================
   Boot
========================= */
function bootApp(){
  renderAllZones();

  attachZoneDrop(metricsPoolZone, "pool", "metric");
  attachZoneDrop(metricsCenterZone, "center", "metric");
  attachZoneDrop(metricsTableZone, "table", "metric");
  attachZoneDrop(metricsInfoZone, "info", "info");
  attachZoneDrop(metricsHiddenZone, "hidden", "metric");

  loadSortRules();
  renderSortUI();

  initCollapse();
  initCatalog();
  updateCartSummary();
  wireButtons();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootApp);
} else {
  bootApp();
}
