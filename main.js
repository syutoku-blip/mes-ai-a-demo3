/*************************************************************
 * MES-AI-A 商品分析（フロントだけで動く簡易版）
 * - 4レイアウト対応（index / alt / layout3 / layout4）
 * - ASIN_DATA（asin-data.js）から表示
 * - カート計算 / Keepa iframe / MES疑似グラフ（Chart.js）
 *************************************************************/

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* =========================
   Globals
========================= */
const itemsStack = $("#itemsStack");
const emptyState = $("#emptyState");
const headerStatus = $("#headerStatus");
const asinCatalog = $("#asinCatalog");

const cart = new Map(); // asin -> {qty, sell, cost}
const cardState = new Map(); // asin -> {data, dom}

/* =========================
   Metrics config (drag/drop)
   - 上部の5枠（プール/商品情報/真ん中/下段テーブル/非表示）
========================= */
const METRICS = [
  // ----- center metrics (真ん中の枠に置ける指標)
  { key: "価格", label: "価格（$）", type: "center", valueKey: "販売額（ドル）" },
  { key: "ランキング", label: "ランキング", type: "center", valueKey: "ランキング" },
  { key: "セラー数", label: "セラー数", type: "center", valueKey: "セラー数" },
  { key: "レビュー", label: "レビュー", type: "center", valueKey: "レビュー評価" },

  // ----- info metrics (商品情報の枠に置ける項目)
  { key: "品名", label: "品名", type: "info", valueKey: "品名" },
  { key: "ブランド", label: "ブランド", type: "info", valueKey: "ブランド" },
  { key: "カテゴリ", label: "カテゴリ", type: "info", valueKey: "親カテゴリ" },
  { key: "サブカテゴリ", label: "サブカテゴリ", type: "info", valueKey: "サブカテゴリ" },
  { key: "注意事項", label: "注意事項", type: "info", valueKey: "注意事項（警告系）" },

  // ----- table columns (下段テーブルに置けるその他項目)
  { key: "ASIN", label: "ASIN", type: "table", valueKey: "ASIN" },
  { key: "商品画像", label: "商品画像", type: "table", valueKey: "商品画像" },
  { key: "品名2", label: "品名", type: "table", valueKey: "品名" },
  { key: "親カテゴリ2", label: "親カテゴリ", type: "table", valueKey: "親カテゴリ" },
  { key: "サブカテゴリ2", label: "サブカテゴリ", type: "table", valueKey: "サブカテゴリ" },
  { key: "ブランド2", label: "ブランド", type: "table", valueKey: "ブランド" },
  { key: "レビュー評価2", label: "レビュー評価", type: "table", valueKey: "レビュー評価" },
  { key: "注意事項2", label: "注意事項", type: "table", valueKey: "注意事項（警告系）" },
];

const ZONES = {
  pool: $("#metricsPoolZone"),
  info: $("#metricsInfoZone"),
  center: $("#metricsCenterZone"),
  table: $("#metricsTableZone"),
  hidden: $("#metricsHiddenZone"),
};

const sortControls = $("#sortControls");
const addSortRuleBtn = $("#addSortRuleBtn");
const applySortBtn = $("#applySortBtn");
const clearSortBtn = $("#clearSortBtn");

const resetCurrentBtn = $("#resetCurrentBtn");
const clearCardsBtn = $("#clearCardsBtn");
const clearCartBtn = $("#clearCartBtn");

const metricsCollapseBtn = $("#metricsCollapseBtn");
const metricsBar = $("#metricsBar");

/* =========================
   Metric layout state
   - localStorage persist
========================= */
const STORAGE_KEY = "MES_METRICS_LAYOUT_V2";
const STORAGE_SORT_KEY = "MES_SORT_RULES_V1";

const DEFAULT_LAYOUT = {
  pool: ["価格", "ランキング", "セラー数", "レビュー", "品名", "ブランド", "カテゴリ", "サブカテゴリ", "注意事項"],
  info: [],
  center: [],
  table: [],
  hidden: [],
};

let layoutState = loadLayoutState();
let sortRules = loadSortRules();

