/* ================= 文章练习 =================
   纯本地 + 可选联网（一言 hitokoto API，与 shuangpin.xyz 同款数据源）。
   依赖（app.js 顶层全局，同全局词法作用域内可直接使用）：
   $, $$, settings, codeFor, shuffle, soundCorrect, soundWrong, soundDone,
   mergeRoundIntoStats, fmtTime, escapeHtml, currentView(只读), lsGet, lsSet, LS_KEYS,
   applyArticleFont, renderArtKeyboard, flashArtKey, setView
*/
(function () {
  "use strict";
  if (typeof window.pinyinPro === "undefined") {
    console.error("[文章练习] pinyin-pro 未加载，文章练习不可用");
    return;
  }

  const HAN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
  const A_LS = { progress: "sp_article_progress_v1", done: "sp_article_done_v1" };

  const A = {
    session: null,       // { title, byline, groups:[[char...]], flat:[char...] }
    segments: [],        // 逐段模式下的显示单元（每个单元是一组字）
    segIdx: 0,           // 当前显示的第几段（逐段模式）
    segmented: true,     // 是否逐段显示
    curIdx: -1,          // flat 中当前待打汉字下标
    total: 0,            // 待打汉字总数
    baseDone: 0,         // 恢复进度时，本次打开前已经完成的字数（只用于进度显示）
    sessionStartIdx: 0,  // 本次会话最早可回退到的 flat 下标
    active: false,
    finished: false,
    started: false,
    stats: null,         // {correct,wrong,itemsDone,bestCombo,combo,wrongKeys}（仅本次会话）
    lastSource: null,    // { title, byline, paragraphs }
    lastSourceId: null,  // 上次练习的内置文章 id（无 id 的为 null）
    articleId: null,     // 当前会话对应的内置文章 id（用于进度与已练记录）
    listRendered: false,
    busy: false,
    autoStarted: false,  // 是否已做过启动自动开文
    speeds: [],          // 每字瞬时速度采样（字/分）
    lastCharTime: 0,
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

  /* ---------- 拼音/转码 ---------- */
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
        return { ch, py, code, skip: !code, done: !code, typedLen: 0, errs: 0, el: null, pyEl: null, g: 0, seg: 0 };
      });
      if (items.some(x => !x.skip)) groups.push(items);
    }
    return groups;
  }

  /* 把过长的段落按句子裁剪成显示单元（逐段模式用） */
  function buildSegments(groups) {
    const MAX = 60;
    const segs = [];
    for (const group of groups) {
      if (!group.length) continue;
      let cur = [];
      for (let i = 0; i < group.length; i++) {
        const c = group[i];
        cur.push(c);
        const hardEnd = /[。！？；!?;…]/.test(c.ch);
        if (cur.length >= MAX && (hardEnd || i === group.length - 1)) {
          segs.push(cur); cur = [];
        } else if (cur.length >= MAX) {
          let splitAt = -1;
          for (let j = cur.length - 1; j >= Math.floor(MAX * 0.5); j--) {
            if (/[，、：,]/.test(cur[j].ch)) { splitAt = j; break; }
          }
          if (splitAt >= 0) {
            segs.push(cur.slice(0, splitAt + 1));
            cur = cur.slice(splitAt + 1);
          } else {
            segs.push(cur); cur = [];
          }
        }
      }
      if (cur.length) segs.push(cur);
    }
    return segs;
  }

  /* ---------- 建会话 ---------- */
  function buildSession(title, byline, paragraphs) {
    const groups = tokenizeParagraphs(paragraphs);
    if (!groups.length) { toast("这段文字没有可练习的汉字"); return false; }
    const flat = [].concat(...groups);
    const total = flat.filter(c => !c.skip).length;
    if (!total) { toast("这段文字没有可练习的汉字"); return false; }

    let gi = 0;
    groups.forEach(g => { g.forEach(c => { c.g = gi; }); gi++; });
    const segments = buildSegments(groups);
    segments.forEach((seg, si) => seg.forEach(c => { c.seg = si; }));

    const first = flat.findIndex(c => !c.skip);
    A.session = { title, byline, groups, flat };
    A.segments = segments;
    A.segmented = !!settings.articleSegmented;
    A.curIdx = first;
    A.segIdx = flat[first].seg;
    A.total = total;
    A.baseDone = 0;
    A.sessionStartIdx = first;
    A.active = true; A.finished = false; A.started = false;
    A.stats = { correct: 0, wrong: 0, itemsDone: 0, bestCombo: 0, combo: 0, wrongKeys: {} };
    A.speeds = []; A.lastCharTime = 0;
    resetArtTimer();
    $("#article-setup").hidden = true;
    $("#article-area").hidden = false;
    $("#art-finish").hidden = true;
    $("#art-hint").checked = !!settings.hint;
    $("#art-seg").checked = !!settings.articleSegmented;
    $("#art-font").value = settings.articleFont || "system";
    $("#art-bold").checked = !!settings.articleBold;
    if (typeof applyArticleFont === "function") applyArticleFont();
    $("#art-title").innerHTML = escapeHtml(title) + (byline ? ` <small>· ${escapeHtml(byline)}</small>` : "");
    renderText();
    updateLive();
    updateSpeedChart();
    return true;
  }

  /* 恢复上次练习位置：之前的字标记为已完成，从保存下标继续 */
  function applyResume(idx) {
    const s = A.session;
    if (!s) return;
    let j = Math.max(0, Math.min(idx || 0, s.flat.length - 1));
    while (j < s.flat.length && s.flat[j].skip) j++;
    if (j >= s.flat.length) j = s.flat.findIndex(c => !c.skip);
    let doneBefore = 0;
    for (let i = 0; i < j; i++) {
      const c = s.flat[i];
      if (!c.skip) {
        c.done = true;
        c.typedLen = (c.code || "").length;
        doneBefore++;
      }
    }
    A.baseDone = doneBefore;
    A.sessionStartIdx = j;
    A.curIdx = j;
    A.segIdx = s.flat[j].seg;
    A.stats.itemsDone = 0;
    renderText();
    updateLive();
  }

  /* ---------- 渲染正文 ---------- */
  function cellHtml(c) {
    const doneCls = (c.done && !c.skip) ? " done" : "";
    const errAttr = c.errs ? ` data-errs="${Math.min(c.errs, 4)}"` : "";
    return `<span class="ac${c.skip ? " skip" : ""}${doneCls}"${errAttr}><i class="py">${escapeHtml(c.py || "")}</i><b class="hz">${escapeHtml(c.ch)}</b></span>`;
  }

  function renderText() {
    const box = $("#art-text");
    if (!box) return;
    box.classList.toggle("nohint", !settings.hint);
    const items = A.segmented ? (A.segments[A.segIdx] || []) : A.session.flat;
    const html = A.segmented
      ? `<p class="apara">` + items.map(cellHtml).join("") + `</p>`
      : A.session.groups.map(g => `<p class="apara">` + g.map(cellHtml).join("") + `</p>`).join("");
    box.innerHTML = html;
    A.session.flat.forEach(c => { c.el = null; c.pyEl = null; });
    box.querySelectorAll(".ac").forEach((el, ii) => {
      const c = items[ii];
      if (c) { c.el = el; c.pyEl = el.querySelector(".py"); }
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
    const box = $("#art-text");
    if (box) box.classList.toggle("nohint", !settings.hint);
    if (!A.session) return;
    A.session.flat.forEach(c => {
      if (c.pyEl) c.pyEl.textContent = c.py || "";
    });
    renderCurSlots();
  }

  function flashErr() {
    const c = A.session && A.session.flat ? A.session.flat[A.curIdx] : null;
    if (!c || !c.el) return;
    c.errs = (c.errs || 0) + 1;
    c.el.dataset.errs = String(Math.min(c.errs, 4));
    c.el.classList.remove("err");
    void c.el.offsetWidth;
    c.el.classList.add("err");
  }

  /* ---------- 实时统计 / 进度 / 速度曲线 ---------- */
  function countDone(items) {
    return items.filter(c => !c.skip && c.done).length;
  }

  function updateLive() {
    if (!A.session) return;
    let done, total;
    if (A.segmented) {
      const seg = A.segments[A.segIdx] || [];
      total = seg.filter(c => !c.skip).length;
      done = countDone(seg);
    } else {
      total = A.total;
      done = countDone(A.session.flat);
    }
    const ks = A.stats.correct + A.stats.wrong;
    const acc = ks ? Math.round(A.stats.correct / ks * 100) : 100;
    const elapsed = artElapsed();
    const speed = Math.round(A.stats.itemsDone / Math.max(elapsed / 60000, 0.01));
    const accClass = acc >= 95 ? "ok" : (acc >= 85 ? "" : "bad");
    const segInfo = A.segmented ? `<span class="chip">${A.segIdx + 1}/${A.segments.length} 段</span>` : `<span class="chip">全文</span>`;
    $("#art-live").innerHTML = `
      ${segInfo}
      <span class="chip">完成 <b>${done}</b>/${total}</span>
      <span class="chip">⏱ <b>${fmtTime(elapsed)}</b></span>
      <span class="chip">速度 <b>${speed}</b> 字/分</span>
      <span class="chip">准确率 <b class="${accClass}">${acc}%</b></span>
      <span class="chip">连击 <b>${A.stats.bestCombo}</b></span>`;
    $("#art-progress").style.width = (total ? done / total * 100 : 0) + "%";
  }

  function updateSpeedChart() {
    const el = $("#art-speed");
    if (!el) return;
    const data = A.speeds.slice(-60);
    if (!data.length) {
      el.innerHTML = `<div class="speed-empty">开始输入后，这里会显示每字速度曲线（越快越高）</div>`;
      return;
    }
    const w = Math.max(el.clientWidth || 600, 100);
    const h = 40;
    const max = Math.max.apply(null, data.concat([60]));
    let shape;
    if (data.length === 1) {
      const x = w / 2, y = h - Math.min(data[0] / max, 1) * (h - 4);
      shape = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--accent)"/>`;
    } else {
      const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - Math.min(v / max, 1) * (h - 4);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      const line = pts.join(" ");
      const area = `0,${h} ${line} ${w},${h}`;
      shape = `<polygon points="${area}" fill="var(--accent-soft)"/><polyline points="${line}" fill="none" stroke="var(--accent)" stroke-width="2"/>`;
    }
    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="speed-svg">${shape}</svg>`;
  }

  function recordSpeed() {
    const now = Date.now();
    let v;
    if (!A.lastCharTime) {
      const min = Math.max(artElapsed() / 60000, 0.002);
      v = Math.round(1 / min);
    } else {
      const dt = now - A.lastCharTime;
      v = dt > 0 ? Math.round(60000 / dt) : 0;
    }
    A.lastCharTime = now;
    v = Math.max(0, Math.min(v, 400));
    A.speeds.push(v);
    if (A.speeds.length > 80) A.speeds.shift();
    updateSpeedChart();
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
        c.errs = 0;
        if (c.el) { c.el.classList.remove("err"); delete c.el.dataset.errs; }
        A.stats.itemsDone++;
        recordSpeed();
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
    if (countDone(s.flat) >= A.total) { A.curIdx = -1; finish(); return; }
    let j = A.curIdx + 1;
    while (j < s.flat.length && s.flat[j].skip) j++;
    if (j >= s.flat.length) { finish(); return; }
    A.curIdx = j;
    if (A.segmented) {
      const nextSeg = s.flat[j].seg;
      if (nextSeg !== A.segIdx) { A.segIdx = nextSeg; renderText(); }
    }
    setCur(j);
    saveProgress();
    updateLive();
  }

  function stepBack() {
    if (!A.session || A.finished) return;
    const s = A.session;
    const c = s.flat[A.curIdx];
    if (!c) return;
    if (c.typedLen > 0) {
      c.typedLen--;
      c.errs = 0;
      if (c.el) { c.el.classList.remove("err"); delete c.el.dataset.errs; }
      A.stats.correct = Math.max(0, A.stats.correct - 1);
      A.stats.combo = 0;
      renderCurSlots();
      updateLive();
      return;
    }
    for (let j = A.curIdx - 1; j >= A.sessionStartIdx; j--) {
      const p = s.flat[j];
      if (!p.skip) {
        if (c.el) {
          c.el.classList.remove("cur");
          if (c.pyEl && settings.hint) c.pyEl.textContent = c.py || "";
        }
        p.done = false; p.typedLen = 0; p.errs = 0;
        if (p.el) p.el.classList.remove("done", "err");
        A.stats.itemsDone = Math.max(0, A.stats.itemsDone - 1);
        A.stats.combo = 0;
        if (A.speeds.length) { A.speeds.pop(); updateSpeedChart(); }
        A.curIdx = j;
        if (A.segmented && p.seg !== A.segIdx) { A.segIdx = p.seg; renderText(); }
        setCur(j);
        saveProgress();
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
    if (A.articleId) {
      markDone(A.articleId);
      A.articleId = null;
    }
    lsSet(A_LS.progress, null);
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
    if (A.active && !A.finished) saveProgress();
    A.active = false; A.finished = false; A.started = false;
    pauseArtTimer();
    A.session = null;
    A.segments = [];
    $("#article-area").hidden = true;
    $("#art-finish").hidden = true;
    $("#article-setup").hidden = false;
    renderList();
  }

  /* ---------- 进度与已练记录 ---------- */
  function saveProgress() {
    if (!A.articleId || !A.session || A.finished) return;
    lsSet(A_LS.progress, { id: A.articleId, idx: A.curIdx, ts: Date.now() });
  }
  function markDone(id) {
    const done = lsGet(A_LS.done, {});
    done[id] = { n: ((done[id] && done[id].n) || 0) + 1, last: Date.now() };
    lsSet(A_LS.done, done);
  }
  function findArticle(id) {
    const pool = window.SP_ARTICLES || {};
    return ((pool.classics || []).concat(pool.originals || [])).find(x => x.id === id) || null;
  }

  /* ---------- 文章列表 ---------- */
  function artCardHtml(a, doneMap) {
    const practiced = doneMap && doneMap[a.id];
    const n = (a.paragraphs || []).join("").length;
    const paras = (a.paragraphs || []).length;
    return `<button class="art-card${practiced ? " done" : ""}" data-art="${escapeHtml(a.id)}"><strong>${escapeHtml(a.title)}${practiced ? ` <span class="badge">✓ 已练</span>` : ""}</strong><span class="meta">${escapeHtml(a.author || "佚名")} · ${n} 字 · ${paras} 段</span></button>`;
  }

  function renderList() {
    A.listRendered = true;
    const pool = window.SP_ARTICLES || { classics: [], originals: [], sentences: [] };
    const classics = pool.classics || [];
    const originals = pool.originals || [];
    const sentences = pool.sentences || [];
    const doneMap = lsGet(A_LS.done, {});
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
      <div class="art-grid">${classics.map(a => artCardHtml(a, doneMap)).join("")}</div>
      <div class="art-sec">✍️ 随手短文</div>
      <div class="art-grid">${originals.map(a => artCardHtml(a, doneMap)).join("")}</div>
      <div class="art-sec">🌿 美文句子 · 一段十句</div>
      <div class="art-grid">${catChips}<button class="art-card online" id="btn-art-online"><strong>🌐 联网获取十句</strong><span class="meta">需要网络 · 一言 API</span></button></div>`;
  }

  /* ---------- 启动各类练习 ---------- */
  function startArticle(art, resumeIdx) {
    A.articleId = art.id || null;
    A.lastSourceId = art.id || null;
    A.lastSource = { title: art.title, byline: art.author || "佚名", paragraphs: art.paragraphs || [] };
    if (buildSession(A.lastSource.title, A.lastSource.byline, A.lastSource.paragraphs)) {
      if (typeof resumeIdx === "number" && resumeIdx >= 0) applyResume(resumeIdx);
      else saveProgress();
    }
  }

  function startSentenceSet(cat) {
    const sentences = (window.SP_ARTICLES || {}).sentences || [];
    let pool = cat === "全部" ? sentences : sentences.filter(s => (s.cat || "其他") === cat);
    if (!pool.length) { toast("该分类暂无句子"); return; }
    pool = shuffle(pool).slice(0, 10);
    A.articleId = null; A.lastSourceId = null;
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
      A.articleId = null; A.lastSourceId = null;
      A.lastSource = { title: "联网新句", byline: "一言 hitokoto · 实时获取", paragraphs: list.map(s => s.t) };
      buildSession(A.lastSource.title, A.lastSource.byline, A.lastSource.paragraphs);
    } else {
      toast("联网获取失败，改用内置句子");
      const fallback = shuffle((window.SP_ARTICLES || {}).sentences || []).slice(0, 10);
      if (fallback.length) {
        A.articleId = null; A.lastSourceId = null;
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
    A.articleId = null; A.lastSourceId = null;
    A.lastSource = { title: "自定义文本", byline: "", paragraphs };
    buildSession(A.lastSource.title, A.lastSource.byline, paragraphs);
  }

  function restartLast() {
    const src = A.lastSource;
    if (!src || !src.paragraphs || !src.paragraphs.length) return;
    A.articleId = A.lastSourceId || null;
    buildSession(src.title, src.byline, src.paragraphs);
    saveProgress();
  }

  /* ---------- 启动自动开文 ---------- */
  function autoStartArticle() {
    if (A.autoStarted) return;
    A.autoStarted = true;
    const saved = lsGet(A_LS.progress, null);
    if (saved && saved.id) {
      const art = findArticle(saved.id);
      if (art) { startArticle(art, saved.idx); return; }
    }
    const pool = ((window.SP_ARTICLES || {}).classics || []).concat((window.SP_ARTICLES || {}).originals || []);
    if (pool.length) startArticle(pool[Math.floor(Math.random() * pool.length)]);
  }

  /* ---------- 对外接口（app.js 调用） ---------- */
  function onView(name) {
    if (name === "article") {
      if (!A.listRendered) renderList();
      if (A.active && !A.finished) { resumeArtTimer(); updateLive(); return; }
      if (!A.active && !A.finished && !A.session) autoStartArticle();
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
      if (typeof flashArtKey === "function") flashArtKey(e.key.toLowerCase());
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
    const hintEl = $("#art-hint");
    if (hintEl) hintEl.checked = !!settings.hint;
    const segEl = $("#art-seg");
    if (segEl) segEl.checked = !!settings.articleSegmented;
    const fontEl = $("#art-font");
    if (fontEl) fontEl.value = settings.articleFont || "system";
    const boldEl = $("#art-bold");
    if (boldEl) boldEl.checked = !!settings.articleBold;
    if (typeof applyArticleFont === "function") applyArticleFont();
    if (A.session) refreshHints();
  }

  /* ---------- 初始化 ---------- */
  $("#article-list").addEventListener("click", e => {
    const card = e.target.closest(".art-card");
    if (!card || card.disabled) return;
    if (card.id === "btn-art-online") { startOnline(); return; }
    if (card.dataset.art) {
      const pool = window.SP_ARTICLES || { classics: [], originals: [], sentences: [] };
      const art = ((pool.classics || []).concat(pool.originals || [])).find(x => x.id === card.dataset.art);
      if (art) startArticle(art);
      return;
    }
    if (card.dataset.cat) startSentenceSet(card.dataset.cat);
  });
  $("#btn-art-exit").addEventListener("click", exitToList);
  $("#btn-art-list-side").addEventListener("click", exitToList);
  $("#btn-art-restart").addEventListener("click", restartLast);
  $("#btn-art-again").addEventListener("click", restartLast);
  $("#btn-art-list").addEventListener("click", exitToList);
  $("#art-finish").addEventListener("click", e => { if (e.target.id === "art-finish") exitToList(); });
  $("#btn-art-custom").addEventListener("click", startCustom);
  $("#art-hint").addEventListener("change", e => {
    settings.hint = e.target.checked;
    lsSet(LS_KEYS.settings, settings);
    refreshHints();
  });
  $("#art-seg").addEventListener("change", e => {
    settings.articleSegmented = e.target.checked;
    lsSet(LS_KEYS.settings, settings);
    if (A.session) {
      A.segmented = settings.articleSegmented;
      if (A.segmented) A.segIdx = A.session.flat[A.curIdx].seg;
      renderText();
      updateLive();
    }
  });
  $("#art-font").addEventListener("change", e => {
    settings.articleFont = e.target.value;
    lsSet(LS_KEYS.settings, settings);
    if (typeof applyArticleFont === "function") applyArticleFont();
  });
  $("#art-bold").addEventListener("change", e => {
    settings.articleBold = e.target.checked;
    lsSet(LS_KEYS.settings, settings);
    if (typeof applyArticleFont === "function") applyArticleFont();
  });

  window.ArticlePractice = { onView, onKey, onEscape, onSchemeChange, onSettings, renderList };
  setView("article");
})();
