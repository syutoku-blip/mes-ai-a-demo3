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

/* =========================
   データ
========================= */
const DATA = typeof ASIN_DATA !== "undefined" ? ASIN_DATA : {};
const ASINS = Object.keys(DATA);

/* =========================
   DOM
========================= */
const metricsBar = $("#metricsBar");
const metricsCollapseBtn = $("#metricsCollapseBtn");
const sortControls = $("#sortControls");
const addSortRuleBtn = $("#addSortRuleBtn");
const applySortBtn = $("#applySortBtn");
const clearSortBtn = $("#clearSortBtn");
const metricsPoolZone = $("#metricsPoolZone");
const metricsInfoZone = $("#metricsInfoZone");
const metricsLeftZone = $("#metricsLeftZone");
const metricsCenterZone = $("#metricsCenterZone");
const metricsTableZone = $("#metricsTableZone");
const metricsHiddenZone = $("#metricsHiddenZone");

const resetCurrentBtn = $("#resetCurrentBtn");
const clearCardsBtn = $("#clearCardsBtn");
const clearCartBtn = $("#clearCartBtn");

const asinCatalog = $("#asinCatalog");
const itemsContainer = $("#itemsContainer");
const emptyState = $("#emptyState");

const cartTotalCost = $("#cartTotalCost");
const cartTotalRevenue = $("#cartTotalRevenue");
const cartTotalProfit = $("#cartTotalProfit");
const cartAsinCount = $("#cartAsinCount");
const cartItemCount = $("#cartItemCount");

const headerStatus = $("#headerStatus");

/* =========================
   状態
========================= */
const zoneState = {
  pool: [],
  info: [],
  left: [],
  center: [],
  table: [],
  hidden: []
};

const defaultZoneState = {
  pool: [],
  info: [],
  left: [],
  center: [],
  table: [],
  hidden: []
};

let sortRules = [];
const openedCards = new Map(); // asin -> { card, chart, keepaFrame }

/* カート */
const cart = new Map(); // asin -> { qty, sellUSD, costJPY }

/* =========================
   初期項目（デフォルトの表示）
========================= */
const DEFAULT_INFO_KEYS = [
  "商品名",
  "ブランド",
  "評価",
  "各種ASIN",
  "JAN",
  "SKU",
  "サイズ",
  "重量（容積重量）",
  "カテゴリ",
  "注意事項",
  "材質"
];

function initDefaultMetrics() {
  const first = ASINS[0];
  const sample = first ? DATA[first] : {};
  const keys = sample ? Object.keys(sample) : [];

  // ざっくり pool に全項目入れる（見た目の整理はユーザーが上段で行う）
  defaultZoneState.pool = keys.slice();

  // info は初期で指定されたものを優先（存在するものだけ）
  defaultZoneState.info = DEFAULT_INFO_KEYS.filter((k) => keys.includes(k));

  // center / left / table は空でもOK（ユーザーが配置）
  defaultZoneState.left = [];
  defaultZoneState.center = [];
  defaultZoneState.table = [];
  defaultZoneState.hidden = [];

  Object.assign(zoneState, JSON.parse(JSON.stringify(defaultZoneState)));
}

/* =========================
   配置UI（ドラッグ＆ドロップ）
========================= */
function renderMetricsBar() {
  const all = [
    { id: "pool", title: "プール", el: metricsPoolZone },
    { id: "info", title: "商品情報", el: metricsInfoZone },
    { id: "left", title: "左の枠", el: metricsLeftZone },
    { id: "center", title: "真ん中の枠", el: metricsCenterZone },
    { id: "table", title: "下段テーブル", el: metricsTableZone },
    { id: "hidden", title: "非表示", el: metricsHiddenZone }
  ];

  all.forEach((z) => {
    z.el.innerHTML = "";
    zoneState[z.id].forEach((key) => {
      const chip = document.createElement("div");
      chip.className = "metric-chip";
      chip.draggable = true;
      chip.dataset.key = key;
      chip.dataset.from = z.id;
      chip.textContent = key;

      chip.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData(
          "text/plain",
          JSON.stringify({ key, from: z.id })
        );
      });

      z.el.appendChild(chip);
    });

    z.el.addEventListener("dragover", (e) => e.preventDefault());
    z.el.addEventListener("drop", (e) => {
      e.preventDefault();
      const payload = JSON.parse(e.dataTransfer.getData("text/plain") || "{}");
      if (!payload.key) return;
      moveMetric(payload.key, payload.from, z.id);
    });
  });

  refreshAllCards();
}