/* =========================
   Init
========================= */
initMetricsBar();
initAsinCatalog();
renderAllCardsFromState();
updateCartSummary();
updateHeaderStatus();

/* =========================
   Metrics bar
========================= */
function initMetricsBar() {
  // collapse toggle
  metricsCollapseBtn.addEventListener("click", () => {
    metricsBar.classList.toggle("collapsed");
    metricsCollapseBtn.textContent = metricsBar.classList.contains("collapsed") ? "展開する" : "折りたたむ";
  });

  // reset
  resetCurrentBtn.addEventListener("click", () => {
    layoutState = JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
    saveLayoutState(layoutState);
    renderMetricsBar();
    renderAllCardsFromState();
  });

  // clear cards
  clearCardsBtn.addEventListener("click", () => {
    // destroy chart
    $$(".product-card").forEach((card) => {
      if (card.__chart) card.__chart.destroy();
      card.remove();
    });
    cardState.clear();
    if (itemsStack) itemsStack.innerHTML = "";
    emptyState.style.display = "block";
    updateHeaderStatus();
  });

  // clear cart
  clearCartBtn.addEventListener("click", () => {
    cart.clear();
    updateCartSummary();
    updateHeaderStatus();
  });

  // sort bar controls
  addSortRuleBtn.addEventListener("click", () => {
    sortRules.push({ metricKey: "ランキング", dir: "asc" });
    saveSortRules(sortRules);
    renderSortControls();
  });

  applySortBtn.addEventListener("click", () => {
    applySortToCards();
  });

  clearSortBtn.addEventListener("click", () => {
    sortRules = [];
    saveSortRules(sortRules);
    renderSortControls();
    // re-render (original insertion order kept by cardState keys)
    renderAllCardsFromState();
  });

  renderMetricsBar();
  renderSortControls();
}

function renderMetricsBar() {
  // clear zones
  Object.values(ZONES).forEach((z) => (z.innerHTML = ""));

  // build metric nodes from state
  const allKeys = Object.values(layoutState).flat();
  const unique = new Set(allKeys);

  // ensure any missing metrics go to pool
  METRICS.forEach((m) => {
    if (!unique.has(m.key)) {
      layoutState.pool.push(m.key);
    }
  });

  // render zones
  ["pool", "info", "center", "table", "hidden"].forEach((zoneName) => {
    layoutState[zoneName].forEach((key) => {
      const m = METRICS.find((x) => x.key === key);
      if (!m) return;
      const node = document.createElement("div");
      node.className = "metric-pill";
      node.draggable = true;
      node.dataset.metricKey = m.key;
      node.textContent = m.label;

      node.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", m.key);
        node.classList.add("dragging");
      });
      node.addEventListener("dragend", () => node.classList.remove("dragging"));

      ZONES[zoneName].appendChild(node);
    });
  });

  // setup drop zones
  Object.entries(ZONES).forEach(([zoneName, zoneEl]) => {
    zoneEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      zoneEl.classList.add("dragover");
    });
    zoneEl.addEventListener("dragleave", () => zoneEl.classList.remove("dragover"));
    zoneEl.addEventListener("drop", (e) => {
      e.preventDefault();
      zoneEl.classList.remove("dragover");

      const key = e.dataTransfer.getData("text/plain");
      moveMetricToZone(key, zoneName);
    });
  });
}

function moveMetricToZone(metricKey, zoneName) {
  // remove from all zones
  Object.keys(layoutState).forEach((z) => {
    layoutState[z] = layoutState[z].filter((k) => k !== metricKey);
  });

  // push to target
  layoutState[zoneName].push(metricKey);

  saveLayoutState(layoutState);
  renderMetricsBar();
  renderAllCardsFromState();
}

