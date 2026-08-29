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
  const A_LS = { progress: "sp_article_progress_v1", done: "sp_article_done_v1", good: "sp_good_v1" };

  const A = {
    session: null,       // { title, byline, groups:[[char...]], flat:[char...] }
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
    goodMode: false,     // 是否处于“好词好句”无限练模式
    goodLoading: false,  // 正在联网取下一批句子
    good: null,          // { total, timeMs, days:{}, progress:{pool,idx,ts} }
    goodPrefetching: false,
    goodBatchGen: 0,     // 批次代号，用于作废过期预加载
    goodWinStart: 0,     // 当前 DOM 窗口第一句在 good.pool 中的下标
    goodRemovedChars: 0, // 已从窗口头部删除的字符总数（用于把窗口内 curIdx 换算成绝对下标）
    goodDoneBase: 0,     // 已从窗口删除的已完成字数（用于进度条累计）
    instantScroll: false,// 好词好句滑动窗口时跳过滚动动画，直接定位
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
        return { ch, py, code, skip: !code, done: !code, typedLen: 0, errs: 0, wrongRun: 0, revealed: false, el: null, pyEl: null, g: 0 };
      });
      if (items.some(x => !x.skip)) groups.push(items);
    }
    return groups;
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
    const first = flat.findIndex(c => !c.skip);
    A.session = { title, byline, groups, flat };
    A.curIdx = first;
    A.total = total;
    A.baseDone = 0;
    A.sessionStartIdx = first;
    A.active = true; A.finished = false; A.started = false;
    A.stats = { correct: 0, wrong: 0, itemsDone: 0, bestCombo: 0, combo: 0, wrongKeys: {} };
    A.speeds = []; A.speedWrong = []; A.lastCharTime = 0;
    resetArtTimer();
    $("#article-setup").hidden = true;
    $("#article-area").hidden = false;
    $("#art-finish").hidden = true;
    $("#art-hint").checked = !!settings.hint;
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
    A.stats.itemsDone = 0;
    renderText();
    updateLive();
  }

  /* ---------- 渲染正文 ---------- */
  function cellHtml(c) {
    const doneCls = (c.done && !c.skip) ? " done" : "";
    const revealCls = c.revealed ? " reveal" : "";
    const errAttr = c.errs ? ` data-errs="${Math.min(c.errs, 4)}"` : "";
    return `<span class="ac${c.skip ? " skip" : ""}${doneCls}${revealCls}"${errAttr}><i class="py">${escapeHtml(c.py || "")}</i><b class="hz">${escapeHtml(c.ch)}</b></span>`;
  }

  function renderText() {
    const box = $("#art-text");
    if (!box) return;
    box.classList.toggle("nohint", !settings.hint);
    const items = A.session.flat;
    const html = A.session.groups.map(g => `<p class="apara">` + g.map(cellHtml).join("") + `</p>`).join("");
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
    positionArtText();
  }

  /* 固定两行窗口：把当前字所在行滚动到窗口中间，整段可滑动 */
  let scrollAnimId = 0;
  function smoothScrollTo(box, y) {
    const id = ++scrollAnimId;
    const start = box.scrollTop;
    const dist = y - start;
    if (Math.abs(dist) < 0.5) return;
    const dur = Math.min(260, Math.max(140, Math.abs(dist) * 0.45));
    let t0 = null;
    function step(now) {
      if (id !== scrollAnimId) return;
      if (t0 === null) t0 = now;
      const t = Math.min(1, (now - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      box.scrollTop = start + dist * eased;
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function positionArtText() {
    const box = $("#art-text");
    const c = A.session && A.session.flat ? A.session.flat[A.curIdx] : null;
    if (!box || !c || !c.el) return;
    const boxRect = box.getBoundingClientRect();
    const elRect = c.el.getBoundingClientRect();
    if (!boxRect.height) return;
    const cs = getComputedStyle(box);
    const padTop = parseFloat(cs.paddingTop) || 0;
    const padBottom = parseFloat(cs.paddingBottom) || 0;
    const contentCenter = padTop + (box.clientHeight - padTop - padBottom) / 2;
    const lineTop = elRect.top - boxRect.top + box.scrollTop; // 换算成内容坐标
    const lineH = elRect.height || (parseFloat(getComputedStyle(c.el).lineHeight) || 0);
    const targetY = lineTop + lineH / 2 - contentCenter;
    const maxY = Math.max(0, box.scrollHeight - box.clientHeight);
    const y = Math.min(Math.max(0, targetY), maxY);
    if (A.instantScroll) {
      box.scrollTop = y;          // 滑动窗口时直接定位，避免回溯/滚动动画
      A.instantScroll = false;
    } else {
      smoothScrollTo(box, y);
    }
  }

  function renderCurSlots() {
    const cur = A.session && A.session.flat ? A.session.flat[A.curIdx] : null;
    if (!cur || !cur.pyEl) return;
    if (!settings.hint) {
      if (cur.revealed) {
        cur.pyEl.textContent = cur.py || "";
        if (cur.el) cur.el.classList.add("reveal");
      } else {
        cur.pyEl.innerHTML = "";
        if (cur.el) cur.el.classList.remove("reveal");
      }
      return;
    }
    cur.pyEl.innerHTML = Array.from(cur.code || "").map((k, j) =>
      `<em class="${j < cur.typedLen ? "hit" : ""}">${escapeHtml(k)}</em>`
    ).join("") || "·";
  }

  function refreshHints() {
    const box = $("#art-text");
    if (box) box.classList.toggle("nohint", !settings.hint);
    if (!A.session) return;
    A.session.flat.forEach(c => {
      if (!c.pyEl) return;
      if (settings.hint) {
        c.pyEl.textContent = c.py || "";
        if (c.el) c.el.classList.remove("reveal");
      } else if (c.revealed) {
        c.pyEl.textContent = c.py || "";
        if (c.el) c.el.classList.add("reveal");
      } else {
        c.pyEl.textContent = "";
        if (c.el) c.el.classList.remove("reveal");
      }
    });
    renderCurSlots();
  }

  function revealHintFor(c) {
    if (!c) return;
    c.revealed = true;
    if (c.el) c.el.classList.add("reveal");
    if (c.pyEl) c.pyEl.textContent = c.py || "";
  }
  function clearReveal(c) {
    if (!c) return;
    c.revealed = false;
    if (c.el) c.el.classList.remove("reveal");
    if (c.pyEl) {
      if (settings.hint) c.pyEl.textContent = c.py || "";
      else c.pyEl.textContent = "";
    }
  }

  function flashErr() {
    const c = A.session && A.session.flat ? A.session.flat[A.curIdx] : null;
    if (!c || !c.el) return;
    c.errs = (c.errs || 0) + 1;
    c.wrongRun = (c.wrongRun || 0) + 1;
    c.el.dataset.errs = String(Math.min(c.errs, 4));
    c.el.classList.remove("err");
    void c.el.offsetWidth;
    c.el.classList.add("err");
    if (!settings.hint && c.wrongRun >= 3 && !c.revealed) revealHintFor(c);
  }

  /* ---------- 实时统计 / 进度 / 速度曲线 ---------- */
  function countDone(items) {
    return items.filter(c => !c.skip && c.done).length;
  }

  function updateLive() {
    if (!A.session) return;
    let total = A.total;
    let done = countDone(A.session.flat);
    if (A.goodMode) {
      // 好词好句：删除旧句后进度不回退，把已删除的已完成字数累计进来
      done = (A.goodDoneBase || 0) + done;
      total = (A.goodDoneBase || 0) + A.total;
    }
    const ks = A.stats.correct + A.stats.wrong;
    const acc = ks ? Math.round(A.stats.correct / ks * 100) : 100;
    const elapsed = artElapsed();
    const speed = Math.round(A.stats.itemsDone / Math.max(elapsed / 60000, 0.01));
    const accClass = acc >= 95 ? "ok" : (acc >= 85 ? "" : "bad");
    const segInfo = `<span class="chip">全文</span>`;
    const goodChip = A.goodMode && A.good ? `<span class="chip">💎 已练 <b>${A.good.total}</b> 句</span>` : "";
    $("#art-live").innerHTML = `
      ${goodChip}
      ${segInfo}
      <span class="chip">完成 <b>${done}</b>/${total}</span>
      <span class="chip">⏱ <b>${fmtTime(elapsed)}</b></span>
      <span class="chip">速度 <b>${speed}</b> 字/分</span>
      <span class="chip">准确率 <b class="${accClass}">${acc}%</b></span>
      <span class="chip">连击 <b>${A.stats.bestCombo}</b></span>`;
    $("#art-progress").style.width = (total ? done / total * 100 : 0) + "%";
  }

  function smoothSpeedPath(pts) {
    if (pts.length < 2) return "";
    let d = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += ` C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }
  function speedCubicSegments(pts) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[Math.min(i + 2, pts.length - 1)];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      out.push(`M ${p1[0].toFixed(1)},${p1[1].toFixed(1)} C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`);
    }
    return out;
  }
  function updateSpeedChart() {
    const el = $("#art-speed");
    if (!el) return;
    const data = A.speeds.slice(-60);
    if (!data.length) {
      el.innerHTML = `<div class="speed-empty">开始输入后，这里会显示每字速度曲线（越快越高）</div>`;
      return;
    }
    const flags = (A.speedWrong || []).slice(-60);
    const w = Math.max(el.clientWidth || 600, 100);
    const h = Math.max((el.clientHeight || 120) - 12, 60);
    const rawMax = Math.max.apply(null, data.concat([60]));
    const max = Math.min(rawMax, 200);
    let shape;
    if (data.length === 1) {
      const x = w / 2, y = h - Math.min(data[0] / max, 1) * (h - 4);
      const col = flags[0] ? "var(--bad)" : "var(--accent)";
      shape = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${col}"/>`;
    } else {
      const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - Math.min(v / max, 1) * (h - 4);
        return [x, y];
      });
      const line = smoothSpeedPath(pts);
      const area = `${line} L ${w.toFixed(1)},${h} L 0,${h} Z`;
      let strokes = "";
      const cubics = speedCubicSegments(pts);
      for (let i = 0; i < cubics.length; i++) {
        const col = flags[i] ? "var(--bad)" : "var(--accent)";
        strokes += `<path d="${cubics[i]}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      shape = `<path d="${area}" fill="var(--accent-soft)"/>${strokes}`;
    }
    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" class="speed-svg">${shape}</svg>`;
  }

  function recordSpeed(wrong) {
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
    A.speedWrong.push(!!wrong);
    if (A.speeds.length > 80) { A.speeds.shift(); A.speedWrong.shift(); }
    updateSpeedChart();
  }

  /* ---------- 击键 ---------- */
  function handleType(k) {
    const c = A.session.flat[A.curIdx];
    if (!c) return;
    if (k === c.code[c.typedLen]) {
      c.typedLen++;
      c.wrongRun = 0;
      A.stats.correct++;
      A.stats.combo++;
      if (A.stats.combo > A.stats.bestCombo) A.stats.bestCombo = A.stats.combo;
      soundCorrect();
      if (c.typedLen === c.code.length) {
        const hadErrs = c.errs > 0;
        c.done = true;
        c.errs = 0;
        c.wrongRun = 0;
        clearReveal(c);
        if (c.el) { c.el.classList.remove("err"); delete c.el.dataset.errs; }
        A.stats.itemsDone++;
        recordSpeed(hadErrs);
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
    if (A.goodMode) {
      let j = A.curIdx + 1;
      while (j < s.flat.length && s.flat[j].skip) j++;
      let batchDone = j >= s.flat.length;
      if (cur && (batchDone || s.flat[j].g > cur.g)) goodRecordSentence(cur.g);
      if (batchDone) {
        goodAppendFallbackSync(); // 若预加载未及时续上，先同步补齐，保证不断流
        j = A.curIdx + 1;
        while (j < s.flat.length && s.flat[j].skip) j++;
        batchDone = j >= s.flat.length;
      }
      if (batchDone || countDone(s.flat) >= A.total) {
        A.curIdx = -1;
        finish();
        return;
      }
      j = goodSlideWindow(j);     // 删除太旧的句子，窗口整体下移
      A.curIdx = j;
      setCur(j);                  // 保留平滑滚动动画，让下一句滑到居中位置
      saveProgress();
      updateLive();
      return;
    }
    let j = A.curIdx + 1;
    while (j < s.flat.length && s.flat[j].skip) j++;
    const batchDone = j >= s.flat.length;
    if (batchDone || countDone(s.flat) >= A.total) {
      A.curIdx = -1;
      finish();
      return;
    }
    A.curIdx = j;
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
      c.wrongRun = 0;
      clearReveal(c);
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
          clearReveal(c);
        }
        p.done = false; p.typedLen = 0; p.errs = 0; p.wrongRun = 0;
        if (p.el) p.el.classList.remove("done", "err");
        A.stats.itemsDone = Math.max(0, A.stats.itemsDone - 1);
        A.stats.combo = 0;
        if (A.speeds.length) { A.speeds.pop(); A.speedWrong.pop(); updateSpeedChart(); }
        A.curIdx = j;
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
    if (A.active && !A.finished) {
      goodFlushTime();
      saveProgress();
    }
    A.active = false; A.finished = false; A.started = false;
    A.goodMode = false;
    A.goodPrefetching = false;
    A.goodWinStart = 0;
    A.goodRemovedChars = 0;
    A.goodDoneBase = 0;
    pauseArtTimer();
    A.session = null;
    $("#article-area").hidden = true;
    $("#art-finish").hidden = true;
    $("#article-setup").hidden = false;
    renderList();
  }

  /* ---------- 进度与已练记录 ---------- */
  function saveProgress() {
    if (!A.session || A.finished) return;
    if (A.goodMode) {
      const g = goodLoad();
      g.progress = { pool: (g.pool || []).slice(), idx: A.goodRemovedChars + A.curIdx, ts: Date.now() };
      goodSave();
      return;
    }
    if (!A.articleId) return;
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

  /* ---------- 好词好句（联网无限练） ---------- */
  function goodLoad() {
    if (!A.good) A.good = lsGet(A_LS.good, { total: 0, timeMs: 0, days: {}, progress: null });
    A.good.days = A.good.days || {};
    return A.good;
  }
  function goodSave() {
    if (A.good) lsSet(A_LS.good, A.good);
  }
  function goodFlushTime() {
    if (A.goodMode && A.active && !A.finished) {
      goodLoad().timeMs += artElapsed();
    }
  }
  function goodRecordSentence(g) {
    goodLoad().total += 1;
    goodSave();
    const poolLen = A.good.pool ? A.good.pool.length : 0;
    if (poolLen && g >= poolLen - 4) goodPrefetch();
  }
  function fmtGoodTime(ms) {
    const totalMin = Math.floor((ms || 0) / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}小时${m}分` : `${m}分`;
  }
  function goodCardHtml() {
    const g = lsGet(A_LS.good, { total: 0, timeMs: 0, days: {} });
    const days = Object.keys(g.days || {}).length;
    const resume = g.progress && Array.isArray(g.progress.pool) && g.progress.pool.length ? " · 可续练" : "";
    return `<button class="art-card good" id="btn-art-good"><strong>💎 好词好句（联网无限练）${resume ? `<span class="badge">续练</span>` : ""}</strong><span class="meta">已练 ${g.total || 0} 句 · 时长 ${fmtGoodTime(g.timeMs || 0)} · 坚持 ${days} 天</span></button>`;
  }
  /* ---------- 好词好句滑动窗口维护 ---------- */
  function goodAppendSentences(list, extendPool) {
    const s = A.session;
    const box = $("#art-text");
    if (!s || !box || !A.goodMode || !list || !list.length) return 0;
    const texts = list.map(x => (typeof x === "string" ? x : x.t));
    const groups = tokenizeParagraphs(texts);
    if (!groups.length) return 0;
    const startG = A.goodWinStart + s.groups.length;
    const oldLen = s.flat.length;
    let newNonSkip = 0;
    const html = groups.map((g, gi) => {
      g.forEach(c => { c.g = startG + gi; if (!c.skip) newNonSkip++; });
      return `<p class="apara">` + g.map(cellHtml).join("") + `</p>`;
    }).join("");
    box.insertAdjacentHTML("beforeend", html);
    const acs = box.querySelectorAll(".ac");
    const flatAdd = [].concat(...groups);
    flatAdd.forEach((c, k) => {
      s.flat.push(c);
      const el = acs[oldLen + k];
      if (el) { c.el = el; c.pyEl = el.querySelector(".py"); }
    });
    groups.forEach(g => s.groups.push(g));
    A.total += newNonSkip;
    if (extendPool !== false) A.good.pool = A.good.pool.concat(texts);
    updateLive();
    return texts.length;
  }

  function goodRemoveOldBefore(newG) {
    const s = A.session;
    const box = $("#art-text");
    if (!s || !box) return 0;
    const keepG = newG - 2; // 保留当前句及前两句，删除更早的句子
    const paras = box.querySelectorAll(".apara");
    let removeCount = 0;
    for (let i = 0; i < s.groups.length; i++) {
      const first = s.groups[i][0];
      if (first && first.g < keepG) removeCount++;
      else break;
    }
    if (removeCount <= 0) return 0;
    let removedChars = 0, removedDone = 0;
    for (let i = 0; i < removeCount; i++) {
      const g = s.groups[i];
      removedChars += g.length;
      removedDone += g.filter(c => !c.skip && c.done).length;
      if (paras[i]) paras[i].remove();
    }
    s.flat.splice(0, removedChars);
    s.groups.splice(0, removeCount);
    A.goodWinStart += removeCount;
    A.goodRemovedChars += removedChars;
    A.goodDoneBase += removedDone;
    A.total = Math.max(0, A.total - removedDone);
    A.sessionStartIdx = Math.max(0, A.sessionStartIdx - removedChars);
    return removedChars;
  }

  function goodSlideWindow(j) {
    const s = A.session;
    if (!s || !A.goodMode) return j;
    const c = s.flat[j];
    if (!c) return j;
    return j - goodRemoveOldBefore(c.g);
  }

  function goodAppendFallbackSync() {
    const s = A.session;
    if (!s || !A.goodMode) return false;
    const windowEnd = A.goodWinStart + s.groups.length;
    if (A.good.pool.length > windowEnd) {
      goodAppendSentences(A.good.pool.slice(windowEnd), false);
      updateLive();
      return true;
    }
    const fb = shuffle((window.SP_ARTICLES || {}).sentences || []).slice(0, 10);
    if (fb.length) {
      goodAppendSentences(fb);
      goodSave();
      return true;
    }
    return false;
  }

  async function goodPrefetch() {
    if (A.goodPrefetching || !A.goodMode || !A.good.pool) return;
    A.goodPrefetching = true;
    const gen = A.goodBatchGen;
    const startLen = A.good.pool.length;
    let list = [];
    try { list = await fetchSentences(10); } catch (e) { console.warn("[好词好句] 预加载失败", e); }
    if (A.goodMode && gen === A.goodBatchGen && A.good.pool.length === startLen && list.length >= 3) {
      goodAppendSentences(list);
      goodSave();
    }
    A.goodPrefetching = false;
  }
  async function goodNextBatch() {
    if (A.goodLoading || !A.goodMode) return;
    A.goodLoading = true;
    A.goodBatchGen = (A.goodBatchGen || 0) + 1; // 作废仍在途的预加载
    A.curIdx = -1;
    $("#art-live").innerHTML = `<span class="chip">💎 已练 <b>${goodLoad().total}</b> 句</span><span class="chip">正在加载下一批…</span>`;
    goodFlushTime();
    let list = [];
    try { list = await fetchSentences(10); } catch (e) { console.warn("[好词好句] 联网获取失败", e); }
    if (!A.goodMode) { A.goodLoading = false; return; } // 加载期间用户已退出
    if (list.length < 3) {
      const fb = shuffle((window.SP_ARTICLES || {}).sentences || []).slice(0, 10);
      list = fb.map(s => (typeof s === "string" ? { t: s } : s));
    }
    if (!list.length) {
      A.goodLoading = false;
      toast("暂时没有可用句子，请稍后再试");
      updateLive();
      return;
    }
    A.good.pool = list.map(s => (typeof s === "string" ? s : s.t));
    A.good.progress = null;
    A.goodWinStart = 0;
    A.goodRemovedChars = 0;
    A.goodDoneBase = 0;
    A.lastSource = { title: "好词好句", byline: "一言 hitokoto · 无限续练", paragraphs: A.good.pool };
    A.articleId = null; A.lastSourceId = null;
    buildSession(A.lastSource.title, A.lastSource.byline, A.lastSource.paragraphs);
    goodSave();
    A.goodLoading = false;
  }
  function startGood() {
    if (A.busy || A.goodLoading) return;
    goodLoad();
    A.good.days[todayStr()] = 1;
    goodSave();
    A.goodMode = true;
    A.goodPrefetching = false;
    A.goodWinStart = 0;
    A.goodRemovedChars = 0;
    A.goodDoneBase = 0;
    A.articleId = null; A.lastSourceId = null;
    const saved = A.good.progress;
    if (saved && Array.isArray(saved.pool) && saved.pool.length && typeof saved.idx === "number") {
      A.goodBatchGen = (A.goodBatchGen || 0) + 1;
      A.good.pool = saved.pool;
      A.lastSource = { title: "好词好句", byline: "一言 hitokoto · 续练", paragraphs: A.good.pool };
      if (buildSession(A.lastSource.title, A.lastSource.byline, A.lastSource.paragraphs)) {
        applyResume(saved.idx);
        // 续练时也先删除过旧的句子，避免框里堆太多
        const j = goodSlideWindow(A.curIdx);
        A.curIdx = j;
        setCur(j);
        updateLive();
        const c = A.session && A.session.flat ? A.session.flat[A.curIdx] : null;
        if (c && c.g >= (A.good.pool.length - 4)) goodPrefetch();
      }
      return;
    }
    goodNextBatch();
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
      <div class="art-sec">💎 好词好句 · 联网无限练</div>
      <div class="art-grid">${goodCardHtml()}</div>
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
    goodFlushTime();
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
    const fontEl = $("#art-font");
    if (fontEl) fontEl.value = settings.articleFont || "system";
    const boldEl = $("#art-bold");
    if (boldEl) boldEl.checked = !!settings.articleBold;
    if (typeof applyArticleFont === "function") applyArticleFont();
    if (A.session) { refreshHints(); positionArtText(); }
  }

  /* ---------- 初始化 ---------- */
  $("#article-list").addEventListener("click", e => {
    const card = e.target.closest(".art-card");
    if (!card || card.disabled) return;
    if (card.id === "btn-art-good") { startGood(); return; }
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
  $("#art-font").addEventListener("change", e => {
    settings.articleFont = e.target.value;
    lsSet(LS_KEYS.settings, settings);
    if (typeof applyArticleFont === "function") applyArticleFont();
    if (A.session) positionArtText();
  });
  $("#art-bold").addEventListener("change", e => {
    settings.articleBold = e.target.checked;
    lsSet(LS_KEYS.settings, settings);
    if (typeof applyArticleFont === "function") applyArticleFont();
    if (A.session) positionArtText();
  });

  window.addEventListener("beforeunload", () => {
    if (A.goodMode && A.active && !A.finished) {
      goodFlushTime();
      goodSave();
    }
  });
  window.addEventListener("resize", () => {
    if (A.active && !A.finished) positionArtText();
  });

  window.ArticlePractice = { onView, onKey, onEscape, onSchemeChange, onSettings, renderList };
  // 若启动时恢复的是文章视图，补一次 onView 以渲染列表/自动开文；
  // 其它视图由 app.js 的 setView 完成初始化，这里不再强制切到文章。
  if (typeof currentView !== "undefined" && currentView === "article") onView("article");
})();