function moveMetric(key, from, to) {
  if (from === to) return;

  // どこかに既にある場合は除去（重複禁止）
  Object.keys(zoneState).forEach((z) => {
    zoneState[z] = zoneState[z].filter((k) => k !== key);
  });

  // to に追加
  zoneState[to].push(key);

  renderMetricsBar();
}

/* =========================
   ソート
========================= */
function renderSortControls() {
  sortControls.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.className = "sort-rows";

  sortRules.forEach((r, idx) => {
    const row = document.createElement("div");
    row.className = "sort-row";

    const sel = document.createElement("select");
    sel.className = "sort-key";
    const opts = zoneState.center.slice();
    sel.innerHTML =
      `<option value="">（選択）</option>` +
      opts.map((k) => `<option value="${k}">${k}</option>`).join("");
    sel.value = r.key || "";
    sel.addEventListener("change", () => {
      sortRules[idx].key = sel.value;
    });

    const dir = document.createElement("select");
    dir.className = "sort-dir";
    dir.innerHTML = `
      <option value="desc">大きい順</option>
      <option value="asc">小さい順</option>
    `;
    dir.value = r.dir || "desc";
    dir.addEventListener("change", () => {
      sortRules[idx].dir = dir.value;
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
    wrap.appendChild(row);
  });

  sortControls.appendChild(wrap);
}

function applySort() {
  if (!sortRules.length) return;

  const cards = Array.from(itemsContainer.querySelectorAll(".product-card"));

  cards.sort((a, b) => {
    const asinA = a.dataset.asin;
    const asinB = b.dataset.asin;
    const dataA = DATA[asinA] || {};
    const dataB = DATA[asinB] || {};

    for (const r of sortRules) {
      if (!r.key) continue;
      const va = num(dataA[r.key]);
      const vb = num(dataB[r.key]);
      if (va === vb) continue;
      return r.dir === "asc" ? va - vb : vb - va;
    }
    return 0;
  });

  cards.forEach((c) => itemsContainer.appendChild(c));
}

function clearSort() {
  sortRules = [];
  renderSortControls();
}

/* =========================
   ASINカタログ
========================= */
function renderAsinCatalog() {
  asinCatalog.innerHTML = "";
  ASINS.forEach((asin) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "asin-btn";
    btn.textContent = asin;
    btn.addEventListener("click", () => openAsin(asin));
    asinCatalog.appendChild(btn);
  });
}

/* =========================
   グラフ（Chart.js）
========================= */
function buildChart(canvas, data) {
  const labels = (data["日付"] || []).slice();
  const rank = (data["ランキング(180d)"] || []).slice();
  const sellers = (data["セラー数(180d)"] || []).slice();
  const price = (data["価格(USD)(180d)"] || []).slice();

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
        <div class="title">ASIN: ${asin}</div>
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
        <div class="title">ASIN: ${asin}</div>
        <button class="remove" type="button">この行を削除</button>
      </div>

      <div class="alt-grid">
        <div class="alt-left alt-media">
          <div class="alt-media-img">
            <img src="${data["商品画像"] || ""}" alt="商品画像" onerror="this.style.display='none';" />
          </div>

          <div class="alt-media-info">
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
            <div class="info-head">
              <div class="t">商品情報</div>
            </div>
            <div class="info-grid js-infoGrid"></div>
          </div>
        </div>

        <div class="graph-box">
          <div class="graph-head">
            <div class="graph-title">グラフ（180日）</div>
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

  // remove
  $(".remove", card).addEventListener("click", () => {
    removeAsinCard(asin);
  });

  // info render
  if (isThirdLayout) {
    const keys = zoneState.info.slice();
    const half = Math.ceil(keys.length / 2);
    const keysA = keys.slice(0, half);
    const keysB = keys.slice(half);

    renderInfoGrid($(".js-infoGridA", card), data, keysA);
    renderInfoGrid($(".js-infoGridB", card), data, keysB);
  } else {
    renderInfoGrid($(".js-infoGrid", card), data, zoneState.info.slice());
  }

  renderCenterList($(".js-center", card), data, zoneState.center.slice());
  renderDetailTable($(".js-detailTable", card), data, zoneState.table.slice());

  // cart inputs default
  const qtySel = $(".js-qty", card);
  const sellInput = $(".js-sell", card);
  const costInput = $(".js-cost", card);
  const addBtn = $(".js-addCart", card);

  // 初期値（データがあれば使う）
  const initSell = data["販売価格（$）"] ?? data["販売価格($)"] ?? "";
  const initCost = data["仕入れ額（￥）"] ?? data["仕入れ額(￥)"] ?? "";
  sellInput.value = initSell ? num(initSell) : "";
  costInput.value = initCost ? num(initCost) : "";

  addBtn.addEventListener("click", () => {
    const qty = Number(qtySel.value || 1);
    const sellUSD = num(sellInput.value);
    const costJPY = num(costInput.value);

    cart.set(asin, { qty, sellUSD, costJPY });
    updateCartSummary();
    headerStatus.textContent = `カート更新: ${asin}`;
  });

  // charts
  const canvas = $(".js-chart", card);
  const keepaFrame = $(".js-keepaFrame", card);
  const chkDS = $(".js-chkDS", card);
  const chkSP = $(".js-chkSP", card);

  // keepa url
  if (keepaFrame) {
    const keepaUrl = data["keepaURL"] || data["keepaUrl"] || data["KeepaURL"] || "";
    if (keepaUrl) keepaFrame.src = keepaUrl;
  }

  let chart = null;
  if (canvas) {
    chart = buildChart(canvas, data);
    updateChartVisibility(chart, chkDS?.checked ?? true, chkSP?.checked ?? false);

    const apply = () => updateChartVisibility(chart, chkDS.checked, chkSP.checked);
    if (chkDS) chkDS.addEventListener("change", apply);
    if (chkSP) chkSP.addEventListener("change", apply);
  }

  openedCards.set(asin, { card, chart, keepaFrame });

  return card;
}

/* =========================
   表示ユーティリティ
========================= */
function renderInfoGrid(root, data, keys) {
  if (!root) return;
  root.innerHTML = "";

  keys.forEach((k) => {
    const keyEl = document.createElement("div");
    keyEl.className = "k";
    keyEl.textContent = k;

    const valEl = document.createElement("div");
    valEl.className = "v";

    const v = data[k];

    // 注意事項はタグ表示
    if (k === "注意事項" && typeof v === "string") {
      valEl.className = "v info-td-tags";
      const arr = v.split(",").map((s) => s.trim()).filter(Boolean);
      if (!arr.length) {
        valEl.textContent = "";
      } else {
        arr.forEach((t) => {
          const span = document.createElement("span");
          span.className = "tag";
          if (t.includes("不可")) span.classList.add("red");
          if (t.includes("知財")) span.classList.add("blue");
          if (t.includes("大型")) span.classList.add("yellow");
          span.textContent = t;
          valEl.appendChild(span);
        });
      }
    } else {
      valEl.textContent = v ?? "";
      // 文字は枠内で横スクロールできるように（デフォルト）
      valEl.classList.add("info-td-scroll");
    }

    root.appendChild(keyEl);
    root.appendChild(valEl);
  });
}

function renderCenterList(root, data, keys) {
  if (!root) return;
  root.innerHTML = "";

  keys.forEach((k) => {
    const row = document.createElement("div");
    row.className = "center-row";

    const kk = document.createElement("div");
    kk.className = "k";
    kk.textContent = k;

    const vv = document.createElement("div");
    vv.className = "v";
    vv.textContent = data[k] ?? "";

    row.appendChild(kk);
    row.appendChild(vv);
    root.appendChild(row);
  });
}

function renderDetailTable(table, data, keys) {
  if (!table) return;

  const headRow = table.querySelector("thead tr");
  const bodyRow = table.querySelector("tbody tr");
  headRow.innerHTML = "";
  bodyRow.innerHTML = "";

  keys.forEach((k) => {
    const th = document.createElement("th");
    th.textContent = k;
    headRow.appendChild(th);

    const td = document.createElement("td");
    const v = data[k] ?? "";
    td.textContent = v;
    bodyRow.appendChild(td);
  });
}

/* =========================
   開閉
========================= */
function openAsin(asin) {
  if (!asin || !DATA[asin]) return;

  if (openedCards.has(asin)) {
    headerStatus.textContent = `既に表示中: ${asin}`;
    return;
  }

  const card = createProductCard(asin, DATA[asin]);
  itemsContainer.appendChild(card);

  emptyState.style.display = "none";
  headerStatus.textContent = `追加: ${asin}`;
}

function removeAsinCard(asin) {
  const obj = openedCards.get(asin);
  if (!obj) return;

  if (obj.chart) obj.chart.destroy();
  obj.card.remove();
  openedCards.delete(asin);

  if (!openedCards.size) emptyState.style.display = "block";
  headerStatus.textContent = `削除: ${asin}`;
}

function refreshAllCards() {
  openedCards.forEach((obj, asin) => {
    const data = DATA[asin] || {};
    // info
    if (document.body.classList.contains("third-layout")) {
      const keys = zoneState.info.slice();
      const half = Math.ceil(keys.length / 2);
      const keysA = keys.slice(0, half);
      const keysB = keys.slice(half);

      renderInfoGrid($(".js-infoGridA", obj.card), data, keysA);
      renderInfoGrid($(".js-infoGridB", obj.card), data, keysB);
    } else {
      renderInfoGrid($(".js-infoGrid", obj.card), data, zoneState.info.slice());
    }

    // center
    renderCenterList($(".js-center", obj.card), data, zoneState.center.slice());

    // table
    renderDetailTable($(".js-detailTable", obj.card), data, zoneState.table.slice());
  });
}

/* =========================
   イベント
========================= */
metricsCollapseBtn?.addEventListener("click", () => {
  metricsBar.classList.toggle("collapsed");
  metricsCollapseBtn.textContent = metricsBar.classList.contains("collapsed")
    ? "開く"
    : "折りたたむ";
});

addSortRuleBtn?.addEventListener("click", () => {
  sortRules.push({ key: "", dir: "desc" });
  renderSortControls();
});
applySortBtn?.addEventListener("click", applySort);
clearSortBtn?.addEventListener("click", clearSort);

resetCurrentBtn?.addEventListener("click", () => {
  Object.assign(zoneState, JSON.parse(JSON.stringify(defaultZoneState)));
  renderSortControls();
  renderMetricsBar();
  headerStatus.textContent = "現在の並びを初期状態に戻しました";
});

clearCardsBtn?.addEventListener("click", () => {
  Array.from(openedCards.keys()).forEach(removeAsinCard);
  headerStatus.textContent = "全カードを削除しました";
});

clearCartBtn?.addEventListener("click", () => {
  cart.clear();
  updateCartSummary();
  headerStatus.textContent = "カートをクリアしました";
});

/* =========================
   初期化
========================= */
initDefaultMetrics();
renderMetricsBar();
renderSortControls();
renderAsinCatalog();
updateCartSummary();

headerStatus.textContent = `ASIN: ${ASINS.length}件`;
