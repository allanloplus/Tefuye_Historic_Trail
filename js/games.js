/* 特富野古道導覽站 — 遊戲場：古道知識王、枕木跳跳、森林偵探、行前背包 */
(function () {
  "use strict";
  const T = window.TRAIL;
  const UI = window.TefuyeUI;
  const $ = (s, el = document) => el.querySelector(s);
  const FACE = (n) => `assets/allan/face-${n}.webp`;
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------- 分頁 ---------- */
  const tabs = $("#gameTabs");
  const btns = [...tabs.querySelectorAll("button")];
  function showGame(id) {
    btns.forEach((b) => b.setAttribute("aria-selected", b.dataset.game === id));
    ["quiz", "runner", "detective", "pack"].forEach((g) => ($("#game-" + g).hidden = g !== id));
    if (id !== "runner") Runner.pause();
    if (id === "runner") Runner.resize();
  }
  btns.forEach((b) => b.addEventListener("click", () => showGame(b.dataset.game)));
  tabs.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    const n = (i + (e.key === "ArrowRight" ? 1 : -1) + btns.length) % btns.length;
    btns[n].focus();
    showGame(btns[n].dataset.game);
  });

  /* ---------- 古道知識王 ---------- */
  const QN = 8;
  let qs = [], qi = 0, score = 0, done = false;
  function quizStart() {
    qs = shuffle(T.quiz).slice(0, QN);
    qi = 0; score = 0; done = false;
    quizShow();
  }
  function quizShow() {
    const q = qs[qi];
    $("#quizFace").src = FACE("think");
    $("#quizScore").textContent = `第 ${qi + 1} / ${QN} 題・${score} 分`;
    $("#quizQ").textContent = q.q;
    $("#quizWhy").textContent = "";
    $("#quizNext").hidden = true;
    const box = $("#quizOpts");
    box.innerHTML = "";
    shuffle(q.a.map((t, i) => ({ t, ok: i === q.c }))).forEach((o) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "opt";
      b.textContent = o.t;
      b.dataset.ok = o.ok ? "1" : "";
      b.addEventListener("click", () => quizPick(b));
      box.appendChild(b);
    });
  }
  function quizPick(b) {
    const ok = !!b.dataset.ok;
    const all = [...$("#quizOpts").children];
    all.forEach((x) => { x.disabled = true; if (x.dataset.ok) x.classList.add("right"); });
    if (ok) score++; else b.classList.add("wrong");
    $("#quizFace").src = FACE(ok ? "laugh" : (Math.random() < 0.5 ? "cry" : "shock"));
    $("#quizWhy").textContent = (ok ? "答對了！" : "差一點！") + qs[qi].why;
    $("#quizScore").textContent = `第 ${qi + 1} / ${QN} 題・${score} 分`;
    const nx = $("#quizNext");
    nx.hidden = false;
    nx.textContent = qi === QN - 1 ? "看成績" : "下一題";
    nx.focus();
  }
  $("#quizNext").addEventListener("click", () => {
    if (done) { quizStart(); return; }
    if (qi < QN - 1) { qi++; quizShow(); return; }
    done = true;
    const pass = score >= 6;
    $("#quizFace").src = FACE(pass ? "laugh" : "scratch");
    $("#quizScore").textContent = `成績 ${score} / ${QN}`;
    $("#quizQ").textContent = pass ? `${score} 分！你可以來當副領隊了。` : `${score} 分，往上滑看看「四大面向」再來挑戰。`;
    $("#quizOpts").innerHTML = "";
    $("#quizWhy").textContent = "";
    $("#quizNext").textContent = "再玩一次";
    if (pass) window.Passport.award("quiz");
  });
  quizStart();

  /* ---------- 枕木跳跳 ---------- */
  const Runner = (function () {
    const cv = $("#runner");
    const c = cv.getContext("2d");
    const overlay = $("#runnerOverlay");
    const msg = $("#runnerMsg");
    const W = 900, H = 300, GROUND = 250;
    const sprite = new Image();
    sprite.src = "assets/allan/side-right.webp";
    const RUN_SECONDS = 55;           // 跑完 6.32K 大約的秒數
    let st, raf = 0, last = 0, running = false;

    function reset() {
      st = { km: 0, y: 0, vy: 0, speed: 330, obs: [], trash: [], spawn: 1.2, tspawn: 0.8, lives: 3, trashN: 0, hurt: 0, t: 0, scroll: 0, banner: null, said375: false };
    }
    function jump() {
      if (!running) return;
      if (st.y === 0) st.vy = 720;
    }
    function spawnObs() {
      const r = Math.random();
      const type = r < 0.45 ? "log" : r < 0.75 ? "rock" : "puddle";
      st.obs.push({ type, x: W + 40, w: type === "puddle" ? 70 : type === "log" ? 56 : 36, h: type === "puddle" ? 10 : type === "log" ? 30 : 34 });
    }
    function spawnTrash() {
      const icons = ["🥤", "🍬", "🧃", "🥫"];
      st.trash.push({ x: W + 40, y: Math.random() < 0.5 ? GROUND - 30 : GROUND - 120, icon: icons[Math.floor(Math.random() * icons.length)] });
    }
    function colors() {
      return {
        skyTop: UI.cssVar("--sky-top"), skyBot: UI.cssVar("--sky-bot"), forest: UI.cssVar("--forest"), wood: UI.cssVar("--wood"),
        line: UI.cssVar("--line"), ink: UI.cssVar("--ink"), mint: UI.cssVar("--mint"), paper2: UI.cssVar("--paper-2"), bad: UI.cssVar("--bad"), card: UI.cssVar("--card"),
      };
    }
    let C = null;
    function draw() {
      if (!C) C = colors();
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, C.skyTop); g.addColorStop(1, C.skyBot);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // 樹：3.75K 前是柳杉，之後是闊葉林
      const broad = st.km >= 3.75;
      for (let i = -1; i < 12; i++) {
        const x = i * 90 - (st.scroll * 0.5) % 90;
        c.fillStyle = C.forest;
        c.globalAlpha = 0.5;
        if (!broad) {
          c.beginPath(); c.moveTo(x - 28, GROUND - 20); c.lineTo(x, GROUND - 170); c.lineTo(x + 28, GROUND - 20); c.fill();
        } else {
          c.beginPath(); c.arc(x, GROUND - 110, 40, 0, Math.PI * 2); c.arc(x + 26, GROUND - 80, 30, 0, Math.PI * 2); c.fill();
          c.fillStyle = C.wood; c.fillRect(x - 4, GROUND - 80, 8, 60);
        }
        c.globalAlpha = 1;
      }
      // 地面與枕木
      c.fillStyle = C.paper2; c.fillRect(0, GROUND, W, H - GROUND);
      c.fillStyle = C.wood;
      for (let i = -1; i < W / 30 + 2; i++) c.fillRect(i * 30 - (st.scroll % 30), GROUND + 4, 18, 9);
      if (!broad) { c.fillStyle = C.line; c.fillRect(0, GROUND + 2, W, 3); }
      // 障礙
      st.obs.forEach((o) => {
        if (o.type === "log") {
          c.fillStyle = C.wood; c.fillRect(o.x, GROUND - o.h, o.w, o.h);
          c.fillStyle = C.paper2; c.beginPath(); c.arc(o.x + o.w - 8, GROUND - o.h / 2, 8, 0, Math.PI * 2); c.fill();
        } else if (o.type === "rock") {
          c.fillStyle = C.line; c.beginPath(); c.ellipse(o.x + o.w / 2, GROUND - o.h / 2 + 4, o.w / 2, o.h / 2 + 4, 0, Math.PI, 0); c.fill();
          c.fillStyle = C.ink; c.globalAlpha = 0.25; c.fillRect(o.x, GROUND - 2, o.w, 2); c.globalAlpha = 1;
        } else {
          c.fillStyle = "rgba(110,170,210,0.75)"; c.beginPath(); c.ellipse(o.x + o.w / 2, GROUND + 2, o.w / 2, 8, 0, 0, Math.PI * 2); c.fill();
        }
      });
      // 垃圾
      c.font = "28px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
      st.trash.forEach((t) => c.fillText(t.icon, t.x, t.y));
      // Allan
      const ah = 120, aw = ah * (sprite.naturalWidth / sprite.naturalHeight || 0.25);
      const bob = st.y === 0 && running ? Math.sin(st.t * 18) * 3 : 0;
      if (!(st.hurt > 0 && Math.floor(st.t * 20) % 2)) {
        if (sprite.complete && sprite.naturalWidth) c.drawImage(sprite, 200 - aw / 2, GROUND - ah - st.y + bob + 6, aw, ah);
      }
      // HUD
      c.fillStyle = C.wood; c.fillRect(12, 12, 118, 34);
      c.fillStyle = C.card; c.font = "600 20px 'Chivo Mono', monospace"; c.textAlign = "left";
      c.fillText(st.km.toFixed(2) + "K", 22, 30);
      c.font = "18px sans-serif";
      c.fillText("❤️".repeat(st.lives), W - 110, 30);
      c.fillStyle = C.ink; c.font = "700 16px 'Noto Sans TC', sans-serif";
      c.fillText(`撿垃圾 ${st.trashN}`, 150, 30);
      // 進度條
      c.fillStyle = C.line; c.fillRect(12, 56, W - 24, 6);
      c.fillStyle = C.forest; c.fillRect(12, 56, (W - 24) * Math.min(1, st.km / 6.32), 6);
      if (st.banner) {
        c.fillStyle = C.card; c.globalAlpha = 0.9; c.fillRect(W / 2 - 200, 80, 400, 44); c.globalAlpha = 1;
        c.fillStyle = C.ink; c.textAlign = "center"; c.font = "700 20px 'LXGW WenKai TC', serif";
        c.fillText(st.banner.text, W / 2, 103);
      }
    }
    function hit(ax, ay, aw, ah, bx, by, bw, bh) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
    function step(now) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      st.t += dt;
      st.km = Math.min(6.32, st.km + (6.32 / RUN_SECONDS) * dt);
      st.speed = 330 + st.km * 28;
      const dx = st.speed * dt;
      st.scroll += dx;
      st.vy -= 1900 * dt;
      st.y = Math.max(0, st.y + st.vy * dt);
      if (st.y === 0) st.vy = 0;
      st.spawn -= dt; st.tspawn -= dt;
      if (st.spawn <= 0 && st.km < 6.2) { spawnObs(); st.spawn = 0.9 + Math.random() * 1.1 - st.km * 0.05; }
      if (st.tspawn <= 0 && st.km < 6.2) { spawnTrash(); st.tspawn = 1.6 + Math.random() * 1.6; }
      st.obs.forEach((o) => (o.x -= dx));
      st.trash.forEach((t) => (t.x -= dx));
      st.obs = st.obs.filter((o) => o.x > -100);
      const ax = 184, aw = 32, ay = GROUND - 110 - st.y, ah = 106;
      if (st.hurt > 0) st.hurt -= dt;
      st.obs.forEach((o) => {
        if (o.hitDone || st.hurt > 0) return;
        if (hit(ax, ay, aw, ah, o.x + 6, GROUND - o.h, o.w - 12, o.h)) {
          o.hitDone = true; st.lives--; st.hurt = 1.2;
          st.banner = { text: o.type === "puddle" ? "踩到水窪，鞋子濕了！" : o.type === "log" ? "被倒木絆到了！" : "踢到石頭好痛！", until: st.t + 1.2 };
        }
      });
      st.trash = st.trash.filter((t) => {
        if (hit(ax, ay, aw, ah, t.x - 14, t.y - 14, 28, 28)) { st.trashN++; return false; }
        return t.x > -50;
      });
      if (!st.said375 && st.km >= 3.75) { st.said375 = true; st.banner = { text: "3.75K 鐵道段結束，進入闊葉林！", until: st.t + 2 }; }
      if (st.banner && st.t > st.banner.until) st.banner = null;
      draw();
      if (st.lives <= 0) return end(false);
      if (st.km >= 6.32) return end(true);
      raf = requestAnimationFrame(step);
    }
    function end(win) {
      running = false;
      const pts = Math.round(st.km * 100) + st.trashN * 20;
      msg.innerHTML = win
        ? `<img src="${FACE("laugh")}" alt="" width="90" height="90"><br>抵達特富野端！撿了 ${st.trashN} 件垃圾，總分 ${pts}。`
        : `<img src="${FACE("cry")}" alt="" width="90" height="90"><br>在 ${st.km.toFixed(2)}K 體力用完了……總分 ${pts}。`;
      $("#runnerStart").textContent = "再跑一次";
      overlay.hidden = false;
      if (win) window.Passport.award("runner");
    }
    function start() {
      C = colors();
      reset();
      overlay.hidden = true;
      running = true;
      last = performance.now();
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(step);
      cv.focus();
    }
    $("#runnerStart").addEventListener("click", start);
    cv.setAttribute("tabindex", "0");
    cv.addEventListener("pointerdown", (e) => { e.preventDefault(); jump(); });
    window.addEventListener("keydown", (e) => {
      if (!running) return;
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
    });
    reset();
    sprite.onload = draw;
    return {
      pause() {
        if (!running) return;
        running = false; cancelAnimationFrame(raf);
        msg.textContent = "暫停中";
        $("#runnerStart").textContent = "重新開始";
        overlay.hidden = false;
      },
      resize() { C = colors(); draw(); },
    };
  })();

  /* ---------- 森林偵探 ---------- */
  const Detective = (function () {
    const forest = $("#forest");
    let timer = 0, left = 60, found = 0, playing = false;
    const N = 6;
    function build() {
      forest.innerHTML = "";
      // 背景樹：三排，由後往前越來越大
      [[16, 34, 0.55, 90], [12, 14, 0.8, 130], [9, -6, 1, 170]].forEach(([n, bottom, op, size]) => {
        for (let i = 0; i < n; i++) {
          const t = document.createElement("span");
          t.className = "tree";
          t.textContent = Math.random() < 0.55 ? "🌲" : "🌳";
          t.style.left = ((i + 0.5) / n) * 100 + (Math.random() - 0.5) * 5 + "%";
          t.style.bottom = bottom + Math.random() * 6 + "%";
          t.style.fontSize = size * (0.8 + Math.random() * 0.4) + "px";
          t.style.opacity = op;
          forest.appendChild(t);
        }
      });
      const picks = shuffle(T.critters).slice(0, N);
      picks.forEach((cr) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "critter";
        b.textContent = cr.icon;
        b.setAttribute("aria-label", "藏起來的動物");
        const x = 6 + Math.random() * 88, y = 40 + Math.random() * 52;
        b.style.left = x + "%";
        b.style.top = y + "%";
        b.style.fontSize = 22 + Math.random() * 10 + "px";
        b.addEventListener("click", () => pick(b, cr));
        forest.appendChild(b);
        // 用葉子遮住一部分
        const lf = document.createElement("span");
        lf.className = "leaf";
        lf.textContent = ["🌿", "🍃", "🌱"][Math.floor(Math.random() * 3)];
        lf.style.left = x + (Math.random() < 0.5 ? -1.8 : 1.8) + "%";
        lf.style.top = y + (Math.random() < 0.5 ? -3 : 3) + "%";
        lf.style.fontSize = "30px";
        forest.appendChild(lf);
      });
      // 誘餌葉叢
      for (let i = 0; i < 26; i++) {
        const lf = document.createElement("span");
        lf.className = "leaf";
        lf.textContent = ["🌿", "🍃", "🌱", "🍂"][Math.floor(Math.random() * 4)];
        lf.style.left = 4 + Math.random() * 92 + "%";
        lf.style.top = 35 + Math.random() * 60 + "%";
        lf.style.fontSize = 22 + Math.random() * 16 + "px";
        forest.appendChild(lf);
      }
    }
    function pick(b, cr) {
      if (!playing || b.classList.contains("found")) return;
      b.classList.add("found");
      b.setAttribute("aria-label", cr.name);
      found++;
      $("#detCount").textContent = `找到 ${found} / ${N}`;
      $("#detInfo").innerHTML = `<b>${cr.icon} ${cr.name}</b>：${cr.info}`;
      if (found === N) finish(true);
    }
    function finish(win) {
      playing = false;
      clearInterval(timer);
      $("#detInfo").innerHTML = win
        ? `<img src="${FACE("wink")}" alt="" width="48" height="48" style="vertical-align:middle"> 全部找到了！你的眼力可以去當賞鳥嚮導。`
        : `<img src="${FACE("surprise")}" alt="" width="48" height="48" style="vertical-align:middle"> 時間到！找到 ${found} 種。森林裡的動物很會躲，再試一次。`;
      if (win) window.Passport.award("detective");
    }
    function start() {
      build();
      found = 0; left = 60; playing = true;
      $("#detCount").textContent = `找到 0 / ${N}`;
      $("#detTime").textContent = "60 秒";
      $("#detInfo").textContent = "仔細看葉子後面……";
      clearInterval(timer);
      timer = setInterval(() => {
        left--;
        $("#detTime").textContent = left + " 秒";
        if (left <= 0) finish(false);
      }, 1000);
    }
    $("#detStart").addEventListener("click", start);
    build();
    return { start };
  })();

  /* ---------- 行前背包 ---------- */
  (function () {
    const grid = $("#gearGrid");
    const items = shuffle(T.gear);
    items.forEach((g) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "gear";
      b.setAttribute("aria-pressed", "false");
      b.innerHTML = `<span class="ico" aria-hidden="true">${g.icon}</span>${g.name}`;
      b.addEventListener("click", () => {
        b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true");
        b.classList.remove("ok", "no");
        $("#packFace").src = FACE(g.ok ? "smile" : "think");
        $("#packSay").textContent = b.getAttribute("aria-pressed") === "true" ? `${g.name}？${g.say}` : `把${g.name}拿出來了。`;
      });
      b.dataset.id = g.id;
      grid.appendChild(b);
    });
    $("#packCheck").addEventListener("click", () => {
      let miss = 0, extra = 0;
      [...grid.children].forEach((b) => {
        const g = T.gear.find((x) => x.id === b.dataset.id);
        const on = b.getAttribute("aria-pressed") === "true";
        b.classList.remove("ok", "no");
        if (on && g.ok) b.classList.add("ok");
        if (on && !g.ok) { b.classList.add("no"); extra++; }
        if (!on && g.ok) { b.classList.add("no"); miss++; }
      });
      if (!miss && !extra) {
        $("#packFace").src = FACE("laugh");
        $("#packSay").textContent = "完美！這個背包可以安心上山了。";
        window.Passport.award("pack");
      } else {
        $("#packFace").src = FACE(extra ? "shock" : "scratch");
        $("#packSay").textContent = `還差一點：${miss ? `漏帶 ${miss} 樣必需品` : ""}${miss && extra ? "，" : ""}${extra ? `多帶了 ${extra} 樣不該帶的` : ""}。紅框的再看一次。`;
      }
    });
  })();
})();