/* =========================
   Sort bar
========================= */
function loadSortRules() {
  try {
    const raw = localStorage.getItem(STORAGE_SORT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((x) => x && typeof x.metricKey === "string" && (x.dir === "asc" || x.dir === "desc"));
  } catch (e) {
    return [];
  }
}
function saveSortRules(rules) {
  try {
    localStorage.setItem(STORAGE_SORT_KEY, JSON.stringify(rules || []));
  } catch (e) {}
}

function renderSortControls() {
  sortControls.innerHTML = "";
  if (sortRules.length === 0) {
    const p = document.createElement("div");
    p.className = "sort-empty";
    p.textContent = "未設定（条件を追加してソートできます）";
    sortControls.appendChild(p);
    return;
  }

  sortRules.forEach((rule, idx) => {
    const row = document.createElement("div");
    row.className = "sort-row";

    const select = document.createElement("select");
    METRICS.filter((m) => m.type === "center").forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.key;
      opt.textContent = m.label;
      if (m.key === rule.metricKey) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => {
      sortRules[idx].metricKey = select.value;
      saveSortRules(sortRules);
    });

    const dir = document.createElement("select");
    [
      { v: "asc", t: "昇順" },
      { v: "desc", t: "降順" },
    ].forEach((d) => {
      const opt = document.createElement("option");
      opt.value = d.v;
      opt.textContent = d.t;
      if (d.v === rule.dir) opt.selected = true;
      dir.appendChild(opt);
    });
    dir.addEventListener("change", () => {
      sortRules[idx].dir = dir.value;
      saveSortRules(sortRules);
    });

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "削除";
    del.addEventListener("click", () => {
      sortRules.splice(idx, 1);
      saveSortRules(sortRules);
      renderSortControls();
    });

    row.appendChild(select);
    row.appendChild(dir);
    row.appendChild(del);
    sortControls.appendChild(row);
  });
}

function applySortToCards() {
  if (sortRules.length === 0) return;

  // create array of [asin, data]
  const arr = Array.from(cardState.entries()).map(([asin, st]) => ({ asin, data: st.data }));

  // sort with rules
  arr.sort((a, b) => {
    for (const rule of sortRules) {
      const m = METRICS.find((x) => x.key === rule.metricKey);
      if (!m) continue;

      const va = normalizeSortValue(a.data[m.valueKey]);
      const vb = normalizeSortValue(b.data[m.valueKey]);

      if (va < vb) return rule.dir === "asc" ? -1 : 1;
      if (va > vb) return rule.dir === "asc" ? 1 : -1;
    }
    return 0;
  });

  // re-render DOM in that order
  itemsStack.innerHTML = "";
  arr.forEach(({ asin }) => {
    const st = cardState.get(asin);
    if (st && st.dom) itemsStack.appendChild(st.dom);
  });
}

function normalizeSortValue(v) {
  if (v == null) return Infinity;
  const s = String(v);
  const num = parseFloat(s.replace(/[^\d.-]/g, ""));
  if (!isNaN(num)) return num;
  return s;
}

/* =========================
   Layout state persist
========================= */
function loadLayoutState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object") return JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
    // validate
    ["pool", "info", "center", "table", "hidden"].forEach((k) => {
      if (!Array.isArray(obj[k])) obj[k] = [];
    });
    return obj;
  } catch (e) {
    return JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
  }
}

function saveLayoutState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {}
}

/* =========================
   ASIN catalog
========================= */
function initAsinCatalog() {
  asinCatalog.innerHTML = "";
  Object.keys(ASIN_DATA).forEach((asin) => {
    const btn = document.createElement("button");
    btn.className = "asin-pill";
    btn.type = "button";
    btn.textContent = asin;
    btn.addEventListener("click", () => addCardByAsin(asin));
    asinCatalog.appendChild(btn);
  });
}

/* =========================
   Cards render / state
========================= */
function addCardByAsin(asin) {
  if (cardState.has(asin)) return; // already
  const data = ASIN_DATA[asin];
  if (!data) return;

  const card = createProductCard(asin, data);
  cardState.set(asin, { data, dom: card });

  emptyState.style.display = "none";
  itemsStack.appendChild(card);

  updateHeaderStatus();
}

