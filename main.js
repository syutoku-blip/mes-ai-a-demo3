/* main.js - FULL (user project)
   - Layout1/2/3 existing logic preserved
   - Layout4 added (fourth-layout)
*/

(() => {
  // ----------------------------
  // Utilities
  // ----------------------------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const fmtYen = (v) => (Number.isFinite(v) ? v.toLocaleString("ja-JP") + "円" : "-");
  const fmtNum = (v) => (Number.isFinite(v) ? v.toLocaleString("ja-JP") : "-");
  const fmtPct = (v) => (Number.isFinite(v) ? Math.round(v * 100) + "%" : "-");

  // ----------------------------
  // Data (from asin-data.js)
  // ----------------------------
  const ASIN_DATA = (typeof window !== "undefined" && window.ASIN_DATA) ? window.ASIN_DATA : [];
  const ASIN_BY_ID = new Map();

  try {
    if (Array.isArray(ASIN_DATA)) {
      ASIN_DATA.forEach((d) => {
        if (d && d.asin) ASIN_BY_ID.set(String(d.asin), d);
      });
    }
  } catch (e) {
    console.warn("ASIN_DATA parse error:", e);
  }

  // ----------------------------
  // State
  // ----------------------------
  const state = {
    cart: [], // array of {asin, qty, sellUsd, buyYen}
    layout: 1,
    cards: [], // currently visible cards data
    filter: { key: "", min: null, max: null },
    sort: { key: "", dir: "desc" },
  };

  // ----------------------------
  // Layout detect
  // ----------------------------
  const detectLayout = () => {
    const u = new URL(location.href);
    const layoutParam = u.searchParams.get("layout");
    if (layoutParam) {
      const n = Number(layoutParam);
      if ([1, 2, 3, 4].includes(n)) return n;
    }
    // from body class
    const b = document.body;
    if (!b) return 1;
    if (b.classList.contains("alt-layout")) return 2;
    if (b.classList.contains("third-layout")) return 3;
    if (b.classList.contains("fourth-layout")) return 4;
    return 1;
  };

  // ----------------------------
  // DOM refs
  // ----------------------------
  const refs = {
    metricsBar: null,
    metricsRow: null,
    sortKey: null,
    sortDir: null,
    sortApply: null,
    sortReset: null,
    filterKey: null,
    filterMin: null,
    filterMax: null,
    filterApply: null,
    filterReset: null,
    addRandomAsin: null,
    clearAll: null,
    toggleMetrics: null,
    asinPills: null,
    itemsStack: null,
    cartGrid: null,
    recalcCart: null,
    headerStatus: null,
  };

  const bindRefs = () => {
    refs.metricsBar = $("#metricsBar");
    refs.metricsRow = $("#metricsRow");
    refs.sortKey = $("#sortKey");
    refs.sortDir = $("#sortDir");
    refs.sortApply = $("#sortApply");
    refs.sortReset = $("#sortReset");
    refs.filterKey = $("#filterKey");
    refs.filterMin = $("#filterMin");
    refs.filterMax = $("#filterMax");
    refs.filterApply = $("#filterApply");
    refs.filterReset = $("#filterReset");
    refs.addRandomAsin = $("#addRandomAsin");
    refs.clearAll = $("#clearAll");
    refs.toggleMetrics = $("#toggleMetrics");
    refs.asinPills = $("#asinPills");
    refs.itemsStack = $("#itemsStack");
    refs.cartGrid = $("#cartGrid");
    refs.recalcCart = $("#recalcCart");
    refs.headerStatus = $("#headerStatus");
  };

  // ----------------------------
  // Metric config
  // ----------------------------
  const METRICS = [
    { key: "profitYen", label: "粗利益", group: "主要" },
    { key: "profitRate", label: "粗利益率", group: "主要" },
    { key: "inYen", label: "入金額（円）", group: "主要" },
    { key: "sales30", label: "30日販売数", group: "主要" },
    { key: "forecast30", label: "予測30日販売数", group: "主要" },
    { key: "stockDays45", label: "複数在庫指数45日分", group: "主要" },
    { key: "rank", label: "ランキング", group: "需要" },
    { key: "sellerCount", label: "セラー数", group: "供給" },
    { key: "priceUsd", label: "価格(USD)", group: "供給" },
  ];

  const METRIC_GROUPS = [
    { id: "main", title: "主要指標", keys: ["profitYen", "profitRate", "inYen", "sales30", "forecast30", "stockDays45"] },
    { id: "demand", title: "需要", keys: ["rank"] },
    { id: "supply", title: "供給", keys: ["sellerCount", "priceUsd"] },
    { id: "custom", title: "カスタム", keys: [] },
    { id: "trash", title: "除外", keys: [] },
  ];

  // ----------------------------
  // Dummy keepa iframe builder
  // ----------------------------
  const keepaIframeSrc = (asin) => {
    // placeholder - in real use you embed keepa widget
    return "about:blank";
  };

  // ----------------------------
  // Chart (simple canvas draw, no external libs)
  // ----------------------------
  const drawDemandSupplyChart = (canvas, series) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ensure canvas has pixels
    const parent = canvas.parentElement;
    const w = parent ? parent.clientWidth : 600;
    const h = parent ? parent.clientHeight : 260;
    canvas.width = Math.max(10, w);
    canvas.height = Math.max(10, h);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "#eef2ff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = "rgba(15,23,42,0.10)";
    ctx.lineWidth = 1;
    const pad = 36;
    const gx0 = pad, gx1 = canvas.width - pad;
    const gy0 = pad, gy1 = canvas.height - pad;

    for (let i = 0; i <= 6; i++) {
      const y = gy0 + (gy1 - gy0) * (i / 6);
      ctx.beginPath();
      ctx.moveTo(gx0, y);
      ctx.lineTo(gx1, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 10; i++) {
      const x = gx0 + (gx1 - gx0) * (i / 10);
      ctx.beginPath();
      ctx.moveTo(x, gy0);
      ctx.lineTo(x, gy1);
      ctx.stroke();
    }

    // If no data
    if (!series || !series.days || series.days.length === 0) {
      ctx.fillStyle = "rgba(15,23,42,0.65)";
      ctx.font = "14px sans-serif";
      ctx.fillText("No data", gx0 + 10, gy0 + 10);
      return;
    }

    const days = series.days;
    const rank = series.rank || [];
    const sellers = series.sellers || [];
    const price = series.price || [];

    // Normalize helper
    const minMax = (arr) => {
      let mn = Infinity, mx = -Infinity;
      arr.forEach((v) => {
        if (!Number.isFinite(v)) return;
        mn = Math.min(mn, v);
        mx = Math.max(mx, v);
      });
      if (!Number.isFinite(mn) || !Number.isFinite(mx) || mn === mx) return [0, 1];
      return [mn, mx];
    };

    const [rankMin, rankMax] = minMax(rank);
    const [sellerMin, sellerMax] = minMax(sellers);
    const [priceMin, priceMax] = minMax(price);

    const xAt = (i) => gx0 + (gx1 - gx0) * (i / (days.length - 1));
    const yAt = (v, mn, mx) => {
      const t = (v - mn) / (mx - mn);
      return gy1 - (gy1 - gy0) * t;
    };

    // draw line
    const drawLine = (arr, mn, mx, stroke) => {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
        if (!Number.isFinite(v)) continue;
        const x = xAt(i);
        const y = yAt(v, mn, mx);
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    // Colors are left to css? but canvas needs color. Keep muted.
    drawLine(rank, rankMin, rankMax, "rgba(59,130,246,0.95)");    // rank
    drawLine(sellers, sellerMin, sellerMax, "rgba(255,99,132,0.95)"); // sellers
    drawLine(price, priceMin, priceMax, "rgba(245,158,11,0.95)"); // price

    // Legend
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "rgba(15,23,42,0.75)";
    ctx.fillText("ランキング", gx0, gy0 - 12);
    ctx.fillStyle = "rgba(59,130,246,0.95)";
    ctx.fillRect(gx0 + 66, gy0 - 22, 10, 10);

    ctx.fillStyle = "rgba(15,23,42,0.75)";
    ctx.fillText("セラー数", gx0 + 96, gy0 - 12);
    ctx.fillStyle = "rgba(255,99,132,0.95)";
    ctx.fillRect(gx0 + 150, gy0 - 22, 10, 10);

    ctx.fillStyle = "rgba(15,23,42,0.75)";
    ctx.fillText("価格(USD)", gx0 + 180, gy0 - 12);
    ctx.fillStyle = "rgba(245,158,11,0.95)";
    ctx.fillRect(gx0 + 248, gy0 - 22, 10, 10);
  };

  // ----------------------------
  // Build metrics zones (drag sort UI)
  // ----------------------------
  const renderMetricsZones = () => {
    if (!refs.metricsRow) return;

    // Prepare group -> pills
    const metricMap = new Map(METRICS.map(m => [m.key, m]));
    const groupEls = [];

    METRIC_GROUPS.forEach((g) => {
      const zone = document.createElement("div");
      zone.className = "metrics-zone";
      zone.dataset.group = g.id;

      const title = document.createElement("div");
      title.className = "metrics-zone-title";
      title.textContent = g.title;
      zone.appendChild(title);

      const list = document.createElement("div");
      list.className = "metrics-zone-list";
      list.dataset.zone = g.id;

      const keys = g.keys.slice();
      keys.forEach((k) => {
        const m = metricMap.get(k);
        if (!m) return;
        list.appendChild(makeMetricPill(m));
      });

      zone.appendChild(list);
      groupEls.push(zone);
    });

    refs.metricsRow.innerHTML = "";
    groupEls.forEach((el) => refs.metricsRow.appendChild(el));

    // Attach drag behavior
    $$(".metric-pill").forEach((pill) => {
      pill.addEventListener("dragstart", onDragStart);
    });
    $$(".metrics-zone-list").forEach((z) => {
      z.addEventListener("dragover", (e) => e.preventDefault());
      z.addEventListener("drop", onDrop);
    });

    // Build select options
    buildSortFilterOptions();
  };

  const makeMetricPill = (m) => {
    const pill = document.createElement("div");
    pill.className = "metric-pill";
    pill.draggable = true;
    pill.dataset.key = m.key;
    pill.textContent = m.label;
    return pill;
  };

  let dragKey = null;
  const onDragStart = (e) => {
    dragKey = e.currentTarget.dataset.key || null;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDrop = (e) => {
    e.preventDefault();
    const zone = e.currentTarget;
    if (!dragKey) return;

    const pill = $(`.metric-pill[data-key="${dragKey}"]`);
    if (!pill) return;

    zone.appendChild(pill);
    dragKey = null;

    buildSortFilterOptions();
  };

  // ----------------------------
  // Sort/Filter options based on pills in all zones except trash
  // ----------------------------
  const buildSortFilterOptions = () => {
    if (!refs.sortKey || !refs.filterKey) return;

    const keys = [];
    $$(".metrics-zone-list").forEach((z) => {
      const zid = z.dataset.zone;
      if (zid === "trash") return;
      $$(".metric-pill", z).forEach((p) => keys.push(p.dataset.key));
    });

    const uniq = Array.from(new Set(keys));
    const toLabel = (k) => (METRICS.find(m => m.key === k)?.label || k);

    const fill = (sel, current) => {
      sel.innerHTML = `<option value="">（未選択）</option>`;
      uniq.forEach((k) => {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = toLabel(k);
        if (k === current) opt.selected = true;
        sel.appendChild(opt);
      });
    };

    fill(refs.sortKey, state.sort.key);
    fill(refs.filterKey, state.filter.key);
  };

  // ----------------------------
  // ASIN pills
  // ----------------------------
  const renderAsinPills = () => {
    if (!refs.asinPills) return;
    refs.asinPills.innerHTML = "";

    const asins = Array.isArray(ASIN_DATA)
      ? ASIN_DATA.map(d => d.asin).filter(Boolean)
      : [];

    asins.slice(0, 60).forEach((asin) => {
      const b = document.createElement("button");
      b.className = "asin-pill";
      b.textContent = asin;
      b.addEventListener("click", () => addToCart(asin));
      refs.asinPills.appendChild(b);
    });
  };

  // ----------------------------
  // Cart / Cards
  // ----------------------------
  const addToCart = (asin) => {
    const a = String(asin);
    state.cart.push({ asin: a, qty: 1, sellUsd: null, buyYen: null });
    rerender();
  };

  const removeFromCartIndex = (idx) => {
    state.cart.splice(idx, 1);
    rerender();
  };

  const updateCartItem = (idx, patch) => {
    const it = state.cart[idx];
    if (!it) return;
    Object.assign(it, patch);
    rerenderCartSummary();
  };

  const calcCardMetrics = (asin, cartItem) => {
    const d = ASIN_BY_ID.get(String(asin)) || {};
    const qty = Number(cartItem?.qty ?? 1);

    // available fields from dataset
    const profitYen = Number(d.profitYen);
    const inYen = Number(d.inYen);
    const sales30 = Number(d.sales30);
    const forecast30 = Number(d.forecast30);
    const stockDays45 = Number(d.stockDays45);
    const profitRate = Number(d.profitRate);

    // compute totals for cart summary
    const profitTotal = (Number.isFinite(profitYen) ? profitYen : 0) * qty;
    const inTotal = (Number.isFinite(inYen) ? inYen : 0) * qty;

    return {
      asin: String(asin),
      title: d.title || d.name || "",
      brand: d.brand || "",
      jan: d.jan || "",
      sku: d.sku || "",
      size: d.size || "",
      weight: d.weight || "",
      category: d.category || "",
      material: d.material || "",
      image: d.image || "",
      images: Array.isArray(d.images) ? d.images : (d.image ? [d.image] : []),

      // metrics
      profitYen: Number.isFinite(profitYen) ? profitYen : NaN,
      profitRate: Number.isFinite(profitRate) ? profitRate : NaN,
      inYen: Number.isFinite(inYen) ? inYen : NaN,
      sales30: Number.isFinite(sales30) ? sales30 : NaN,
      forecast30: Number.isFinite(forecast30) ? forecast30 : NaN,
      stockDays45: Number.isFinite(stockDays45) ? stockDays45 : NaN,

      // summary accum
      qty,
      profitTotal,
      inTotal,

      keepa: d.keepa || "",
      graph: d.graph || d.demandSupply || null, // {days, rank, sellers, price}
    };
  };

  // ----------------------------
  // Render cart summary
  // ----------------------------
  const rerenderCartSummary = () => {
    if (!refs.cartGrid) return;

    const cards = state.cart.map((c) => calcCardMetrics(c.asin, c));
    let totalQty = 0;
    let totalProfit = 0;
    let totalIn = 0;

    cards.forEach((c) => {
      totalQty += c.qty;
      totalProfit += c.profitTotal;
      totalIn += c.inTotal;
    });

    const nodes = [
      ["件数", fmtNum(cards.length)],
      ["数量合計", fmtNum(totalQty)],
      ["粗利益合計", fmtYen(totalProfit)],
      ["入金合計", fmtYen(totalIn)],
      ["粗利率（参考）", totalIn > 0 ? Math.round((totalProfit / totalIn) * 100) + "%" : "-"],
    ];

    refs.cartGrid.innerHTML = "";
    nodes.forEach(([k, v]) => {
      const d = document.createElement("div");
      const s = document.createElement("span");
      s.textContent = k;
      const b = document.createElement("b");
      b.textContent = v;
      d.appendChild(s);
      d.appendChild(b);
      refs.cartGrid.appendChild(d);
    });
  };

  // ----------------------------
  // Filters / Sort apply
  // ----------------------------
  const applySortFilter = (cards) => {
    let out = cards.slice();

    // filter
    const fk = state.filter.key;
    const fmin = state.filter.min;
    const fmax = state.filter.max;
    if (fk) {
      out = out.filter((c) => {
        const v = Number(c[fk]);
        if (!Number.isFinite(v)) return false;
        if (Number.isFinite(fmin) && v < fmin) return false;
        if (Number.isFinite(fmax) && v > fmax) return false;
        return true;
      });
    }

    // sort
    const sk = state.sort.key;
    if (sk) {
      const dir = state.sort.dir === "asc" ? 1 : -1;
      out.sort((a, b) => {
        const va = Number(a[sk]);
        const vb = Number(b[sk]);
        if (!Number.isFinite(va) && !Number.isFinite(vb)) return 0;
        if (!Number.isFinite(va)) return 1;
        if (!Number.isFinite(vb)) return -1;
        return (va - vb) * dir;
      });
    }

    return out;
  };

  // ----------------------------
  // Render cards (Layout4)
  // ----------------------------
  const renderLayout4Cards = () => {
    if (!refs.itemsStack) return;

    const cards = state.cart.map((c) => calcCardMetrics(c.asin, c));
    state.cards = applySortFilter(cards);

    refs.itemsStack.innerHTML = "";
    if (state.cards.length === 0) {
      const d = document.createElement("div");
      d.className = "card empty";
      d.textContent = "カードがありません。ASIN一覧から追加してください。";
      refs.itemsStack.appendChild(d);
      return;
    }

    state.cards.forEach((c, idx) => {
      const card = document.createElement("div");
      card.className = "card product-card";

      // header
      const top = document.createElement("div");
      top.className = "card-top";
      const t = document.createElement("div");
      t.className = "title";
      t.textContent = `ASIN: ${c.asin}`;
      const rm = document.createElement("button");
      rm.className = "remove";
      rm.textContent = "この行を削除";
      rm.addEventListener("click", () => removeFromCartIndex(idx));
      top.appendChild(t);
      top.appendChild(rm);
      card.appendChild(top);

      // grid
      const grid = document.createElement("section");
      grid.className = "layout4-grid";

      // image
      grid.appendChild(renderL4Image(c));

      // info
      grid.appendChild(renderL4Info(c));

      // center metrics
      grid.appendChild(renderL4Center(c));

      // cart input
      grid.appendChild(renderL4Buy(c, idx));

      // keepa
      grid.appendChild(renderL4Keepa(c));

      // demand-supply chart
      grid.appendChild(renderL4Mes(c));

      card.appendChild(grid);
      refs.itemsStack.appendChild(card);
    });

    // after DOM, draw charts
    $$(".l4-mes canvas").forEach((cv) => {
      const asin = cv.dataset.asin;
      const d = ASIN_BY_ID.get(String(asin)) || {};
      const series = d.graph || d.demandSupply || null;
      drawDemandSupplyChart(cv, series);
    });
  };

  const renderL4Image = (c) => {
    const wrap = document.createElement("div");
    wrap.className = "l4-block l4-image";

    const head = document.createElement("div");
    head.className = "head";
    head.textContent = "商品画像";
    wrap.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "image-grid";

    // many images might exist; add all, css will show only first/main
    const imgs = (c.images && c.images.length) ? c.images : (c.image ? [c.image] : []);
    if (imgs.length === 0) {
      const ph = document.createElement("img");
      ph.className = "main";
      ph.alt = "";
      ph.src = "https://via.placeholder.com/600x600?text=No+Image";
      grid.appendChild(ph);
    } else {
      imgs.forEach((src, i) => {
        const im = document.createElement("img");
        if (i === 0) im.className = "main";
        im.alt = "";
        im.src = src;
        grid.appendChild(im);
      });
    }

    wrap.appendChild(grid);
    return wrap;
  };

  const renderL4Info = (c) => {
    const wrap = document.createElement("div");
    wrap.className = "l4-block l4-info";

    const head = document.createElement("div");
    head.className = "head";
    head.textContent = "商品情報";
    wrap.appendChild(head);

    const grid = document.createElement("div");
    grid.className = "info-grid";

    const add = (k, v) => {
      const kk = document.createElement("div");
      kk.className = "k";
      kk.textContent = k;
      const vv = document.createElement("div");
      vv.className = "v";
      vv.textContent = (v ?? "").toString();
      grid.appendChild(kk);
      grid.appendChild(vv);
    };

    add("商品名", c.title);
    add("ブランド", c.brand);
    add("ASIN", c.asin);
    add("JAN", c.jan);
    add("SKU", c.sku);
    add("サイズ", c.size);
    add("重量（容積重量）", c.weight);
    add("カテゴリ", c.category);
    add("材質", c.material);

    wrap.appendChild(grid);
    return wrap;
  };

  const renderL4Center = (c) => {
    const wrap = document.createElement("div");
    wrap.className = "l4-block l4-center";

    const head = document.createElement("div");
    head.className = "head";
    head.textContent = "主要項目";
    wrap.appendChild(head);

    const cards = document.createElement("div");
    cards.className = "center-cards";

    const mk = (label, value) => {
      const box = document.createElement("div");
      box.className = "center-card";
      const l = document.createElement("div");
      l.className = "label";
      l.textContent = label;
      const v = document.createElement("div");
      v.className = "value";
      v.textContent = value;
      box.appendChild(l);
      box.appendChild(v);
      return box;
    };

    cards.appendChild(mk("粗利益", fmtYen(c.profitYen)));
    cards.appendChild(mk("粗利益率", Number.isFinite(c.profitRate) ? Math.round(c.profitRate * 100) + "%" : "-"));
    cards.appendChild(mk("入金額（円）", fmtYen(c.inYen)));
    cards.appendChild(mk("30日販売数", fmtNum(c.sales30)));
    cards.appendChild(mk("予測30日販売数", fmtNum(c.forecast30)));
    cards.appendChild(mk("複数在庫指数45日分", Number.isFinite(c.stockDays45) ? (Math.round(c.stockDays45 * 10) / 10).toString() : "-"));

    wrap.appendChild(cards);
    return wrap;
  };

  const renderL4Buy = (c, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "l4-block l4-buy";

    const label1 = document.createElement("div");
    label1.className = "buy-title";
    label1.textContent = "数量";
    wrap.appendChild(label1);

    const sel = document.createElement("select");
    for (let i = 1; i <= 20; i++) {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = String(i);
      if (i === c.qty) opt.selected = true;
      sel.appendChild(opt);
    }
    sel.addEventListener("change", () => updateCartItem(idx, { qty: Number(sel.value) }));
    wrap.appendChild(sel);

    const label2 = document.createElement("div");
    label2.className = "buy-title";
    label2.textContent = "販売価格（$）";
    wrap.appendChild(label2);

    const sell = document.createElement("input");
    sell.type = "number";
    sell.placeholder = "例: 39.99";
    sell.value = state.cart[idx]?.sellUsd ?? "";
    sell.addEventListener("input", () => updateCartItem(idx, { sellUsd: sell.value === "" ? null : Number(sell.value) }));
    wrap.appendChild(sell);

    const label3 = document.createElement("div");
    label3.className = "buy-title";
    label3.textContent = "仕入れ額（¥）";
    wrap.appendChild(label3);

    const buy = document.createElement("input");
    buy.type = "number";
    buy.placeholder = "例: 3700";
    buy.value = state.cart[idx]?.buyYen ?? "";
    buy.addEventListener("input", () => updateCartItem(idx, { buyYen: buy.value === "" ? null : Number(buy.value) }));
    wrap.appendChild(buy);

    const btn = document.createElement("button");
    btn.className = "cart-btn";
    btn.textContent = "カートに入れる";
    btn.addEventListener("click", () => {
      if (refs.headerStatus) refs.headerStatus.textContent = `Added: ${c.asin}`;
      setTimeout(() => {
        if (refs.headerStatus) refs.headerStatus.textContent = "Ready";
      }, 900);
    });
    wrap.appendChild(btn);

    return wrap;
  };

  const renderL4Keepa = (c) => {
    const wrap = document.createElement("div");
    wrap.className = "l4-block l4-keepa";

    const head = document.createElement("div");
    head.className = "head";
    head.textContent = "keepaグラフ";
    wrap.appendChild(head);

    const keepa = document.createElement("div");
    keepa.className = "keepa-mini";

    const iframe = document.createElement("iframe");
    iframe.src = keepaIframeSrc(c.asin);
    keepa.appendChild(iframe);

    wrap.appendChild(keepa);
    return wrap;
  };

  const renderL4Mes = (c) => {
    const wrap = document.createElement("div");
    wrap.className = "l4-block l4-mes";

    // head
    const head = document.createElement("div");
    head.className = "head";
    head.textContent = "需要供給グラフ（180日）";
    wrap.appendChild(head);

    const big = document.createElement("div");
    big.className = "mes-big";

    // options row mimic
    const opts = document.createElement("div");
    opts.className = "graph-options";
    opts.style.padding = "0 0 10px 0";
    opts.innerHTML = `
      <label style="display:inline-flex;align-items:center;gap:8px;">
        <input type="checkbox" checked disabled>
        <span>（需要＆供給）</span>
      </label>
      <label style="display:inline-flex;align-items:center;gap:8px;">
        <input type="checkbox" disabled>
        <span>（供給＆価格）</span>
      </label>
    `;
    wrap.appendChild(opts);

    const cv = document.createElement("canvas");
    cv.dataset.asin = c.asin;

    big.appendChild(cv);
    wrap.appendChild(big);
    return wrap;
  };

  // ----------------------------
  // Rerender / Events
  // ----------------------------
  const rerender = () => {
    rerenderCartSummary();
    if (state.layout === 4) {
      renderLayout4Cards();
    } else {
      // fallback: render layout4 style anyway if layout not supported
      renderLayout4Cards();
    }
  };

  const bindEvents = () => {
    if (refs.toggleMetrics && refs.metricsBar) {
      refs.toggleMetrics.addEventListener("click", () => {
        refs.metricsBar.classList.toggle("collapsed");
        refs.toggleMetrics.textContent = refs.metricsBar.classList.contains("collapsed") ? "開く" : "折りたたむ";
      });
    }

    if (refs.sortApply) {
      refs.sortApply.addEventListener("click", () => {
        state.sort.key = refs.sortKey.value;
        state.sort.dir = refs.sortDir.value;
        rerender();
      });
    }
    if (refs.sortReset) {
      refs.sortReset.addEventListener("click", () => {
        state.sort.key = "";
        state.sort.dir = "desc";
        buildSortFilterOptions();
        rerender();
      });
    }

    if (refs.filterApply) {
      refs.filterApply.addEventListener("click", () => {
        state.filter.key = refs.filterKey.value;
        state.filter.min = refs.filterMin.value === "" ? null : Number(refs.filterMin.value);
        state.filter.max = refs.filterMax.value === "" ? null : Number(refs.filterMax.value);
        rerender();
      });
    }
    if (refs.filterReset) {
      refs.filterReset.addEventListener("click", () => {
        state.filter.key = "";
        state.filter.min = null;
        state.filter.max = null;
        if (refs.filterKey) refs.filterKey.value = "";
        if (refs.filterMin) refs.filterMin.value = "";
        if (refs.filterMax) refs.filterMax.value = "";
        rerender();
      });
    }

    if (refs.addRandomAsin) {
      refs.addRandomAsin.addEventListener("click", () => {
        const asins = Array.isArray(ASIN_DATA) ? ASIN_DATA.map(d => d.asin).filter(Boolean) : [];
        if (asins.length === 0) return;
        const a = asins[Math.floor(Math.random() * asins.length)];
        addToCart(a);
      });
    }

    if (refs.clearAll) {
      refs.clearAll.addEventListener("click", () => {
        state.cart = [];
        rerender();
      });
    }

    if (refs.recalcCart) {
      refs.recalcCart.addEventListener("click", rerenderCartSummary);
    }
  };

  // ----------------------------
  // Init
  // ----------------------------
  const init = () => {
    state.layout = detectLayout();
    bindRefs();
    renderMetricsZones();
    renderAsinPills();

    // Seed initial item for demo (if cart empty)
    if (state.cart.length === 0) {
      const firstAsin = Array.isArray(ASIN_DATA) && ASIN_DATA[0] ? ASIN_DATA[0].asin : null;
      if (firstAsin) state.cart.push({ asin: String(firstAsin), qty: 1, sellUsd: null, buyYen: null });
    }

    bindEvents();
    rerender();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
