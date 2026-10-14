/* 特富野古道導覽站 — 主互動：古道檔案、四大面向、交通動畫、古道健行、護照 */
(function () {
  "use strict";
  const T = window.TRAIL;
  const $ = (s, el = document) => el.querySelector(s);
  const SVGNS = "http://www.w3.org/2000/svg";
  const FACE = (n) => `assets/allan/face-${n}.webp`;
  const faceSrc = (n) => (n === "wave" ? "assets/allan/wave.webp" : FACE(n));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, attrs = {}, html) {
    const e = document.createElement(tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }
  function svg(tag, attrs = {}) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 2600);
  }

  /* ---------- Passport ---------- */
  const STAMPS = [
    { id: "arrive", icon: "🚩", name: "抵達自忠", how: "完成一趟交通動畫" },
    { id: "finish", icon: "🥾", name: "走完古道", how: "陪 Allan 走到 6.32K" },
    { id: "quiz", icon: "🎓", name: "古道知識王", how: "答對 6 題以上" },
    { id: "runner", icon: "🛤️", name: "枕木跳跳", how: "跑完 6.32K" },
    { id: "detective", icon: "🔍", name: "森林偵探", how: "找到 6 種動物" },
    { id: "pack", icon: "🎒", name: "背包達人", how: "背包全部選對" },
  ];
  const KEY = "tefuye-passport-v1";
  let got = {};
  try { got = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { got = {}; }
  function saveStamps() { try { localStorage.setItem(KEY, JSON.stringify(got)); } catch (e) { /* 私密視窗等情況下不儲存 */ } }
  function renderStamps() {
    const box = $("#stamps");
    box.innerHTML = "";
    STAMPS.forEach((s) => {
      const d = el("div", { class: "stamp" + (got[s.id] ? " got" : "") });
      d.innerHTML = `<span class="ico" aria-hidden="true">${s.icon}</span><b>${s.name}</b><small>${got[s.id] ? "已蓋章 " + got[s.id] : s.how}</small>`;
      box.appendChild(d);
    });
  }
  window.Passport = {
    award(id) {
      if (got[id]) return;
      const s = STAMPS.find((x) => x.id === id);
      const d = new Date();
      got[id] = `${d.getMonth() + 1}/${d.getDate()}`;
      saveStamps();
      renderStamps();
      if (s) toast(`蓋章！${s.icon} ${s.name}`);
    },
  };
  $("#stampReset").addEventListener("click", () => {
    got = {};
    saveStamps();
    renderStamps();
    toast("護照紀錄已清除");
  });
  renderStamps();

  /* ---------- Facts & status ---------- */
  const fg = $("#factGrid");
  T.facts.forEach((f) => {
    fg.appendChild(el("div", { class: "fact" },
      `<span class="fact-k">${f.k}</span><span class="fact-v">${f.v}<small>${f.u}</small></span><span class="fact-n">${f.note}</span>`));
  });
  $("#statusBox").innerHTML =
    `<img src="${FACE("point")}" alt="" width="72" height="72">
     <div><p class="status-h"><span class="pill">${T.status.asOf} 整理</span>${T.status.headline}</p>
     <ul>${T.status.items.map((i) => `<li>${i}</li>`).join("")}</ul></div>`;

  /* ---------- Facets ---------- */
  const tabs = $("#facetTabs");
  const panel = $("#facetPanel");
  const facetKeys = Object.keys(T.facets);
  function showFacet(key) {
    const f = T.facets[key];
    [...tabs.children].forEach((b) => b.setAttribute("aria-selected", b.dataset.k === key));
    panel.innerHTML =
      `<div class="facet-allan"><img src="${FACE(f.face)}" alt="Allan" width="160" height="160"><p>${f.intro}</p></div>
       <div class="facet-cards">${f.cards.map((c) => `<article class="facet-card"><h3>${c.t}</h3><p>${c.d}</p></article>`).join("")}</div>`;
  }
  facetKeys.forEach((k) => {
    const b = el("button", { role: "tab", type: "button", "data-k": k }, T.facets[k].label);
    b.addEventListener("click", () => showFacet(k));
    tabs.appendChild(b);
  });
  tabs.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = facetKeys.indexOf(document.activeElement.dataset.k);
    if (i < 0) return;
    const n = (i + (e.key === "ArrowRight" ? 1 : -1) + facetKeys.length) % facetKeys.length;
    tabs.children[n].focus();
    showFacet(facetKeys[n]);
  });
  showFacet("history");

  /* ---------- Transport map ---------- */
  const N = T.map.nodes;
  function bezierPath(keys) {
    const P = keys.map((k) => N[k]);
    let d = `M${P[0].x},${P[0].y}`;
    const segs = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || P[i + 1];
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      const seg = `C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x},${p2.y}`;
      d += seg;
      segs.push(`M${p1.x},${p1.y}` + seg);
    }
    return { d, segs };
  }

  const map = $("#routeMap");
  const mapLayers = {};
  function drawMap() {
    map.innerHTML = "";
    ["bg", "roads", "route", "nodes", "mover"].forEach((k) => { mapLayers[k] = svg("g"); map.appendChild(mapLayers[k]); });
    // 山形背景
    [[520, 330, 260, 210], [760, 280, 300, 230], [930, 230, 200, 180], [640, 420, 240, 140]].forEach(([x, y, w, h]) => {
      mapLayers.bg.appendChild(svg("path", { class: "m-mtn", d: `M${x - w / 2},${y + h / 2} Q${x - w / 5},${y - h / 2} ${x},${y - h / 2} T${x + w / 2},${y + h / 2} Z` }));
    });
    T.map.roads.forEach((r) => {
      const cls = r.id === "rail" ? "m-rail" : r.id === "trail" ? "m-trail" : "m-road";
      mapLayers.roads.appendChild(svg("path", { class: cls, d: bezierPath(r.pts).d }));
    });
    // 圖例
    const lg = svg("g", { transform: "translate(24,30)" });
    [["m-road", "公路"], ["m-rail", "阿里山林業鐵路"], ["m-trail", "特富野古道"]].forEach(([c, t], i) => {
      lg.appendChild(svg("path", { class: c, d: `M0,${i * 22} h36` }));
      const tx = svg("text", { class: "m-legend", x: 46, y: i * 22 + 4 });
      tx.textContent = t;
      lg.appendChild(tx);
    });
    mapLayers.bg.appendChild(lg);
    Object.entries(N).forEach(([k, n]) => {
      const g = svg("g", { "data-node": k });
      g.appendChild(svg("circle", { class: "m-node" + (k === "zizhong" ? " dest" : ""), cx: n.x, cy: n.y, r: 8 }));
      const above = ["fenqihu", "dulishan", "erwanping", "alishan", "zizhong", "tataka"].includes(k);
      const lx = n.x + (k === "hsr" || k === "chiayi" ? 14 : 0);
      const anchor = k === "hsr" || k === "chiayi" ? "start" : "middle";
      const t = svg("text", { class: "m-label", x: lx, y: above ? n.y - 18 : n.y + 28, "text-anchor": anchor });
      t.textContent = n.name;
      g.appendChild(t);
      if (n.sub) {
        const s = svg("text", { class: "m-sub", x: lx, y: above ? n.y - 36 : n.y + 44, "text-anchor": anchor });
        s.textContent = n.sub;
        g.appendChild(s);
      }
      mapLayers.nodes.appendChild(g);
    });
  }
  drawMap();

  let origin = "chiayi";
  let mode = "car";
  const originChips = $("#originChips");
  const modeChips = $("#modeChips");
  function chip(container, id, html, onPick) {
    const b = el("button", { class: "chip", type: "button", role: "radio", "aria-checked": "false", "data-id": id }, html);
    b.addEventListener("click", () => {
      [...container.children].forEach((c) => c.setAttribute("aria-checked", c === b));
      onPick(id);
    });
    container.appendChild(b);
    return b;
  }
  T.origins.forEach((o) => chip(originChips, o.id, o.label, (id) => { origin = id; resetTrip(); }));
  Object.entries(T.modes).forEach(([id, m]) =>
    chip(modeChips, id, `<span class="ico" aria-hidden="true">${m.icon}</span><span>${m.label}<small>${m.summary}</small></span>`, (id) => { mode = id; resetTrip(); }));
  originChips.children[0].setAttribute("aria-checked", "true");
  modeChips.children[0].setAttribute("aria-checked", "true");

  // 行程狀態
  let trip = null;
  function setGuide(face, stop, meta, say) {
    $("#guideFace").src = faceSrc(face);
    $("#guideStop").textContent = stop;
    $("#guideMeta").textContent = meta;
    $("#guideSay").textContent = say;
  }
  function renderTips() {
    $("#modeTips").innerHTML = T.modes[mode].tips.map((t) => `<li>${t}</li>`).join("");
  }
  function highlightNodes(keys, current) {
    mapLayers.nodes.querySelectorAll("g").forEach((g) => {
      const c = g.querySelector("circle");
      c.classList.toggle("on", keys.includes(g.dataset.node) && g.dataset.node !== "zizhong");
      g.style.opacity = keys.includes(g.dataset.node) || g.dataset.node === "zizhong" ? 1 : 0.45;
      c.setAttribute("r", g.dataset.node === current ? 12 : 8);
    });
  }
  function resetTrip() {
    if (trip && trip.raf) cancelAnimationFrame(trip.raf);
    const m = T.modes[mode];
    mapLayers.route.innerHTML = "";
    mapLayers.mover.innerHTML = "";
    const full = bezierPath(m.route);
    const routePath = svg("path", { class: "m-route", d: full.d, opacity: 0.55 });
    const donePath = svg("path", { class: "m-done", d: full.d });
    mapLayers.route.appendChild(routePath);
    mapLayers.route.appendChild(donePath);
    const total = routePath.getTotalLength();
    donePath.style.strokeDasharray = `${total} ${total}`;
    donePath.style.strokeDashoffset = total;
    // 每個節點在路徑上的累積長度
    const cum = [0];
    full.segs.forEach((s, i) => {
      const p = svg("path", { d: s });
      mapLayers.route.appendChild(p);
      cum.push(cum[i] + p.getTotalLength());
      p.remove();
    });
    const stops = m.route.map((k, i) => ({ k, len: cum[i] })).filter((s) => m.steps[s.k]);
    // Allan 小頭像 + 交通工具
    const mover = svg("g");
    mover.appendChild(svg("circle", { r: 24, fill: cssVar("--mint"), stroke: cssVar("--ink"), "stroke-width": 2 }));
    const img = svg("image", { href: FACE("smile"), x: -22, y: -24, width: 44, height: 44 });
    mover.appendChild(img);
    const veh = svg("text", { x: 14, y: 30, "font-size": 26, "text-anchor": "middle" });
    veh.textContent = m.icon;
    mover.appendChild(veh);
    mapLayers.mover.appendChild(mover);
    const p0 = routePath.getPointAtLength(0);
    mover.setAttribute("transform", `translate(${p0.x},${p0.y})`);
    trip = { stops, idx: -1, routePath, donePath, total, mover, img, raf: 0, moving: false };
    highlightNodes(m.route, m.route[0]);
    renderTips();
    const o = T.origins.find((x) => x.id === origin);
    setGuide("smile", `${m.icon} ${m.label}・從${o.label}出發`, m.summary, "準備好就按「出發」，我們一站一站往自忠登山口前進。");
    $("#tripStart").textContent = "出發";
    $("#tripStart").disabled = false;
    $("#tripNext").disabled = true;
  }
  function showStop(i) {
    const m = T.modes[mode];
    const s = trip.stops[i];
    const step = m.steps[s.k];
    const n = N[s.k];
    trip.img.setAttribute("href", FACE(step.face === "wave" ? "smile" : step.face));
    setGuide(step.face, n.name, `第 ${i + 1} / ${trip.stops.length} 站${n.sub ? "・" + n.sub : ""}`, step.say);
    highlightNodes(m.route, s.k);
    const last = i === trip.stops.length - 1;
    $("#tripNext").disabled = last;
    if (last) {
      $("#tripStart").textContent = "開始走古道 →";
      window.Passport.award("arrive");
    }
  }
  // 手機上地圖可橫向捲動，讓 Allan 保持在畫面中
  function followMover(x) {
    const wrap = map.parentElement;
    if (wrap.scrollWidth <= wrap.clientWidth) return;
    const scale = map.clientWidth / 1000;
    wrap.scrollLeft = x * scale - wrap.clientWidth / 2;
  }
  function moveTo(i) {
    const from = trip.stops[trip.idx].len, to = trip.stops[i].len;
    const dur = reduceMotion ? 0 : Math.min(2600, Math.max(900, (to - from) * 6));
    const t0 = performance.now();
    trip.moving = true;
    $("#tripNext").disabled = true;
    $("#guideSay").textContent = "移動中……";
    const tick = (now) => {
      const p = dur ? Math.min(1, (now - t0) / dur) : 1;
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      const L = from + (to - from) * e;
      const pt = trip.routePath.getPointAtLength(L);
      trip.mover.setAttribute("transform", `translate(${pt.x},${pt.y})`);
      followMover(pt.x);
      trip.donePath.style.strokeDashoffset = trip.total - L;
      if (p < 1) trip.raf = requestAnimationFrame(tick);
      else { trip.moving = false; trip.idx = i; showStop(i); }
    };
    trip.raf = requestAnimationFrame(tick);
  }
  $("#tripStart").addEventListener("click", () => {
    if (trip.idx === trip.stops.length - 1) {
      document.getElementById("walk").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
      return;
    }
    if (trip.idx >= 0) { resetTrip(); }
    trip.idx = 0;
    $("#tripStart").textContent = "重新出發";
    if (origin !== "chiayi") {
      const pre = T.prelude[mode][origin];
      const o = T.origins.find((x) => x.id === origin);
      setGuide("point", `從${o.label}到嘉義`, "前導路段", pre + " 到嘉義後，我們在地圖上會合！");
      $("#tripNext").disabled = false;
      trip.pre = true;
      return;
    }
    showStop(0);
  });
  $("#tripNext").addEventListener("click", () => {
    if (trip.moving) return;
    if (trip.pre) { trip.pre = false; showStop(0); return; }
    if (trip.idx < trip.stops.length - 1) moveTo(trip.idx + 1);
  });
  resetTrip();

  /* ---------- Trail walk ---------- */
  const W = T.walk;
  const canvas = $("#sceneCanvas");
  const ctx = canvas.getContext("2d");
  const walker = $("#walker");
  let walkIdx = 0;
  let offset = 0;          // 場景捲動距離（px）
  const PX_PER_KM = 900;
  let colors = {};
  function readColors() {
    colors = {
      skyTop: cssVar("--sky-top"), skyBot: cssVar("--sky-bot"), forest: cssVar("--forest"), mint: cssVar("--mint"),
      wood: cssVar("--wood"), line: cssVar("--line"), ink: cssVar("--ink"), paper2: cssVar("--paper-2"), amber: cssVar("--amber"),
      dark: document.documentElement.dataset.theme === "dark" ||
        (!document.documentElement.dataset.theme && window.matchMedia("(prefers-color-scheme: dark)").matches),
    };
  }
  function rnd(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  function kmAt(off) { return off / PX_PER_KM; }
  function sceneAt(km) {
    if (km >= 6.1) return "village";
    if (km >= 5.1) return "stream";
    if (km >= 3.75) return "broadleaf";
    return "cedar";
  }
  function sizeCanvas() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawScene();
  }
  function drawScene() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w) return;
    const km = kmAt(offset);
    const ground = h - 34;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, colors.skyTop);
    g.addColorStop(1, colors.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 遠山
    ctx.fillStyle = colors.mint;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 10; x += 10) {
      const X = x + offset * 0.15;
      ctx.lineTo(x, h * 0.42 + Math.sin(X / 140) * 22 + Math.sin(X / 53) * 9);
    }
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.globalAlpha = 1;

    // 霧
    ctx.fillStyle = colors.dark ? "rgba(200,220,210,0.06)" : "rgba(255,255,255,0.35)";
    for (let i = 0; i < 4; i++) {
      const x = ((i * 380 - offset * 0.25) % (w + 400) + w + 400) % (w + 400) - 200;
      ctx.beginPath();
      ctx.ellipse(x, h * 0.5 + i * 14, 180, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 樹（兩層）
    [[0.5, 0.75, 70], [1, 1, 110]].forEach(([speed, scale, gap], layer) => {
      const start = Math.floor((offset * speed - 100) / gap);
      for (let i = start; i < start + Math.ceil(w / gap) + 4; i++) {
        const x = i * gap - offset * speed + rnd(i + layer * 99) * gap * 0.6;
        const kmHere = kmAt(offset + (x - w * 0.22) / speed);
        const type = sceneAt(Math.max(0, kmHere));
        const base = ground - (layer ? 0 : 24);
        const th = (layer ? 170 : 130) * scale * (0.8 + rnd(i * 3 + layer) * 0.4);
        ctx.globalAlpha = layer ? 1 : 0.55;
        if (type === "cedar") {
          ctx.fillStyle = colors.wood;
          ctx.fillRect(x - 3, base - th * 0.35, 6, th * 0.35);
          ctx.fillStyle = colors.forest;
          for (let t = 0; t < 3; t++) {
            const ty = base - th * 0.25 - t * th * 0.22;
            const tw = (34 - t * 8) * scale;
            ctx.beginPath();
            ctx.moveTo(x - tw, ty);
            ctx.lineTo(x, ty - th * 0.38);
            ctx.lineTo(x + tw, ty);
            ctx.fill();
          }
        } else if (type === "village" && layer === 1 && rnd(i) > 0.6) {
          // 庫巴（茅草高腳屋）
          ctx.fillStyle = colors.wood;
          ctx.fillRect(x - 40, base - 40, 4, 40);
          ctx.fillRect(x + 36, base - 40, 4, 40);
          ctx.fillRect(x - 44, base - 44, 88, 8);
          ctx.fillStyle = colors.amber;
          ctx.beginPath();
          ctx.moveTo(x - 56, base - 44);
          ctx.quadraticCurveTo(x, base - 120, x + 56, base - 44);
          ctx.fill();
        } else {
          ctx.fillStyle = colors.wood;
          ctx.fillRect(x - 4, base - th * 0.45, 8, th * 0.45);
          ctx.fillStyle = colors.forest;
          [[0, -0.62, 34], [-20, -0.48, 26], [22, -0.5, 28]].forEach(([dx, dy, r]) => {
            ctx.beginPath();
            ctx.arc(x + dx * scale, base + th * dy, r * scale, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }
    });
    ctx.globalAlpha = 1;

    // 地面
    ctx.fillStyle = colors.paper2;
    ctx.fillRect(0, ground, w, h - ground);
    // 水
    if (km > 5.0 && km < 5.9) {
      ctx.fillStyle = colors.dark ? "rgba(110,170,200,0.35)" : "rgba(120,180,210,0.55)";
      ctx.fillRect(0, ground + 6, w, 16);
    }
    // 枕木與鐵軌
    const sleeperGap = 26;
    const s0 = Math.floor(offset / sleeperGap) - 1;
    for (let i = s0; i < s0 + w / sleeperGap + 3; i++) {
      const x = i * sleeperGap - offset;
      const kmHere = kmAt(offset + x - w * 0.22);
      ctx.fillStyle = colors.wood;
      if (kmHere > 5.0 && kmHere < 5.9) {
        if (i % 3 === 0) { ctx.beginPath(); ctx.ellipse(x, ground + 12, 12, 6, 0, 0, Math.PI * 2); ctx.fillStyle = colors.line; ctx.fill(); }
      } else {
        ctx.fillRect(x, ground + 4, 16, 8);
      }
    }
    // 鐵軌只在 3.75K 以前
    const railEnd = (3.75 * PX_PER_KM - offset) + w * 0.22;
    if (railEnd > 0) {
      ctx.fillStyle = colors.line;
      ctx.fillRect(0, ground + 2, Math.min(w, railEnd), 3);
    }
    // 木橋
    const bridgeX = (2.4 * PX_PER_KM - offset) + w * 0.22;
    if (bridgeX > -300 && bridgeX < w + 300) {
      ctx.strokeStyle = colors.wood;
      ctx.lineWidth = 3;
      for (let k = -4; k <= 4; k++) {
        const bx = bridgeX + k * 34;
        ctx.beginPath();
        ctx.moveTo(bx, ground + 12);
        ctx.lineTo(bx - 14, h);
        ctx.moveTo(bx, ground + 12);
        ctx.lineTo(bx + 14, h);
        ctx.stroke();
      }
    }
  }
  function renderProfile() {
    const p = $("#profile");
    p.innerHTML = "";
    const X = (km) => 46 + (km / 6.32) * 530;
    const Y = (e) => 190 - ((e - 1750) / 550) * 170;
    [1800, 2000, 2200].forEach((e) => {
      p.appendChild(svg("line", { class: "p-grid", x1: 46, x2: 576, y1: Y(e), y2: Y(e) }));
      const t = svg("text", { class: "p-axis", x: 40, y: Y(e) + 4, "text-anchor": "end" });
      t.textContent = e;
      p.appendChild(t);
    });
    [0, 1, 2, 3, 4, 5, 6.32].forEach((k) => {
      const t = svg("text", { class: "p-axis", x: X(k), y: 210, "text-anchor": "middle" });
      t.textContent = k + "K";
      p.appendChild(t);
    });
    const pts = W.map((s) => `${X(s.km).toFixed(1)},${Y(s.ele).toFixed(1)}`);
    p.appendChild(svg("path", { class: "p-area", d: `M${X(0)},${Y(1750)} L${pts.join(" L")} L${X(6.32)},${Y(1750)} Z` }));
    p.appendChild(svg("path", { class: "p-line", d: `M${pts.join(" L")}` }));
    W.forEach((s, i) => p.appendChild(svg("circle", { class: "p-stop" + (i <= walkIdx ? " seen" : ""), cx: X(s.km), cy: Y(s.ele), r: 5 })));
    const cur = W[walkIdx];
    p.appendChild(svg("circle", { class: "p-me", cx: X(cur.km), cy: Y(cur.ele), r: 8 }));
  }
  const seen = new Set([0]);
  function renderFinds() {
    $("#findCards").innerHTML = W.map((s, i) =>
      `<span class="${seen.has(i) ? "got" : ""}" title="${seen.has(i) ? s.find.name : "還沒發現"}">${seen.has(i) ? s.find.icon : "?"}</span>`).join("");
  }
  function showWalk(i) {
    const s = W[i];
    $("#walkFace").src = faceSrc(s.face);
    $("#walkTitle").textContent = s.title;
    $("#walkMeta").textContent = `${s.km}K・海拔約 ${s.ele.toLocaleString()} m`;
    $("#walkSay").textContent = s.say;
    $("#walkFind").innerHTML = `<span class="ico" aria-hidden="true">${s.find.icon}</span><div><b>發現卡：${s.find.name}</b>${s.find.info}</div>`;
    $("#walkBack").disabled = i === 0;
    $("#walkNext").textContent = i === W.length - 1 ? "再走一次" : "繼續走 →";
    $("#sceneKm").textContent = s.km.toFixed(2) + "K";
    $("#sceneEle").textContent = `海拔 ${s.ele.toLocaleString()} m`;
    renderProfile();
    renderFinds();
    if (i === W.length - 1) window.Passport.award("finish");
  }
  let walking = false;
  function walkTo(i) {
    if (walking) return;
    const from = offset, to = W[i].km * PX_PER_KM;
    const back = to < from;
    walker.src = back ? "assets/allan/side-left.webp" : "assets/allan/side-right.webp";
    const dur = reduceMotion ? 0 : Math.min(2400, 600 + Math.abs(to - from) * 1.6);
    const e0 = W[walkIdx].ele, e1 = W[i].ele, k0 = W[walkIdx].km, k1 = W[i].km;
    walking = true;
    walker.classList.add("walking");
    $("#walkSay").textContent = "走路中……";
    const t0 = performance.now();
    const tick = (now) => {
      const p = dur ? Math.min(1, (now - t0) / dur) : 1;
      offset = from + (to - from) * p;
      $("#sceneKm").textContent = (k0 + (k1 - k0) * p).toFixed(2) + "K";
      $("#sceneEle").textContent = `海拔 ${Math.round(e0 + (e1 - e0) * p).toLocaleString()} m`;
      drawScene();
      if (p < 1) requestAnimationFrame(tick);
      else {
        walking = false;
        walker.classList.remove("walking");
        walker.src = "assets/allan/side-right.webp";
        walkIdx = i;
        seen.add(i);
        showWalk(i);
      }
    };
    requestAnimationFrame(tick);
  }
  $("#walkNext").addEventListener("click", () => {
    if (walkIdx === W.length - 1) {
      offset = 0; walkIdx = 0; drawScene(); showWalk(0); return;
    }
    walkTo(walkIdx + 1);
  });
  $("#walkBack").addEventListener("click", () => { if (walkIdx > 0) walkTo(walkIdx - 1); });

  readColors();
  sizeCanvas();
  showWalk(0);
  window.addEventListener("resize", sizeCanvas);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const recolor = () => { readColors(); drawScene(); resetTrip(); };
  if (mq.addEventListener) mq.addEventListener("change", recolor);
  new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  window.TefuyeUI = { toast, faceSrc, cssVar };
})();