function renderAllCardsFromState() {
  // if no cards, just show empty
  if (cardState.size === 0) {
    emptyState.style.display = "block";
    return;
  }

  itemsStack.innerHTML = "";
  for (const [asin, st] of cardState.entries()) {
    if (!st.dom) {
      st.dom = createProductCard(asin, st.data);
      cardState.set(asin, st);
    }
    itemsStack.appendChild(st.dom);
  }
  emptyState.style.display = "none";
}

function updateHeaderStatus() {
  const asinCount = cardState.size;
  const cartCount = cart.size;
  let totalQty = 0;
  cart.forEach((v) => (totalQty += v.qty || 0));

  headerStatus.textContent = `表示中: ${asinCount}件 / カート: ${cartCount}件（合計数量 ${totalQty}）`;
}

/* =========================
   Cart summary
========================= */
const cartCountEl = $("#cartCount");
const cartQtyEl = $("#cartQty");
const cartSalesEl = $("#cartSales");
const cartCostEl = $("#cartCost");
const cartProfitEl = $("#cartProfit");

function updateCartSummary() {
  cartCountEl.textContent = cart.size;

  let qty = 0,
    sales = 0,
    cost = 0;

  cart.forEach((v) => {
    qty += v.qty || 0;
    sales += (v.sell || 0) * (v.qty || 0);
    cost += (v.cost || 0) * (v.qty || 0);
  });

  cartQtyEl.textContent = qty;
  cartSalesEl.textContent = `$${sales.toFixed(2)}`;
  cartCostEl.textContent = `¥${Math.round(cost).toLocaleString()}`;

  const profit = sales * 150 - cost; // 仮の為替 150
  cartProfitEl.textContent = `¥${Math.round(profit).toLocaleString()}`;
}

