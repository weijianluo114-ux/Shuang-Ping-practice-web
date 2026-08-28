/* ================= 文章练习 =================
   纯本地 + 可选联网（一言 hitokoto API，与 shuangpin.xyz 同款数据源）。
   依赖（app.js 顶层无 IIFE，同全局词法作用域内可直接使用）：
   $, $$, settings, codeFor, shuffle, soundCorrect, soundWrong, soundDone,
   mergeRoundIntoStats, fmtTime, escapeHtml, currentView(只读)
*/
(function () {
  "use strict";
  if (typeof window.pinyinPro === "undefined") {
    console.error("[文章练习] pinyin-pro 未加载，文章练习不可用");
    return;
  }

  const HAN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;

  const A = {
    session: null,       // { title, byline, groups:[[char...]], flat:[char...] }
    curIdx: -1,          // flat 中当前待打汉字下标
    total: 0,            // 待打汉字总数
    active: false,
    finished: false,
    started: false,      // 是否已敲第一键（计时从此时开始）
    stats: null,         // {correct,wrong,itemsDone,bestCombo,combo,wrongKeys}
    lastSource: null,    // { title, byline, paragraphs }
    listRendered: false,
    busy: false,
    timerBase: 0,
    timerStart: null,
    timerIv: null,
  };

  /* ---------- 小工具 ---------- */
  let toastEl = null, toastT = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.className = "sp-toast";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => toastEl.classList.remove("show"), 2400);
  }

  /* ---------- 计时 ---------- */
  function artElapsed() { return A.timerBase + (A.timerStart ? Date.now() - A.timerStart : 0); }
  function pauseArtTimer() {
    if (A.timerStart !== null) { A.timerBase += Date.now() - A.timerStart; A.timerStart = null; }
    if (A.timerIv) { clearInterval(A.timerIv); A.timerIv = null; }
  }
  function resumeArtTimer() {
    if (A.timerStart !== null || !A.active || A.finished || !A.started) return;
    A.timerStart = Date.now();
    if (A.timerIv) clearInterval(A.timerIv);
    A.timerIv = setInterval(() => {
      if (currentView === "article" && A.active && !A.finished) updateLive();
    }, 400);
  }
  function resetArtTimer() { pauseArtTimer(); A.timerBase = 0; }
  function startIfNeeded() {
    if (!A.started) { A.started = true; resumeArtTimer(); }
  }

  /* ---------- 建会话 ---------- */
  function singlePy(ch) {
    try {
      const t = window.pinyinPro.pinyin(ch, { toneType: "none", type: "array", v: true });
      return (Array.isArray(t) && t.length === 1) ? t[0] : null;
    } catch (e) { return null; }
  }

  function tokenizeParagraphs(paragraphs) {
    const groups = [];
    for (const text of paragraphs) {
      const chars = Array.from(String(text || "").trim());
      if (!chars.length) continue;
      let pys = null;
      try { pys = window.pinyinPro.pinyin(text, { toneType: "none", type: "array", v: true }); } catch (e) { pys = null; }
      const aligned = pys && pys.length === chars.length;
      const items = chars.map((ch, i) => {
        let py = null, code = null;
        if (HAN.test(ch)) {
          const raw = aligned ? pys[i] : singlePy(ch);
          if (raw && raw !== ch) { py = raw; code = codeFor(raw); }
        }
        return { ch, py, code, skip: !code, done: !code, typedLen: 0, el: null, pyEl: null };
      });
      if (items.some(x => !x.skip)) groups.push(items);
    }
    return groups;
  }

  function buildSession(title, byline, paragraphs) {
    const groups = tokenizeParagraphs(paragraphs);
    if (!groups.length) { toast("这段文字没有可练习的汉字"); return false; }
    const flat = [].concat(...groups);
    const total = flat.filter(c => !c.skip).length;
    if (!total) { toast("这段文字没有可练习的汉字"); return false; }
    A.session = { title, byline, groups, flat };
    A.curIdx = flat.findIndex(c => !c.skip);
    A.total = total;
    A.active = true; A.finished = false; A.started = false;
    A.stats = { correct: 0, wrong: 0, itemsDone: 0, bestCombo: 0, combo: 0, wrongKeys: {} };
    resetArtTimer();
    $("#article-setup").hidden = true;
    $("#article-area").hidden = false;
    $("#art-finish").hidden = true;
    $("#art-title").innerHTML = escapeHtml(title) + (byline ? ` <small>· ${escapeHtml(byline)}</small>` : "");
    renderText();
    updateLive();
    return true;
  }

  /* ---------- 渲染正文 ---------- */
  function renderText() {
    const box = $("#art-text");
    box.classList.toggle("nohint", !settings.hint);
    box.innerHTML = A.session.groups.map(group =>
      `<p class="apara">` + group.map(c =>
        `<span class="ac${c.skip ? " skip" : ""}"><i class="py">${escapeHtml(c.py || "")}</i><b class="hz">${escapeHtml(c.ch)}</b></span>`
      ).join("") + `</p>`
    ).join("");
    A.session.groups.forEach(group => group.forEach(c => { c.el = null; c.pyEl = null; }));
    // 按遍历顺序回填 DOM 引用（外层段落、内层逐字）
    box.querySelectorAll(".apara").forEach((p, gi) => {
      p.querySelectorAll(".ac").forEach((el, ii) => {
        const c = A.session.groups[gi][ii];
        c.el = el; c.pyEl = el.querySelector(".py");
      });
    });
    if (A.curIdx >= 0) setCur(A.curIdx);
  }

  function setCur(j) {
    if (!A.session) return;
    A.session.flat.forEach(c => { if (c.el) c.el.classList.remove("cur"); });
    const c = A.session.flat[j];
    if (!c || !c.el) return;
    c.el.classList.add("cur");
    renderCurSlots();
    c.el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function renderCurSlots() {
    const cur = A.session && A.session.flat ? A.session.flat[A.curIdx] : null;
    if (!cur || !cur.pyEl) return;
    if (!settings.hint) { cur.pyEl.innerHTML = ""; return; }
    cur.pyEl.innerHTML = Array.from(cur.code || "").map((k, j) =>
      `<em class="${j < cur.typedLen ? "hit" : ""}">${escapeHtml(k)}</em>`
    ).join("") || "·";
  }

  function refreshHints() {
    if (!$("#art-text")) return;
    $("#art-text").classList.toggle("nohint", !settings.hint);
    if (!A.session) return;
    A.session.groups.forEach(group => group.forEach(c => {
      if (c.pyEl) c.pyEl.textContent = c.py || "";
    }));
    renderCurSlots();
  }

  function flashErr() {
    const c = A.session && A.session.flat ? A.session.flat[A.curIdx] : null;
    if (!c || !c.el) return;
    c.el.classList.remove("err");
    void c.el.offsetWidth;
    c.el.classList.add("err");
  }

  /* ---------- 实时统计 ---------- */
  function updateLive() {
    if (!A.session) return;
    const done = A.stats.itemsDone, total = A.total;
    const ks = A.stats.correct + A.stats.wrong;
    const acc = ks ? Math.round(A.stats.correct / ks * 100) : 100;
    const elapsed = artElapsed();
    const speed = Math.round(done / Math.max(elapsed / 60000, 0.01));
    const accClass = acc >= 95 ? "ok" : (acc >= 85 ? "" : "bad");
    $("#art-live").innerHTML = `
      <span class="chip">完成 <b>${done}</b>/${total}</span>
      <span class="chip">⏱ <b>${fmtTime(elapsed)}</b></span>
      <span class="chip">速度 <b>${speed}</b> 字/分</span>
      <span class="chip">准确率 <b class="${accClass}">${acc}%</b></span>
      <span class="chip">连击 <b>${A.stats.combo}</b></span>`;
    $("#art-progress").style.width = (total ? done / total * 100 : 0) + "%";
  }

  /* ---------- 击键 ---------- */
  function handleType(k) {
    const c = A.session.flat[A.curIdx];
    if (!c) return;
    if (k === c.code[c.typedLen]) {
      c.typedLen++;
      A.stats.correct++;
      A.stats.combo++;
      if (A.stats.combo > A.stats.bestCombo) A.stats.bestCombo = A.stats.combo;
      soundCorrect();
      if (c.typedLen === c.code.length) {
        c.done = true;
        A.stats.itemsDone++;
        nextChar();
        return;
      }
      renderCurSlots();
      updateLive();
    } else {
      A.stats.wrong++;
      A.stats.combo = 0;
      A.stats.wrongKeys[k] = (A.stats.wrongKeys[k] || 0) + 1;
      soundWrong();
      flashErr();
      updateLive();
    }
  }

  function nextChar() {
    const s = A.session;
    const cur = s.flat[A.curIdx];
    if (cur && cur.el) {
      cur.el.classList.remove("cur");
      cur.el.classList.add("done");
      if (cur.pyEl && settings.hint) cur.pyEl.textContent = cur.py || "";
    }
    if (A.stats.itemsDone >= A.total) { A.curIdx = -1; finish(); return; }
    for (let j = A.curIdx + 1; j < s.flat.length; j++) {
      if (!s.flat[j].skip) { A.curIdx = j; setCur(j); updateLive(); return; }
    }
    finish();
  }

  function stepBack() {
    if (!A.session || A.finished) return;
    const s = A.session;
    const c = s.flat[A.curIdx];
    if (!c) return;
    if (c.typedLen > 0) {
      c.typedLen--;
      A.stats.correct = Math.max(0, A.stats.correct - 1);
      A.stats.combo = 0;
      renderCurSlots();
      updateLive();
      return;
    }
    for (let j = A.curIdx - 1; j >= 0; j--) {
      const p = s.flat[j];
      if (!p.skip) {
        c.el.classList.remove("cur");
        if (c.pyEl && settings.hint) c.pyEl.textContent = c.py || "";
        p.done = false; p.typedLen = 0;
        p.el.classList.remove("done", "err");
        A.stats.itemsDone = Math.max(0, A.stats.itemsDone - 1);
        A.stats.combo = 0;
        A.curIdx = j;
        setCur(j);
        updateLive();
        return;
      }
    }
  }

  function finish() {
    if (A.finished) return;
    A.finished = true;
    A.active = false;
    pauseArtTimer();
    const elapsed = artElapsed();
    const ks = A.stats.correct + A.stats.wrong;
    const acc = ks ? Math.round(A.stats.correct / ks * 100) : 100;
    const speed = Math.round(A.stats.itemsDone / Math.max(elapsed / 60000, 0.01));
    mergeRoundIntoStats(A.stats, elapsed);
    $("#art-finish-title").textContent = A.session ? A.session.title : "";
    $("#art-finish-grid").innerHTML = `
      <div class="cell"><div class="num">${fmtTime(elapsed)}</div><div class="k">用时</div></div>
      <div class="cell"><div class="num">${A.stats.itemsDone}</div><div class="k">字数</div></div>
      <div class="cell"><div class="num">${speed}</div><div class="k">速度（字/分）</div></div>
      <div class="cell"><div class="num">${acc}%</div><div class="k">准确率</div></div>
      <div class="cell"><div class="num">${A.stats.bestCombo}</div><div class="k">最高连击</div></div>
      <div class="cell"><div class="num">${ks}</div><div class="k">击键数</div></div>`;
    const wk = Object.entries(A.stats.wrongKeys).sort((a, b) => b[1] - a[1]);
    $("#art-wrong-keys").innerHTML = wk.length
      ? `<div class="wk-title">本轮错键分布</div>` + wk.map(([k, v]) => `<span class="wk"><b>${escapeHtml(k.toUpperCase())}</b> × ${v}</span>`).join("")
      : `<div class="wk-title">🎯 不错一键，继续保持</div>`;
    $("#art-finish").hidden = false;
    soundDone();
  }

  function exitToList() {
    A.active = false; A.finished = false; A.started = false;
    pauseArtTimer();
    A.session = null;
    $("#article-area").hidden = true;
    $("#art-finish").hidden = true;
    $("#article-setup").hidden = false;
    renderList();
  }

  /* ---------- 文章列表 ---------- */
  function artCardHtml(a) {
    const n = (a.paragraphs || []).join("").length;
    const paras = (a.paragraphs || []).length;
    return `<button class="art-card" data-art="${escapeHtml(a.id)}"><strong>${escapeHtml(a.title)}</strong><span class="meta">${escapeHtml(a.author || "佚名")} · ${n} 字 · ${paras} 段</span></button>`;
  }

  function renderList() {
    A.listRendered = true;
    const pool = window.SP_ARTICLES || { classics: [], originals: [], sentences: [] };
    const classics = pool.classics || [];
    const originals = pool.originals || [];
    const sentences = pool.sentences || [];
    const byCat = {};
    sentences.forEach(s => { const c = s.cat || "其他"; byCat[c] = (byCat[c] || 0) + 1; });
    const cats = ["全部", ...Object.keys(byCat)];
    const catChips = cats.map(cat => {
      const n = cat === "全部" ? sentences.length : byCat[cat];
      const label = cat === "全部" ? "随机十句" : `随机十句 · ${cat}`;
      return `<button class="art-card sentence${n ? "" : " off"}" data-cat="${escapeHtml(cat)}"${n ? "" : " disabled"}><strong>${escapeHtml(label)}</strong><span class="meta">${n || "无"} 句可用</span></button>`;
    }).join("");
    $("#article-list").innerHTML = `
      <div class="art-sec">📖 经典散文</div>
      <div class="art-grid">${classics.map(artCardHtml).join("")}</div>
      <div class="art-sec">✍️ 随手短文</div>
      <div class="art-grid">${originals.map(artCardHtml).join("")}</div>
      <div class="art-sec">🌿 美文句子 · 一段十句</div>
      <div class="art-grid">${catChips}<button class="art-card online" id="btn-art-online"><strong>🌐 联网获取十句</strong><span class="meta">需要网络 · 一言 API</span></button></div>`;
  }

  /* ---------- 启动各类练习 ---------- */
  function startArticle(art) {
    A.lastSource = { title: art.title, byline: art.author || "佚名", paragraphs: art.paragraphs || [] };
    buildSession(A.lastSource.title, A.lastSource.byline, A.lastSource.paragraphs);
  }

  function startSentenceSet(cat) {
    const sentences = (window.SP_ARTICLES || {}).sentences || [];
    let pool = cat === "全部" ? sentences : sentences.filter(s => (s.cat || "其他") === cat);
    if (!pool.length) { toast("该分类暂无句子"); return; }
    pool = shuffle(pool).slice(0, 10);
    A.lastSource = { title: "美文十句" + (cat === "全部" ? "" : " · " + cat), byline: "一言 hitokoto · 内置句库", paragraphs: pool.map(s => s.t) };
    buildSession(A.lastSource.title, A.lastSource.byline, A.lastSource.paragraphs);
  }

  async function fetchSentences(n) {
    const cats = ["d", "i", "k"];
    const out = [];
    for (let i = 0; i < n; i++) {
      const c = cats[(Math.random() * cats.length) | 0];
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 5000);
      let r = null;
      try {
        r = await fetch(`https://v1.hitokoto.cn/?c=${c}&min_length=8&max_length=45&encode=json&t=${Date.now()}_${i}`, {
          cache: "no-store", signal: ctrl.signal, referrerPolicy: "no-referrer",
        });
      } catch (e) { /* 单条失败继续 */ } finally { clearTimeout(to); }
      if (!r || !r.ok) continue;
      try {
        const o = await r.json();
        const t = (o.hitokoto || "").trim();
        if (t.length >= 8 && !out.some(x => x.t === t)) out.push({ t, from: o.from || "", by: o.from_who || "" });
      } catch (e) { /* ignore */ }
    }
    return out;
  }

  async function startOnline() {
    if (A.busy) return;
    const btn = $("#btn-art-online");
    if (btn) btn.innerHTML = "<strong>🌐 抓取中…</strong><span class=\"meta\">正在请求一言 API</span>";
    A.busy = true;
    let list = [];
    try { list = await fetchSentences(10); } catch (e) { console.warn("[文章] 联网获取失败", e); }
    A.busy = false;
    if (list.length >= 3) {
      A.lastSource = { title: "联网新句", byline: "一言 hitokoto · 实时获取", paragraphs: list.map(s => s.t) };
      buildSession(A.lastSource.title, A.lastSource.byline, A.lastSource.paragraphs);
    } else {
      toast("联网获取失败，改用内置句子");
      const fallback = shuffle((window.SP_ARTICLES || {}).sentences || []).slice(0, 10);
      if (fallback.length) {
        A.lastSource = { title: "内置美文十句", byline: "一言 hitokoto · 离线句库", paragraphs: fallback.map(s => s.t) };
        buildSession(A.lastSource.title, A.lastSource.byline, A.lastSource.paragraphs);
      } else {
        renderList();
      }
    }
  }

  function startCustom() {
    const ta = $("#art-custom-text");
    const paragraphs = (ta.value || "").split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (!paragraphs.length) { toast("请先粘贴或输入一段文字"); return; }
    A.lastSource = { title: "自定义文本", byline: "", paragraphs };
    buildSession(A.lastSource.title, A.lastSource.byline, paragraphs);
  }

  /* ---------- 对外接口（app.js 调用） ---------- */
  function onView(name) {
    if (name === "article") {
      if (!A.listRendered) renderList();
      if (A.active && !A.finished) { resumeArtTimer(); updateLive(); }
      return;
    }
    pauseArtTimer();
    if (A.finished) exitToList();
  }
  function onKey(e) {
    if (!A.active || A.finished || !A.session) return;
    if (e.key === "Backspace") { e.preventDefault(); stepBack(); return; }
    if (/^[a-zA-Z;]$/.test(e.key)) {
      startIfNeeded();
      handleType(e.key.toLowerCase());
    }
  }
  function onEscape() {
    if ($("#art-finish") && !$("#art-finish").hidden) { exitToList(); return; }
    if (A.active || A.finished) exitToList();
  }
  function onSchemeChange() {
    if (A.active || A.finished) { exitToList(); toast("方案已切换，当前文章编码已按新方案重算，请重新开始"); }
  }
  function onSettings() {
    if (A.session) refreshHints();
  }

  /* ---------- 初始化 ---------- */
  $("#article-list").addEventListener("click", e => {
    const card = e.target.closest(".art-card");
    if (!card || card.disabled) return;
    if (card.id === "btn-art-online") { startOnline(); return; }
    if (card.dataset.art) {
      const pool = window.SP_ARTICLES || { classics: [], originals: [], sentences: [] };
      const art = [...((pool.classics || []).concat(pool.originals || []))].find(x => x.id === card.dataset.art);
      if (art) startArticle(art);
      return;
    }
    if (card.dataset.cat) startSentenceSet(card.dataset.cat);
  });
  $("#btn-art-exit").addEventListener("click", exitToList);
  $("#btn-art-again").addEventListener("click", () => {
    const src = A.lastSource;
    if (src && src.paragraphs && src.paragraphs.length) buildSession(src.title, src.byline, src.paragraphs);
  });
  $("#btn-art-list").addEventListener("click", exitToList);
  $("#art-finish").addEventListener("click", e => { if (e.target.id === "art-finish") exitToList(); });
  $("#btn-art-custom").addEventListener("click", startCustom);

  window.ArticlePractice = { onView, onKey, onEscape, onSchemeChange, onSettings, renderList };
})();