/* =========================
   Create product card
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
        <div class="title-row">
          <div class="title">ASIN: ${asin}</div>
          <span class="memo-badge js-memoBadge" aria-hidden="true"></span>
          <button class="memo-btn js-memoBtn" type="button" title="メモ" aria-label="メモを開く">📝</button>
        </div>
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

        <div class="l3-buy">
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

        <div class="l3-graph l3-block">
          <div class="head">グラフ（180日）</div>

          <div class="graph-options js-graphOptions">
            <label><input type="checkbox" class="js-chkDS" checked />《需要＆供給》</label>
            <label><input type="checkbox" class="js-chkSP" />《供給＆価格》</label>
          </div>

          <div class="graph-body">
            <div class="canvas-wrap js-mesWrap">
              <canvas class="js-chart"></canvas>
            </div>
          </div>
        </div>

        <div class="l3-detail l3-block">
          <div class="head">その他項目</div>
          <div class="detail-scroll">
            <table class="detail-table js-detailTable">
              <thead><tr></tr></thead>
              <tbody><tr></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } else if (isFourthLayout) {
    card.innerHTML = `
      <div class="card-top">
        <div class="title-row">
          <div class="title">ASIN: ${asin}</div>
          <span class="memo-badge js-memoBadge" aria-hidden="true"></span>
          <button class="memo-btn js-memoBtn" type="button" title="メモ" aria-label="メモを開く">📝</button>
        </div>
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
          <div class="head">商品情報</div>
          <div class="info-grid js-infoGrid"></div>
        </div>

        <div class="l4-center l4-block">
          <div class="head">主要項目</div>
          <div class="center-cards js-centerCards"></div>
        </div>

        <div class="l4-buy l4-block">
          <div class="head">カート</div>
          <div class="buy-inner">
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

          <div class="graph-body">
            <div class="canvas-wrap js-mesWrap">
              <canvas class="js-chart"></canvas>
            </div>
          </div>
        </div>

        <div class="l4-detail l4-block">
          <div class="head">その他項目</div>
          <div class="detail-scroll">
            <table class="detail-table js-detailTable">
              <thead><tr></tr></thead>
              <tbody><tr></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  } else {
    card.innerHTML = isAltLayout
      ? `
      <div class="card-top">
        <div class="title-row">
          <div class="title">ASIN: ${asin}</div>
          <span class="memo-badge js-memoBadge" aria-hidden="true"></span>
          <button class="memo-btn js-memoBtn" type="button" title="メモ" aria-label="メモを開く">📝</button>
        </div>
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
        <div class="title-row">
          <div class="title">ASIN: ${asin}</div>
          <span class="memo-badge js-memoBadge" aria-hidden="true"></span>
          <button class="memo-btn js-memoBtn" type="button" title="メモ" aria-label="メモを開く">📝</button>
        </div>
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

            <div class="keepa-wrap js-keepaWrap">
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

  
  // memo
  const memoBtn = card.querySelector(".js-memoBtn");
  const memoBadge = card.querySelector(".js-memoBadge");
  if (memoBtn && memoBadge) {
    const savedMemo = loadAsinMemo(asin);
    applyMemoBadge(memoBadge, savedMemo);
    memoBtn.addEventListener("click", () => openMemoModal(asin, memoBadge));
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
    const val = parseFloat(s);
    if (!isNaN(val)) sellInput.value = val;
  }
  if (data["仕入れ額（円）"]) {
    const s = String(data["仕入れ額（円）"]).replace(/[^\d.]/g, "");
    const val = parseFloat(s);
    if (!isNaN(val)) costInput.value = val;
  }

  // qty
  const qtySel = card.querySelector(".js-qty");

  // cart
  card.querySelector(".js-addCart").addEventListener("click", () => {
    const qty = parseInt(qtySel.value, 10) || 0;
    const sell = parseFloat(sellInput.value) || 0;
    const cost = parseFloat(costInput.value) || 0;

    cart.set(asin, { qty, sell, cost });
    updateCartSummary();
    updateHeaderStatus();
  });

  // fill info / center / table according to layoutState
  const infoKeys = layoutState.info;
  const centerKeys = layoutState.center;
  const tableKeys = layoutState.table;

  // info grids
  if (isThirdLayout) {
    // 3レイアウト：商品情報を2分割表示
    const gridA = card.querySelector(".js-infoGridA");
    const gridB = card.querySelector(".js-infoGridB");
    const infoMetrics = infoKeys.map((k) => METRICS.find((m) => m.key === k)).filter(Boolean);

    const half = Math.ceil(infoMetrics.length / 2);
    const a = infoMetrics.slice(0, half);
    const b = infoMetrics.slice(half);

    renderInfoGrid(gridA, a, data);
    renderInfoGrid(gridB, b, data);
  } else {
    const infoGrid = card.querySelector(".js-infoGrid");
    if (infoGrid) {
      const infoMetrics = infoKeys.map((k) => METRICS.find((m) => m.key === k)).filter(Boolean);
      renderInfoGrid(infoGrid, infoMetrics, data);
    }
  }

  // center
  if (isFourthLayout) {
    const centerCards = card.querySelector(".js-centerCards");
    if (centerCards) {
      const centerMetrics = centerKeys.map((k) => METRICS.find((m) => m.key === k)).filter(Boolean);
      centerCards.innerHTML = "";
      centerMetrics.forEach((m) => {
        const v = data[m.valueKey] ?? "";
        const div = document.createElement("div");
        div.className = "center-card";
        div.innerHTML = `<span>${m.label}</span><b>${formatValue(v)}</b>`;
        centerCards.appendChild(div);
      });
    }
  } else {
    const centerWrap = card.querySelector(".js-center");
    if (centerWrap) {
      const centerMetrics = centerKeys.map((k) => METRICS.find((m) => m.key === k)).filter(Boolean);
      centerWrap.innerHTML = "";
      centerMetrics.forEach((m) => {
        const v = data[m.valueKey] ?? "";
        const row = document.createElement("div");
        row.className = "center-row";
        row.innerHTML = `<span>${m.label}</span><b>${formatValue(v)}</b>`;
        centerWrap.appendChild(row);
      });
    }
  }

  // table
  const table = card.querySelector(".js-detailTable");
  if (table) {
    const headRow = table.querySelector("thead tr");
    const bodyRow = table.querySelector("tbody tr");
    headRow.innerHTML = "";
    bodyRow.innerHTML = "";

    const tableMetrics = tableKeys.map((k) => METRICS.find((m) => m.key === k)).filter(Boolean);

    tableMetrics.forEach((m) => {
      const th = document.createElement("th");
      th.textContent = m.label;
      headRow.appendChild(th);

      const td = document.createElement("td");
      const v = data[m.valueKey] ?? "";
      td.textContent = formatValue(v);
      bodyRow.appendChild(td);
    });
  }

  // graph (Chart.js)
  const canvas = card.querySelector(".js-chart");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    const chartData = buildFakeChartData(asin, data);
    const chart = new Chart(ctx, chartData);
    card.__chart = chart;

    // switches / checkboxes
    const chkDS = card.querySelector(".js-chkDS");
    const chkSP = card.querySelector(".js-chkSP");

    function applyDatasetVisibility() {
      // ds: need&sup -> ranking(緑) + sellers(紫)
      // sp: sup&price -> price(オレンジ) + sellers(紫)  ※sellersは共通
      const showDS = chkDS ? chkDS.checked : true;
      const showSP = chkSP ? chkSP.checked : false;

      // dataset order: 0 price, 1 rank, 2 sellers
      chart.data.datasets[0].hidden = showDS && !showSP ? true : false; // price
      chart.data.datasets[1].hidden = showSP && !showDS ? true : false; // rank
      chart.data.datasets[2].hidden = !(showDS || showSP); // sellers only if any view

      // if both checked => show all
      if (showDS && showSP) {
        chart.data.datasets[0].hidden = false;
        chart.data.datasets[1].hidden = false;
        chart.data.datasets[2].hidden = false;
      }
      chart.update();
    }

    if (chkDS) chkDS.addEventListener("change", applyDatasetVisibility);
    if (chkSP) chkSP.addEventListener("change", applyDatasetVisibility);
    applyDatasetVisibility();
  }

  // keepa
  const keepaFrame = card.querySelector(".js-keepaFrame");
  if (keepaFrame) {
    // keepa embed url (dummy)
    keepaFrame.src = `https://keepa.com/#!product/1-${asin}`;

    // default show/hide
    const keepaWrap = card.querySelector(".js-keepaWrap");
    const mesWrap = card.querySelector(".js-mesWrap");

    // Only default layout has switch buttons
    const btnMes = card.querySelector(".js-btnMes");
    const btnKeepa = card.querySelector(".js-btnKeepa");
    const graphOptions = card.querySelector(".js-graphOptions");

    function setMode(mode) {
      if (!btnMes || !btnKeepa) return;
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

  
/* =========================
   ASIN memo (localStorage)
========================= */
const MEMO_STORAGE_PREFIX = "MES_ASIN_MEMO__";
let __memoModal = null;

function loadAsinMemo(asin) {
  try {
    const raw = localStorage.getItem(MEMO_STORAGE_PREFIX + asin);
    if (!raw) return { emoji: "", text: "" };
    const obj = JSON.parse(raw);
    return {
      emoji: typeof obj.emoji === "string" ? obj.emoji : "",
      text: typeof obj.text === "string" ? obj.text : ""
    };
  } catch (e) {
    return { emoji: "", text: "" };
  }
}

function saveAsinMemo(asin, memo) {
  try {
    localStorage.setItem(MEMO_STORAGE_PREFIX + asin, JSON.stringify(memo || { emoji: "", text: "" }));
  } catch (e) {}
}

function clearAsinMemo(asin) {
  try { localStorage.removeItem(MEMO_STORAGE_PREFIX + asin); } catch (e) {}
}

function applyMemoBadge(badgeEl, memo) {
  if (!badgeEl) return;
  const hasText = memo && typeof memo.text === "string" && memo.text.trim() !== "";
  const emoji = memo && typeof memo.emoji === "string" ? memo.emoji.trim() : "";
  const show = emoji || hasText;
  if (!show) {
    badgeEl.textContent = "";
    badgeEl.style.display = "none";
    return;
  }
  badgeEl.textContent = emoji || "📝";
  badgeEl.style.display = "inline-flex";
}

function ensureMemoModal() {
  if (__memoModal) return __memoModal;

  const overlay = document.createElement("div");
  overlay.className = "memo-overlay";
  overlay.style.display = "none";

  overlay.innerHTML = `
    <div class="memo-panel card" role="dialog" aria-modal="true" aria-label="ASINメモ">
      <div class="memo-head">
        <div class="memo-title">メモ</div>
        <button class="memo-close" type="button" aria-label="閉じる">×</button>
      </div>

      <div class="memo-emoji">
        <div class="memo-emoji-label">マーク</div>
        <div class="memo-emoji-row js-memoEmojiRow"></div>
      </div>

      <div class="memo-body">
        <textarea class="memo-text js-memoText" placeholder="ここにメモを記入…"></textarea>
      </div>

      <div class="memo-actions">
        <button class="memo-clear" type="button">クリア</button>
        <div class="memo-actions-right">
          <button class="memo-save" type="button">保存</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeBtn = overlay.querySelector(".memo-close");

  function close() {
    overlay.style.display = "none";
    overlay.removeAttribute("data-asin");
    overlay.removeAttribute("data-emoji");
    overlay.removeAttribute("data-badgeId");
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", (e) => {
    if (overlay.style.display !== "none" && e.key === "Escape") close();
  });

  __memoModal = { overlay, close };
  return __memoModal;
}

function openMemoModal(asin, badgeEl) {
  const { overlay, close } = ensureMemoModal();
  const emojiRow = overlay.querySelector(".js-memoEmojiRow");
  const textArea = overlay.querySelector(".js-memoText");
  const saveBtn = overlay.querySelector(".memo-save");
  const clearBtn = overlay.querySelector(".memo-clear");

  // prepare state
  const current = loadAsinMemo(asin);
  let selectedEmoji = current.emoji || "";
  textArea.value = current.text || "";

  overlay.setAttribute("data-asin", asin);

  // render emojis
  const EMOJIS = ["😈", "👼", "♥️", "👓", "🎯", "⭐️", "✅", "⚠️"];
  emojiRow.innerHTML = "";
  const btns = [];
  EMOJIS.forEach((em) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "memo-emoji-btn";
    b.textContent = em;
    if (em === selectedEmoji) b.classList.add("active");
    b.addEventListener("click", () => {
      selectedEmoji = em;
      btns.forEach(x => x.classList.remove("active"));
      b.classList.add("active");
    });
    btns.push(b);
    emojiRow.appendChild(b);
  });

  // save handlers (reset to avoid stacking)
  saveBtn.onclick = () => {
    const memo = { emoji: selectedEmoji, text: textArea.value || "" };
    const hasAnything = (memo.emoji && memo.emoji.trim() !== "") || (memo.text && memo.text.trim() !== "");
    if (!hasAnything) {
      clearAsinMemo(asin);
      applyMemoBadge(badgeEl, { emoji: "", text: "" });
    } else {
      saveAsinMemo(asin, memo);
      applyMemoBadge(badgeEl, memo);
    }
    close();
  };

  clearBtn.onclick = () => {
    selectedEmoji = "";
    textArea.value = "";
    btns.forEach(x => x.classList.remove("active"));
    clearAsinMemo(asin);
    applyMemoBadge(badgeEl, { emoji: "", text: "" });
    close();
  };

  overlay.style.display = "flex";
  // focus
  setTimeout(() => {
    try { textArea.focus(); } catch (e) {}
  }, 0);
}

/* =========================
   Helpers
========================= */
function formatValue(v) {
  if (Array.isArray(v)) return v.join(", ");
  return v == null ? "" : String(v);
}

function renderInfoGrid(gridEl, metrics, data) {
  gridEl.innerHTML = "";
  metrics.forEach((m) => {
    const k = document.createElement("div");
    k.className = "k";
    k.textContent = m.label;

    const v = document.createElement("div");
    v.className = "v";

    const raw = data[m.valueKey];
    if (m.key.includes("注意事項")) {
      // tags split
      const tags = String(raw || "").split(",").map((x) => x.trim()).filter(Boolean);
      const wrap = document.createElement("div");
      wrap.className = "v-tags";
      tags.forEach((t) => {
        const tag = document.createElement("span");
        tag.className = "tag";
        if (t.includes("不可") || t.includes("知財")) tag.classList.add("danger");
        else if (t.includes("大型")) tag.classList.add("warn");
        else tag.classList.add("info");
        tag.textContent = t;
        wrap.appendChild(tag);
      });
      v.appendChild(wrap);
    } else {
      v.textContent = formatValue(raw);
    }

    gridEl.appendChild(k);
    gridEl.appendChild(v);
  });
}

/* =========================
   Fake chart data (180 days)
   - Keepa風：上部：価格(オレンジ) + ランキング(緑)
   - 下部：セラー数(紫)
========================= */
function buildFakeChartData(asin, data) {
  const days = 180;
  const labels = [];
  const price = [];
  const rank = [];
  const sellers = [];

  // base values from data or defaults
  const basePrice = parseFloat(String(data["販売額（ドル）"] || "39.99").replace(/[^\d.]/g, "")) || 39.99;
  const baseRank = parseFloat(String(data["ランキング"] || "120000").replace(/[^\d.]/g, "")) || 120000;
  const baseSellers = parseFloat(String(data["セラー数"] || "12").replace(/[^\d.]/g, "")) || 12;

  // simple seeded random
  let seed = hashCode(asin) % 10000;

  function rnd() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  // generate day-by-day
  let p = basePrice;
  let r = baseRank;
  let s = baseSellers;

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);

    // drift
    r += (rnd() - 0.5) * 6000;
    r = clamp(r, 5000, 800000);

    // sellers respond loosely to rank
    s += (rnd() - 0.5) * 1.2 + (r < baseRank ? 0.15 : -0.08);
    s = clamp(s, 1, 80);

    // price reacts
    p += (rnd() - 0.5) * 0.8 + (r < baseRank ? 0.15 : -0.08) + (s > baseSellers ? -0.12 : 0.07);
    p = clamp(p, 8, 120);

    price.push(parseFloat(p.toFixed(2)));
    rank.push(Math.round(r));
    sellers.push(parseFloat(s.toFixed(1)));
  }

  // downsample labels to show every 10th day (but keep full dataset)
  // Chart.js uses all labels; we only style ticks in options
  const isAltLayout = document.body.classList.contains("alt-layout");
  const isThirdLayout = document.body.classList.contains("third-layout");
  const isFourthLayout = document.body.classList.contains("fourth-layout");

  const showEvery = 10;

  return {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "価格（$）",
          data: price,
          yAxisID: "yPrice",
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245,158,11,0.12)",
          pointRadius: 0,
          tension: 0.25,
        },
        {
          label: "ランキング",
          data: rank,
          yAxisID: "yRank",
          borderColor: "#10b981",
          backgroundColor: "rgba(16,185,129,0.12)",
          pointRadius: 0,
          tension: 0.25,
        },
        {
          label: "セラー数",
          data: sellers,
          yAxisID: "ySell",
          borderColor: "#8b5cf6",
          backgroundColor: "rgba(139,92,246,0.10)",
          pointRadius: 0,
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { mode: "index", intersect: false },
      },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            callback: function (value, index) {
              if (index % showEvery === 0) return this.getLabelForValue(value);
              return "";
            },
            maxRotation: 0,
            minRotation: 0,
          },
          grid: { display: false },
        },
        yPrice: {
          position: "left",
          beginAtZero: false,
          grid: { color: "rgba(148,163,184,0.25)" },
          ticks: {
            callback: (v) => `$${v}`,
          },
        },
        yRank: {
          position: "right",
          reverse: true,
          grid: { drawOnChartArea: false },
          ticks: {
            callback: (v) => `${Math.round(v)}`,
          },
        },
        ySell: {
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: {
            callback: (v) => `${v}`,
          },
        },
      },
    },
  };
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return h;
}
function clamp(x, a, b) {
  return Math.max(a, Math.min(b, x));
}
