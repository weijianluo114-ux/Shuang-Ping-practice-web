"use strict";
/* ================= 双拼方案数据 ================= */
const SCHEMES = [
  {
    id: "xiaohe", name: "小鹤双拼", engName: "Flypy", color: "#58CC02",
    zeroInitialRule: "double_pinyin",
    ruleText: "零声母：a / o / e 双写；ai、an、er 等两字母韵母按全拼键入；ang、eng、ing、ong 等取首字母 + 韵母键位。",
    initials: { zh: "v", ch: "i", sh: "u" },
    finals: {
      iu: "q", ei: "w", uan: "r", er: "r", ue: "t", ve: "t", un: "y", uo: "o", ie: "p",
      iang: "l", uang: "l", ang: "h", eng: "g", an: "j", en: "f", ai: "d", ao: "c", ou: "z",
      ia: "x", ua: "x", ian: "m", iao: "n", ing: "k", uai: "k", ong: "s", iong: "s", in: "b",
      ui: "v", "ü": "v", v: "v", "üan": "r", van: "r", "ün": "y", vn: "y", "üe": "t"
    },
    displayMap: {
      q: "iu", w: "ei", e: "e", r: "uan/er", t: "ue/üe", y: "un/ün", u: "sh/u", i: "ch/i",
      o: "uo/o", p: "ie", a: "a", s: "ong/iong", d: "ai", f: "en", g: "eng", h: "ang", j: "an",
      k: "ing/uai", l: "iang/uang", z: "ou", x: "ua/ia", c: "ao", v: "zh/ui/ü", b: "in", n: "iao", m: "ian"
    },
    desc: "小鹤双拼把高频韵母放在手指最舒服的位置，左右手负担均衡，是当下最受欢迎的方案之一。",
    features: ["左右手负担均衡", "高频音节手感好", "可扩展鹤形辅助码"]
  },
  {
    id: "ziranma", name: "自然码", engName: "Ziranma", color: "#1CB0F6",
    zeroInitialRule: "double_pinyin",
    ruleText: "零声母：a / o / e 双写；ai、an、er 等两字母韵母按全拼键入；ang、eng、ing、ong 等取首字母 + 韵母键位。",
    initials: { zh: "v", ch: "i", sh: "u" },
    finals: {
      iu: "q", ia: "w", ua: "w", e: "e", uan: "r", "üan": "r", van: "r", er: "r", ue: "t", ve: "t", "üe": "t",
      uai: "y", ing: "y", uo: "o", un: "p", "ün": "p", vn: "p", iong: "s", ong: "s", iang: "d", uang: "d",
      ai: "l", en: "f", eng: "g", ang: "h", an: "j", ao: "k", ei: "z", ie: "x", iao: "c", ui: "v",
      "ü": "v", v: "v", ou: "b", in: "n", ian: "m"
    },
    displayMap: {
      q: "iu", w: "ia/ua", e: "e", r: "uan/üan/er", t: "ue/üe", y: "ing/uai", u: "sh/u", i: "ch/i",
      o: "uo/o", p: "un/ün", a: "a", s: "ong/iong", d: "iang/uang", f: "en", g: "eng", h: "ang", j: "an",
      k: "ao", l: "ai", z: "ei", x: "ie", c: "iao", v: "zh/ui/ü", b: "ou", n: "in", m: "ian"
    },
    desc: "自然码是最老牌的双拼方案之一，各大系统原生内置，入门资料丰富。",
    features: ["系统原生内置", "上手资料多", "键位分布传统"]
  }
,
  {
    id: "abc", name: "智能 ABC", engName: "ABC", color: "#FF8C42",
    zeroInitialRule: "o_prefix",
    ruleText: "零声母：先敲 o，再敲韵母所在键位。例如：安 an → oj（an 在 j 键），啊 a → oa。",
    initials: { zh: "a", ch: "e", sh: "v" },
    finals: {
      ei: "q", ian: "w", er: "r", iu: "r", iang: "t", uang: "t", ing: "y", uo: "o", uan: "p", "üan": "p", van: "p",
      ong: "s", iong: "s", ia: "d", ua: "d", en: "f", eng: "g", ang: "h", an: "j", iao: "z", ao: "k", in: "c",
      uai: "c", ai: "l", ie: "x", ou: "b", un: "n", "ün": "n", vn: "n", ue: "m", "üe": "m", ve: "m", ui: "m",
      "ü": "v", v: "v"
    },
    displayMap: {
      q: "ei", w: "ian", e: "ch/e", r: "er/iu", t: "iang/uang", y: "ing", u: "u", i: "i", o: "uo/o",
      p: "uan/üan", a: "zh/a", s: "ong/iong", d: "ia/ua", f: "en", g: "eng", h: "ang", j: "an", k: "ao",
      l: "ai", z: "iao", x: "ie", c: "in/uai", v: "sh/ü", b: "ou", n: "un/ün", m: "ui/ue/üe"
    },
    desc: "智能 ABC 双拼是早期 Windows 用户最熟悉的方案，零声母统一用 o 前缀。",
    features: ["老 Windows 用户亲切", "零声母规则统一", "跨平台兼容"]
  },
  {
    id: "microsoft", name: "微软双拼", engName: "Microsoft", color: "#7C6CFF",
    zeroInitialRule: "o_prefix",
    ruleText: "零声母：先敲 o，再敲韵母所在键位（单字母韵母敲 o + 字母本身）。例如：安 an → oj，啊 a → oa。",
    initials: { zh: "v", ch: "i", sh: "u" },
    finals: {
      iu: "q", ia: "w", ua: "w", er: "r", uan: "r", "üan": "r", van: "r", ue: "t", "üe": "t", ve: "t",
      "ü": "y", v: "y", uai: "y", uo: "o", un: "p", "ün": "p", vn: "p", in: "n", ong: "s", iong: "s",
      iang: "d", uang: "d", en: "f", eng: "g", ang: "h", an: "j", ao: "k", ai: "l", ei: "z", ie: "x",
      iao: "c", ui: "v", ou: "b", ian: "m", ing: ";"
    },
    displayMap: {
      q: "iu", w: "ia/ua", e: "e", r: "uan/üan/er", t: "ue/üe", y: "uai/ü", u: "sh/u", i: "ch/i",
      o: "uo/o", p: "un/ün", a: "a", s: "ong/iong", d: "iang/uang", f: "en", g: "eng", h: "ang", j: "an",
      k: "ao", l: "ai", z: "ei", x: "ie", c: "iao", v: "zh/ui", b: "ou", n: "in", m: "ian", ";": "ing"
    },
    desc: "微软双拼沿袭微软拼音习惯，最大的特点是 ing 放在分号键上。",
    features: ["微软拼音同款", "分号键承载 ing", "系统原生支持"]
  }
];
/* ================= 拼音与词句数据 ================= */
const PINYIN_INITIALS = ["zh", "ch", "sh", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "r", "z", "c", "s", "y", "w"];
const DRILL_INITIALS = ["b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "zh", "ch", "sh", "r", "z", "c", "s", "y", "w"];
const ZERO_FINALS = ["a", "o", "e", "ai", "ei", "ao", "ou", "an", "en", "ang", "eng", "er"];

const SYLLABLE_TEXT = `
a o e ai ei ao ou an en ang eng er
ba pa ma fa da ta na la ga ka ha
bo po mo fo
me de te ne le ge ke he zhe che she re ze ce se
bi pi mi di ti ni li ji qi xi
bu pu mu fu du tu nu lu gu ku hu zhu chu shu ru zu cu su
bai pai mai dai tai nai lai gai kai hai zhai chai shai zai cai sai wai
bei pei mei fei nei lei gei hei zhei shei wei
bao pao mao dao tao nao lao gao kao hao zhao chao shao rao zao cao sao yao
pou mou fou dou tou nou lou gou kou hou zhou chou shou rou zou cou sou you
ban pan man fan dan tan nan lan gan kan han zhan chan shan ran zan can san wan
ben pen men fen nen gen ken hen zhen chen shen ren zen cen sen wen
bang pang mang fang dang tang nang lang gang kang hang zhang chang shang rang zang cang sang wang
beng peng meng feng deng teng neng leng geng keng heng zheng cheng sheng reng zeng ceng seng weng
bian pian mian dian tian nian lian jian qian xian
biao piao miao diao tiao niao liao jiao qiao xiao
bie pie mie die tie nie lie jie qie xie
bin pin min nin lin jin qin xin
bing ping ming ding ting ning ling jing qing xing
miu diu liu niu jiu qiu xiu
dui tui gui kui hui zhui chui shui rui zui cui sui
duan tuan nuan luan guan kuan huan zhuan chuan shuan ruan zuan cuan suan
dun tun lun gun kun hun zhun chun shun run zun cun sun
dong tong nong long gong kong hong zhong chong rong zong cong song
duo tuo nuo luo guo kuo huo zhuo chuo shuo ruo zuo cuo suo
lü nü lüe nüe
jue que xue juan quan xuan jun qun xun
ya ye yao you yan yin yang ying yong yu yue yuan yun
wa wo wu wai wei wan wen wang weng
`;
const SYLLABLES = SYLLABLE_TEXT.trim().split(/\s+/);
/* 词行格式：汉字词 + 空格分隔的逐字拼音 */
const WORD_LINES = [
  "你好 ni hao",
  "世界 shi jie",
  "双拼 shuang pin",
  "练习 lian xi",
  "输入 shu ru",
  "键盘 jian pan",
  "电脑 dian nao",
  "时间 shi jian",
  "学习 xue xi",
  "工作 gong zuo",
  "生活 sheng huo",
  "朋友 peng you",
  "老师 lao shi",
  "同学 tong xue",
  "今天 jin tian",
  "明天 ming tian",
  "昨天 zuo tian",
  "现在 xian zai",
  "喜欢 xi huan",
  "快乐 kuai le",
  "健康 jian kang",
  "运动 yun dong",
  "音乐 yin yue",
  "电影 dian ying",
  "阅读 yue du",
  "写作 xie zuo",
  "思考 si kao",
  "记忆 ji yi",
  "方法 fang fa",
  "简单 jian dan",
  "困难 kun nan",
  "容易 rong yi",
  "正确 zheng que",
  "错误 cuo wu",
  "速度 su du",
  "准确 zhun que",
  "节奏 jie zou",
  "习惯 xi guan",
  "坚持 jian chi",
  "加油 jia you",
  "进步 jin bu",
  "熟练 shu lian",
  "拼音 pin yin",
  "声母 sheng mu",
  "韵母 yun mu",
  "字母 zi mu",
  "输入法 shu ru fa",
  "网络 wang luo",
  "浏览器 liu lan qi",
  "文档 wen dang",
  "文件 wen jian",
  "保存 bao cun",
  "打开 da kai",
  "关闭 guan bi",
  "开始 kai shi",
  "结束 jie shu",
  "完成 wan cheng",
  "继续 ji xu",
  "重复 chong fu",
  "训练 xun lian",
  "提升 ti sheng",
  "目标 mu biao",
  "结果 jie guo",
  "努力 nu li",
  "优秀 you xiu",
  "自然 zi ran",
  "智能 zhi neng",
  "微软 wei ruan"
];
/* 句子行格式：整句 + 空格分隔的逐字拼音（标点自动跳过） */
const SENTENCE_LINES = [
  "我们开始练习双拼输入。 wo men kai shi lian xi shuang pin shu ru",
  "每天花十分钟练习，键位会越来越熟。 mei tian hua shi fen zhong lian xi jian wei hui yue lai yue shou",
  "先记声母，再记韵母，最后练句子。 xian ji sheng mu zai ji yun mu zui hou lian ju zi",
  "不要急于求成，准确比速度更重要。 bu yao ji yu qiu cheng zhun que bi su du geng zhong yao",
  "双拼的一个字，只需要敲两下键盘。 shuang pin de yi ge zi zhi xu yao qiao liang xia jian pan",
  "把容易出错的键位，拿出来多练几遍。 ba rong yi chu cuo de jian wei na chu lai duo lian ji bian",
  "手指的肌肉记忆，来自每天的重复。 shou zhi de ji rou ji yi lai zi mei tian de chong fu",
  "遇到生疏音节时，放慢速度想清楚再敲。 yu dao sheng shu yin jie shi fang man su du xiang qing chu zai qiao",
  "保持手腕放松，让每一次击键都自然发生。 bao chi shou wan fang song rang mei yi ci ji jian dou zi ran fa sheng",
  "练完这一轮，记得看看错键分布。 lian wan zhe yi lun ji de kan kan cuo jian fen bu",
  "每套方案，都有自己的键位安排。 mei tao fang an dou you zi ji de jian wei an pai",
  "输入法切换好之后，就可以开始练习了。 shu ru fa qie huan hao zhi hou jiu ke yi kai shi lian xi le",
  "坚持两周，你会明显感觉到提速。 jian chi liang zhou ni hui ming xian gan jue dao ti su",
  "熟能生巧，双拼会成为你的本能。 shu neng sheng qiao shuang pin hui cheng wei ni de ben neng",
  "加油，你离顺畅的打字体验越来越近。 jia you ni li shun chang de da zi ti yan yue lai yue jin"
];

function lineToRecord(line) {
  const parts = line.trim().split(/\s+/);
  return { text: parts[0], py: parts.slice(1) };
}
const WORDS = WORD_LINES.map(lineToRecord);
const SENTENCES = SENTENCE_LINES.map(lineToRecord);
/* ================= 状态与存储 ================= */
const LS_KEYS = { scheme: "sp_scheme_v1", settings: "sp_settings_v1", stats: "sp_stats_v1", custom: "sp_custom_v1", view: "sp_view_v1" };

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    return (parsed === null || parsed === undefined) ? fallback : parsed;
  } catch (e) { return fallback; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
}

let schemeId = lsGet(LS_KEYS.scheme, "xiaohe");
let currentScheme = SCHEMES.find(s => s.id === schemeId) || SCHEMES[0];
let settings = Object.assign({ hint: true, sound: true, theme: "auto", fontSize: "large", articleFont: "system", articleBold: false }, lsGet(LS_KEYS.settings, {}));
let currentView = "keyboard";

/* 练习引擎 */
let roundItems = [], roundIdx = 0, roundTyped = "", roundStats = null;
let roundActive = false, finished = false, startedOnce = false, flashWrongItem = false;
let practiceMode = "syll";
let timerBase = 0, timerStart = null, timerInterval = null;

/* 键位记忆 */
let drill = { kind: "initial", items: [], idx: 0, typed: "", correct: 0, wrong: 0, wrongKeys: {}, total: 0, active: false, finished: false, lock: false };

/* ================= 工具函数 ================= */
function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.from(document.querySelectorAll(sel)); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function pick(arr, n) { return shuffle(arr).slice(0, Math.min(n, arr.length)); }

function parseSyllable(py) {
  const p = String(py).trim().toLowerCase();
  for (const ini of PINYIN_INITIALS) {
    if (p.startsWith(ini)) return { initial: ini, final: p.slice(ini.length) };
  }
  return { initial: "", final: p };
}
function normalizeFinal(initial, final) {
  const jqx = new Set(["j", "q", "x", "y"]);
  if (initial && jqx.has(initial)) return final.replace(/^[üv]/, "u");
  return final;
}
function toCode(initial, rawFinal, scheme) {
  const f = normalizeFinal(initial, rawFinal);
  if (!f) return null;
  let s, c;
  if (initial) {
    s = (scheme.initials && scheme.initials[initial]) || initial;
    c = (scheme.finals && scheme.finals[f]) || f[0];
  } else if (scheme.zeroInitialRule === "o_prefix") {
    s = "o";
    c = (scheme.finals && scheme.finals[f]) || f[0];
  } else {
    s = f[0];
    c = f.length === 2 ? f[1] : ((scheme.finals && scheme.finals[f]) || f[0]);
  }
  return (s && c) ? s + c : null;
}
function codeFor(py) {
  const { initial, final } = parseSyllable(py);
  return toCode(initial, final, currentScheme);
}
function isPunct(ch) {
  return /[\u3000-\u303F\uFF00-\uFFEF，。！？、；：""''（）《》【】—…·,.!?;:'"()\-]/.test(ch);
}
function buildSentenceItems(sentence) {
  const tokens = sentence.py.slice();
  const chars = Array.from(sentence.text);
  const items = [];
  let ti = 0;
  for (const ch of chars) {
    if (isPunct(ch)) {
      if (items.length) items[items.length - 1].suffix = (items[items.length - 1].suffix || "") + ch;
      continue;
    }
    const py = tokens[ti++];
    if (!py) break;
    items.push({ han: ch, py: py, code: codeFor(py), suffix: "", wordStart: false });
  }
  return items;
}

function fmtTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60), s = totalSec % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}
function todayStr() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
/* ================= 音效 ================= */
let audioCtx = null;
function beep(freq, dur, type, vol) {
  if (!settings.sound) return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + dur + 0.05);
  } catch (e) { /* ignore */ }
}
const soundCorrect = () => beep(880, 0.06, "sine");
const soundWrong = () => beep(180, 0.12, "square");
function soundDone() {
  beep(660, 0.08, "sine"); setTimeout(() => beep(880, 0.08, "sine"), 90); setTimeout(() => beep(1100, 0.12, "sine"), 190);
}

/* ================= 视图切换 ================= */
function setView(name) {
  currentView = name;
  lsSet(LS_KEYS.view, name);
  $$(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === name));
  $$(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + name));
  handleTimerOnViewChange();
  if (name !== "practice") $("#finish-overlay").hidden = true;
  if (name === "drills" && !drill.active && !drill.finished) startDrill(drill.kind);
  if (name === "stats") renderStats();
  if (name === "keyboard") renderKeyboard();
  if (window.ArticlePractice) ArticlePractice.onView(name);
}
function handleTimerOnViewChange() {
  if (currentView !== "practice" && timerStart !== null && roundActive && !finished) pauseTimer();
  if (currentView === "practice" && roundActive && !finished && startedOnce && timerStart === null) resumeTimer();
}

/* ================= 定时器 ================= */
function getElapsed() {
  return timerBase + (timerStart ? Date.now() - timerStart : 0);
}
function startTimer() {
  if (timerStart === null) {
    timerStart = Date.now();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (currentView === "practice" && roundActive && !finished) renderLiveStats();
    }, 250);
  }
}
function pauseTimer() {
  if (timerStart !== null) { timerBase += Date.now() - timerStart; timerStart = null; }
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}
function resumeTimer() {
  if (timerStart === null) {
    timerStart = Date.now();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (currentView === "practice" && roundActive && !finished) renderLiveStats();
    }, 250);
  }
}
function resetTimer() {
  pauseTimer();
  timerBase = 0; timerStart = null;
}
/* ================= 方案切换与键盘图 ================= */
function renderSchemePicker() {
  const box = $("#scheme-picker");
  box.innerHTML = SCHEMES.map(s =>
    `<button class="scheme-btn${s.id === currentScheme.id ? " active" : ""}" data-scheme="${s.id}" style="${s.id === currentScheme.id ? "background:" + s.color + ";border-color:" + s.color : "color:" + s.color}">${s.name}</button>`
  ).join("");
}
function applySchemeColor() {
  document.documentElement.style.setProperty("--accent", currentScheme.color);
  document.documentElement.style.setProperty("--accent-soft", currentScheme.color + "22");
}
function renderSchemeHero() {
  const hero = $("#scheme-hero");
  hero.innerHTML = `
    <span class="dot" style="background:${currentScheme.color}"></span>
    <div>
      <h2>${currentScheme.name} <span class="eng">${currentScheme.engName}</span></h2>
      <p class="desc">${escapeHtml(currentScheme.desc)}</p>
      <div class="feats">${currentScheme.features.map(f => `<span>${escapeHtml(f)}</span>`).join("")}</div>
    </div>`;
}
function renderSchemeRule() {
  const iniText = Object.keys(currentScheme.initials).map(k => `${k} → ${currentScheme.initials[k]}`).join("、");
  $("#scheme-rule").innerHTML = `
    <h3>零声母规则 · ${currentScheme.name}</h3>
    <p>${escapeHtml(currentScheme.ruleText)}</p>
    <h3>使用说明</h3>
    <p>1. 先把电脑或手机的输入法切换到「${currentScheme.name}」；</p>
    <p>2. 练习时保持<b>英文输入</b>状态，按音节敲击对应的两个键；</p>
    <p>3. 本方案声母键位：${escapeHtml(iniText)}；</p>
    <p>4. 每个字两键：<code>声母键 + 韵母键</code>，节奏稳定比快更重要。</p>`;
}
function renderKeyboard() {
  renderSchemeHero();
  renderSchemeRule();
  const rows = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
    ["z", "x", "c", "v", "b", "n", "m"]
  ];
  const box = $("#keyboard");
  box.innerHTML = rows.map(row => {
    return `<div class="kb-row">` + row.map(k => {
      const disp = currentScheme.displayMap[k];
      const labelHtml = disp ? disp.split("/").map(l => {
        const isIni = ["zh", "ch", "sh"].includes(l);
        return isIni ? `<span class="ini">${l}</span>` : `${l}`;
      }).join("/") : "";
      const special = k === ";" ? " special" : "";
      return `<button class="key${special}" data-key="${k}"><span class="letter">${k.toUpperCase()}</span><span class="lab">${labelHtml}</span></button>`;
    }).join("") + `</div>`;
  }).join("");
  bindKeyClicks();
}
function bindKeyClicks() {
  $$(".key").forEach(el => {
    el.addEventListener("click", () => showKeyDetail(el.dataset.key));
  });
}
function showKeyDetail(key) {
  const disp = currentScheme.displayMap[key] || key;
  const labels = disp.split("/").map(l => {
    const isIni = ["zh", "ch", "sh"].includes(l);
    return `<b>${escapeHtml(l)}</b>（${isIni ? "声母" : "韵母"}）`;
  }).join("、");
  $("#key-detail").innerHTML = `键 <b>${key.toUpperCase()}</b>：${labels}。<span>该键在键盘图上会被高亮显示。</span>`;
}
function flashKey(key) {
  const el = document.querySelector(`.key[data-key="${key.toLowerCase()}"]`);
  if (!el) return;
  el.classList.add("pressed");
  setTimeout(() => el.classList.remove("pressed"), 180);
}
function renderArtKeyboard() {
  const box = $("#art-keyboard");
  if (!box) return;
  const rows = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
    ["z", "x", "c", "v", "b", "n", "m"]
  ];
  box.innerHTML = rows.map(row => {
    return `<div class="kb-row">` + row.map(k => {
      const disp = currentScheme.displayMap[k];
      const labelHtml = disp ? disp.split("/").map(l => {
        const isIni = ["zh", "ch", "sh"].includes(l);
        return isIni ? `<span class="ini">${l}</span>` : `${l}`;
      }).join("/") : "";
      const special = k === ";" ? " special" : "";
      return `<button class="key${special}" data-key="${k}"><span class="letter">${k.toUpperCase()}</span><span class="lab">${labelHtml}</span></button>`;
    }).join("") + `</div>`;
  }).join("");
  bindArtKeyClicks();
}
function bindArtKeyClicks() {
  $$("#art-keyboard .key").forEach(el => el.addEventListener("click", () => showKeyDetail(el.dataset.key)));
}
function flashArtKey(key) {
  const el = document.querySelector(`#art-keyboard .key[data-key="${key.toLowerCase()}"]`);
  if (!el) return;
  el.classList.add("pressed");
  setTimeout(() => el.classList.remove("pressed"), 180);
}

/* ================= 键位记忆 ================= */
function startDrill(kind) {
  const scheme = currentScheme;
  let items = [];
  if (kind === "initial") {
    items = DRILL_INITIALS.map(ini => ({ label: ini, sub: "声母", code: (scheme.initials && scheme.initials[ini]) || ini }));
  } else if (kind === "final") {
    const skip = new Set(["v", "van", "vn", "ve"]);
    for (const [f, k] of Object.entries(scheme.finals)) {
      if (skip.has(f)) continue;
      items.push({ label: f, sub: "韵母", code: k });
    }
    items = shuffle(items);
  } else {
    items = shuffle(ZERO_FINALS.map(py => ({ label: py, sub: "零声母", code: codeFor(py) })));
  }
  drill = { kind, items, idx: 0, typed: "", correct: 0, wrong: 0, wrongKeys: {}, total: items.length, active: true, finished: false, lock: false };
  renderDrill();
}
function renderDrill(wrongKey) {
  const d = drill;
  const item = d.items[d.idx] || null;
  const doneCount = d.idx + (d.finished ? 1 : 0);
  const total = d.total;
  $("#drill-progress-text").textContent = `${Math.min(doneCount, total)} / ${total}`;
  $("#drill-bar").style.width = (total ? (doneCount / total) * 100 : 0) + "%";
  $("#drill-kind").textContent = item ? item.sub : "完成";
  $("#drill-target-label").textContent = item ? item.label : "✓";
  const fb = $("#drill-feedback");
  if (!item) {
    fb.className = "drill-feedback good";
    const worst = Object.keys(d.wrongKeys).sort((a, b) => d.wrongKeys[b] - d.wrongKeys[a]).slice(0, 5).join("、");
    fb.textContent = `全部完成！共 ${total} 题，错 ${d.wrong} 次` + (worst ? `，易错键：${worst}` : "，零失误！");
  } else if (wrongKey) {
    fb.className = "drill-feedback bad";
    fb.textContent = `按错了，正确键位是 ${item.code.toUpperCase()}`;
  } else {
    fb.className = "drill-feedback";
    fb.textContent = d.typed ? "继续击键…" : `请按「${item.label}」对应的键位`;
  }
  const slots = $("#drill-code-slots");
  slots.innerHTML = item ? item.code.split("").map((ch, i) => {
    let cls = "s";
    if (i < d.typed.length) cls += " ok";
    else if (settings.hint) cls += " hint";
    const shown = i < d.typed.length ? ch : (settings.hint ? ch : "");
    return `<b class="${cls}">${escapeHtml(shown)}</b>`;
  }).join("") : "";
}
function handleDrillKey(k) {
  if (!drill.active || drill.finished) return;
  k = k.toLowerCase();
  if (k === "backspace") { drill.typed = ""; renderDrill(); return; }
  if (!/^[a-z;]$/.test(k) || drill.lock) return;
  const item = drill.items[drill.idx];
  if (!item) return;
  const expected = item.code[drill.typed.length];
  if (k === expected) {
    drill.typed += k;
    drill.correct++;
    if (drill.typed.length === item.code.length) {
      soundCorrect();
      drill.lock = true;
      renderDrill();
      setTimeout(() => {
        drill.idx++;
        drill.typed = "";
        drill.lock = false;
        if (drill.idx >= drill.items.length) drill.finished = true;
        renderDrill();
      }, 170);
    } else {
      renderDrill();
    }
  } else {
    drill.wrong++;
    drill.wrongKeys[k] = (drill.wrongKeys[k] || 0) + 1;
    soundWrong();
    renderDrill(k);
  }
}
/* ================= 综合练习 ================= */
function switchPracticeMode(mode) {
  practiceMode = mode;
  $$("#practice-modes button").forEach(b => b.classList.toggle("active", b.dataset.mode === mode));
  $("#setup-row-syll").hidden = !(mode === "syll" || mode === "word" || mode === "sentence");
  $("#round-size").closest("label").hidden = mode !== "syll";
  $("#word-size").closest("label").hidden = mode !== "word";
  $("#setup-row-custom").hidden = mode !== "custom";
}
function startPracticeRound(items) {
  roundItems = items;
  roundIdx = 0; roundTyped = "";
  roundActive = true; finished = false; startedOnce = false; flashWrongItem = false;
  resetTimer();
  roundStats = { correct: 0, wrong: 0, itemsDone: 0, bestCombo: 0, combo: 0, wrongKeys: {}, total: items.length };
  $("#practice-setup").hidden = true;
  $("#practice-area").hidden = false;
  $("#finish-overlay").hidden = true;
  renderPractice();
}
function newPracticeRound() {
  let items = [];
  if (practiceMode === "syll") {
    const n = parseInt($("#round-size").value, 10) || 30;
    items = pick(SYLLABLES, n).map(py => ({ han: "", py: py, code: codeFor(py), suffix: "", wordStart: false }));
  } else if (practiceMode === "word") {
    const n = parseInt($("#word-size").value, 10) || 15;
    const words = pick(WORDS, n);
    for (const w of words) {
      Array.from(w.text).forEach((ch, i) => {
        const py = w.py[i];
        items.push({ han: ch, py: py, code: codeFor(py), suffix: "", wordStart: i === 0 });
      });
    }
  } else if (practiceMode === "sentence") {
    const s = SENTENCES[Math.floor(Math.random() * SENTENCES.length)];
    items = buildSentenceItems(s);
  }
  if (!items.length) { alert("没有可练习的内容"); return; }
  startPracticeRound(items);
}
function startCustomRound() {
  const txt = $("#custom-input").value.trim();
  if (!txt) { alert("请先粘贴空格分隔的拼音"); return; }
  const items = [], bad = [];
  txt.split(/\s+/).filter(Boolean).forEach(t => {
    const py = t.toLowerCase();
    if (!/^[a-züv]+$/.test(py)) { bad.push(t); return; }
    const code = codeFor(py);
    if (!code) { bad.push(t); return; }
    items.push({ han: "", py: py, code: code, suffix: "", wordStart: false });
  });
  if (bad.length) alert("已跳过无法识别的音节：" + bad.join("、"));
  if (items.length) startPracticeRound(items);
}
function resetPracticeToSetup() {
  roundActive = false; finished = false;
  resetTimer();
  $("#practice-area").hidden = true;
  $("#finish-overlay").hidden = true;
  $("#practice-setup").hidden = false;
}

function renderPractice() {
  const stage = $("#stage");
  const html = roundItems.map((it, i) => {
    const cls = ["it"];
    if (i < roundIdx) cls.push("done");
    else if (i === roundIdx) { cls.push("cur"); if (flashWrongItem) cls.push("flash-wrong"); }
    if (it.wordStart) cls.push("word-start");
    const code = it.code || "";
    let slots = "";
    for (let j = 0; j < Math.max(code.length, 1); j++) {
      let c = "s", ch = "";
      if (i < roundIdx) { ch = code[j] || ""; c += " past"; }
      else if (i === roundIdx) {
        if (j < roundTyped.length) { ch = code[j]; c += " ok"; }
        else if (settings.hint) { ch = code[j]; c += " hint"; }
      } else if (settings.hint) { ch = code[j]; c += " hint"; }
      slots += `<b class="${c}">${escapeHtml(ch)}</b>`;
    }
    const han = it.han ? `<span class="han">${escapeHtml(it.han)}</span>` : "";
    const py = `<span class="py${it.han ? "" : " big"}">${escapeHtml(it.py || "")}</span>`;
    const suffix = it.suffix ? `<span class="suf">${escapeHtml(it.suffix)}</span>` : "";
    return `<span class="${cls.join(" ")}">${han}${py}<span class="slots">${slots}</span>${suffix}</span>`;
  }).join("");
  stage.innerHTML = html;
  flashWrongItem = false;
  renderLiveStats();
  const cur = stage.querySelector(".it.cur");
  if (cur) cur.scrollIntoView({ block: "nearest", inline: "nearest" });
}
function renderLiveStats() {
  if (!roundStats) return;
  const done = roundStats.itemsDone;
  const total = roundStats.total;
  const keystrokes = roundStats.correct + roundStats.wrong;
  const acc = keystrokes ? Math.round(roundStats.correct / keystrokes * 100) : 100;
  const elapsed = getElapsed();
  const speed = Math.round(done / Math.max(elapsed / 60000, 0.01));
  const accClass = acc >= 95 ? "ok" : (acc >= 85 ? "" : "bad");
  $("#live-stats").innerHTML = `
    <span class="chip">完成 <b>${done}</b>/${total}</span>
    <span class="chip">⏱ <b>${fmtTime(elapsed)}</b></span>
    <span class="chip">速度 <b>${speed}</b> 字/分</span>
    <span class="chip">准确率 <b class="${accClass}">${acc}%</b></span>
    <span class="chip">连击 <b>${roundStats.bestCombo}</b></span>`;
  $("#progress-fill").style.width = (total ? done / total * 100 : 0) + "%";
}
function handlePracticeKey(k) {
  if (!roundActive || finished) return;
  k = k.toLowerCase();
  if (k === "backspace") {
    if (roundTyped.length) roundTyped = roundTyped.slice(0, -1);
    else if (roundIdx > 0) {
      roundIdx--;
      roundTyped = "";
      roundStats.itemsDone = Math.max(0, roundStats.itemsDone - 1);
    }
    renderPractice();
    return;
  }
  if (!/^[a-z;]$/.test(k)) return;
  startTimer();
  startedOnce = true;
  const item = roundItems[roundIdx];
  if (!item) return;
  const expected = item.code[roundTyped.length];
  if (k === expected) {
    roundTyped += k;
    roundStats.correct++;
    roundStats.combo++;
    if (roundStats.combo > roundStats.bestCombo) roundStats.bestCombo = roundStats.combo;
    if (roundTyped.length === item.code.length) {
      roundStats.itemsDone++;
      roundIdx++; roundTyped = "";
      soundCorrect();
      if (roundIdx >= roundItems.length) { finishRound(); return; }
    } else {
      soundCorrect();
    }
    renderPractice();
  } else {
    roundStats.wrong++;
    roundStats.combo = 0;
    roundStats.wrongKeys[k] = (roundStats.wrongKeys[k] || 0) + 1;
    flashWrongItem = true;
    soundWrong();
    renderPractice();
  }
}
function finishRound() {
  finished = true;
  pauseTimer();
  const elapsed = getElapsed();
  const done = roundStats.itemsDone;
  const keystrokes = roundStats.correct + roundStats.wrong;
  const acc = keystrokes ? Math.round(roundStats.correct / keystrokes * 100) : 100;
  const speed = Math.round(done / Math.max(elapsed / 60000, 0.01));
  mergeRoundIntoStats(roundStats, elapsed);
  $("#finish-grid").innerHTML = `
    <div class="cell"><div class="num">${fmtTime(elapsed)}</div><div class="k">用时</div></div>
    <div class="cell"><div class="num">${done}</div><div class="k">完成字数</div></div>
    <div class="cell"><div class="num">${speed}</div><div class="k">速度（字/分）</div></div>
    <div class="cell"><div class="num">${acc}%</div><div class="k">准确率</div></div>
    <div class="cell"><div class="num">${roundStats.bestCombo}</div><div class="k">最高连击</div></div>
    <div class="cell"><div class="num">${keystrokes}</div><div class="k">击键数</div></div>`;
  const wk = Object.entries(roundStats.wrongKeys).sort((a, b) => b[1] - a[1]);
  $("#wrong-keys").innerHTML = wk.length
    ? `<div class="wk-title">本轮错键分布</div>` + wk.map(([k, v]) => `<span class="wk"><b>${escapeHtml(k.toUpperCase())}</b> × ${v}</span>`).join("")
    : `<div class="wk-title">🎯 不错一键，继续保持</div>`;
  $("#finish-overlay").hidden = false;
  soundDone();
}
/* ================= 统计 ================= */
function loadStats() {
  return Object.assign({
    totalCorrect: 0, totalWrong: 0, totalItems: 0, totalTimeMs: 0, bestCombo: 0, byKey: {}, days: {}
  }, lsGet(LS_KEYS.stats, {}));
}
function mergeRoundIntoStats(rs, elapsedMs) {
  const st = loadStats();
  st.totalCorrect += rs.correct;
  st.totalWrong += rs.wrong;
  st.totalItems += rs.itemsDone;
  st.totalTimeMs += elapsedMs;
  if (rs.bestCombo > st.bestCombo) st.bestCombo = rs.bestCombo;
  for (const [k, v] of Object.entries(rs.wrongKeys)) st.byKey[k] = (st.byKey[k] || 0) + v;
  const day = todayStr();
  if (!st.days[day]) st.days[day] = { items: 0, correct: 0, wrong: 0, timeMs: 0 };
  st.days[day].items += rs.itemsDone;
  st.days[day].correct += rs.correct;
  st.days[day].wrong += rs.wrong;
  st.days[day].timeMs += elapsedMs;
  lsSet(LS_KEYS.stats, st);
}
function renderStats() {
  const st = loadStats();
  const keystrokes = st.totalCorrect + st.totalWrong;
  const acc = keystrokes ? Math.round(st.totalCorrect / keystrokes * 100) : 100;
  const speed = Math.round(st.totalItems / Math.max(st.totalTimeMs / 60000, 0.01));
  $("#stats-cards").innerHTML = `
    <div class="stat-card"><div class="num">${st.totalItems}</div><div class="k">累计完成（字）</div></div>
    <div class="stat-card"><div class="num">${acc}%</div><div class="k">总准确率</div></div>
    <div class="stat-card"><div class="num">${fmtTime(st.totalTimeMs)}</div><div class="k">累计时长</div></div>
    <div class="stat-card"><div class="num">${speed}</div><div class="k">平均速度（字/分）</div></div>
    <div class="stat-card"><div class="num">${st.bestCombo}</div><div class="k">最高连击</div></div>
    <div class="stat-card"><div class="num">${keystrokes}</div><div class="k">总击键数</div></div>`;

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    days.push({ key: key, label: key.slice(5), data: st.days[key] || null });
  }
  $("#stats-daily").innerHTML = `<h3>最近 7 天</h3>` + (
    days.every(d => !d.data)
      ? `<div class="empty">还没有记录，先去练一轮吧。</div>`
      : `<table class="stats-table"><thead><tr><th>日期</th><th>字数</th><th>准确率</th><th>时长</th></tr></thead><tbody>` +
        days.map(d => {
          if (!d.data) return `<tr><td>${d.label}</td><td colspan="3">—</td></tr>`;
          const a = d.data.correct + d.data.wrong ? Math.round(d.data.correct / (d.data.correct + d.data.wrong) * 100) + "%" : "100%";
          return `<tr><td>${d.label}</td><td>${d.data.items}</td><td>${a}</td><td>${fmtTime(d.data.timeMs)}</td></tr>`;
        }).join("") + `</tbody></table>`
  );

  const keys = Object.entries(st.byKey).sort((a, b) => b[1] - a[1]);
  const max = keys.length ? keys[0][1] : 1;
  $("#stats-keys").innerHTML = `<h3>错键分布（累计）</h3>` + (
    keys.length
      ? `<div class="bars-row">` + keys.slice(0, 12).map(([k, v]) =>
          `<div class="bar-line"><span><b>${escapeHtml(k.toUpperCase())}</b></span><div class="track"><i style="width:${Math.max(v / max * 100, 6)}%"></i></div><span class="cnt">${v}</span></div>`
        ).join("") + `</div>`
      : `<div class="empty">暂无错键记录。</div>`
  );
}

/* ================= 设置与主题 ================= */
function applyTheme(theme) {
  let resolved = theme;
  if (theme === "auto") {
    resolved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  document.documentElement.setAttribute("data-theme", resolved);
}
const ARTICLE_FONTS = {
  system: `"Segoe UI","PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif`,
  SimSun: `SimSun,"宋体",serif`,
  NSimSun: `NSimSun,"新宋体",serif`,
  SimHei: `SimHei,"黑体",sans-serif`,
  "Microsoft YaHei": `"Microsoft YaHei","微软雅黑","PingFang SC",sans-serif`,
  "Microsoft JhengHei": `"Microsoft JhengHei","微软正黑体",sans-serif`,
  KaiTi: `KaiTi,"楷体",serif`,
  FangSong: `FangSong,"仿宋",serif`,
  DengXian: `DengXian,"等线",sans-serif`,
  STSong: `STSong,"华文宋体",serif`,
  STZhongsong: `STZhongsong,"华文中宋",serif`,
  STKaiti: `STKaiti,"华文楷体",serif`,
  STFangsong: `STFangsong,"华文仿宋",serif`,
  STHeiti: `STHeiti,"华文黑体",sans-serif`,
  STXihei: `STXihei,"华文细黑",sans-serif`,
  YouYuan: `YouYuan,"幼圆",sans-serif`,
  LiSu: `LiSu,"隶书",serif`
};
function applyArticleFont() {
  document.documentElement.style.setProperty("--art-font", ARTICLE_FONTS[settings.articleFont] || ARTICLE_FONTS.system);
  document.documentElement.style.setProperty("--art-weight", settings.articleBold ? "700" : "500");
}
const FONT_SIZES = { small: "14px", normal: "16px", large: "18px", xlarge: "20px", xxlarge: "22px" };
const FONT_SIZE_PX = ["12","13","14","15","16","17","18","19","20","21","22","23","24","26","28"];
function normalizeFontSize(v) {
  if (FONT_SIZES[v]) return FONT_SIZES[v].replace("px", "");
  if (v && FONT_SIZE_PX.includes(String(v))) return String(v);
  return "18";
}
function applyFontSize() {
  document.documentElement.style.fontSize = normalizeFontSize(settings.fontSize) + "px";
}
function updateTopbarH() {
  const tb = document.getElementById("topbar");
  if (tb) document.documentElement.style.setProperty("--tb-h", tb.offsetHeight + "px");
}
function renderVersionBadge() {
  const el = document.getElementById("ver-badge");
  if (!el) return;
  const v = window.APP_VERSION || {};
  const dev = v.channel === "dev";
  el.textContent = (dev ? "测试版 " : "") + "v" + (v.version || "1.0.0");
  el.classList.toggle("dev", dev);
}
function openModal() {
  $("#set-hint").checked = !!settings.hint;
  $("#set-sound").checked = !!settings.sound;
  $("#set-theme").value = settings.theme;
  $("#set-fs").value = normalizeFontSize(settings.fontSize);
  $("#set-font").value = settings.articleFont || "system";
  $("#set-bold").checked = !!settings.articleBold;
  $("#modal").hidden = false;
}
function closeModal() {
  settings.hint = $("#set-hint").checked;
  settings.sound = $("#set-sound").checked;
  settings.theme = $("#set-theme").value;
  settings.fontSize = normalizeFontSize($("#set-fs").value);
  settings.articleFont = $("#set-font").value;
  settings.articleBold = $("#set-bold").checked;
  lsSet(LS_KEYS.settings, settings);
  applyTheme(settings.theme);
  applyFontSize();
  updateTopbarH();
  applyArticleFont();
  $("#modal").hidden = true;
  if (window.ArticlePractice) ArticlePractice.onSettings();
}

/* ================= 事件绑定 ================= */
function bindEvents() {
  /* 方案切换 */
  $("#scheme-picker").addEventListener("click", e => {
    const btn = e.target.closest(".scheme-btn");
    if (!btn) return;
    const next = SCHEMES.find(s => s.id === btn.dataset.scheme);
    if (!next || next.id === currentScheme.id) return;
    currentScheme = next;
    lsSet(LS_KEYS.scheme, next.id);
    applySchemeColor();
    renderSchemePicker();
    renderKeyboard();
    renderArtKeyboard();
    if (drill.active || drill.finished) startDrill(drill.kind);
    if (roundActive && !finished) resetPracticeToSetup();
    if (window.ArticlePractice) ArticlePractice.onSchemeChange();
  });
  /* 顶部导航 */
  $$(".tab").forEach(t => t.addEventListener("click", () => setView(t.dataset.view)));
  /* 键位记忆 */
  $("#drill-modes").addEventListener("click", e => {
    const btn = e.target.closest("button[data-drill]");
    if (!btn) return;
    $$("#drill-modes button").forEach(b => b.classList.toggle("active", b === btn));
    startDrill(btn.dataset.drill);
  });
  $("#btn-drill-reset").addEventListener("click", () => startDrill(drill.kind));
  /* 综合练习 */
  $("#practice-modes").addEventListener("click", e => {
    const btn = e.target.closest("button[data-mode]");
    if (!btn) return;
    switchPracticeMode(btn.dataset.mode);
  });
  $("#btn-start-round").addEventListener("click", newPracticeRound);
  $("#btn-start-custom").addEventListener("click", startCustomRound);
  $("#btn-practice-reset").addEventListener("click", newPracticeRound);
  $("#btn-change-mode").addEventListener("click", resetPracticeToSetup);
  $("#btn-again").addEventListener("click", () => {
    $("#finish-overlay").hidden = true;
    if (practiceMode === "custom") startCustomRound(); else newPracticeRound();
  });
  $("#btn-finish-close").addEventListener("click", () => { $("#finish-overlay").hidden = true; });
  $("#finish-overlay").addEventListener("click", e => { if (e.target.id === "finish-overlay") $("#finish-overlay").hidden = true; });
  /* 自定义拼音缓存 */
  $("#custom-input").value = lsGet(LS_KEYS.custom, "");
  $("#custom-input").addEventListener("input", e => lsSet(LS_KEYS.custom, e.target.value));
  /* 设置 */
  $("#btn-settings").addEventListener("click", openModal);
  $("#btn-modal-close").addEventListener("click", closeModal);
  $("#modal").addEventListener("click", e => { if (e.target.id === "modal") closeModal(); });
  $("#btn-clear-data").addEventListener("click", () => {
    if (confirm("确定清除全部练习统计吗？")) {
      lsSet(LS_KEYS.stats, null);
      renderStats();
    }
  });
  /* 键盘输入 */
  document.addEventListener("keydown", e => {
    if (e.ctrlKey && (e.key === "I" || e.key === "i")) { e.preventDefault(); openModal(); return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!$("#modal").hidden) return;
    const tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (e.key === "Escape") {
      if (currentView === "article" && window.ArticlePractice) { ArticlePractice.onEscape(); return; }
      if (currentView === "practice" && finished && !$("#finish-overlay").hidden) { $("#finish-overlay").hidden = true; return; }
      if (currentView === "practice" && roundActive && !finished) { resetPracticeToSetup(); }
      else if (currentView === "drills" && drill.active) { startDrill(drill.kind); }
      return;
    }
    if (e.key === "Backspace" && (currentView === "practice" || currentView === "drills" || currentView === "article")) e.preventDefault();
    if (currentView === "keyboard") flashKey(e.key);
    if (currentView === "drills") handleDrillKey(e.key);
    if (currentView === "practice") handlePracticeKey(e.key);
    if (currentView === "article" && window.ArticlePractice) ArticlePractice.onKey(e);
  });
  /* 跟随系统主题变化 */
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (settings.theme === "auto") applyTheme("auto");
    });
  }
  switchPracticeMode("syll");
  resetPracticeToSetup();
}

/* ================= 启动 ================= */
applyTheme(settings.theme);
applyFontSize();
applyArticleFont();
applySchemeColor();
renderSchemePicker();
updateTopbarH();
renderArtKeyboard();
renderVersionBadge();
setView(lsGet(LS_KEYS.view, "article"));
bindEvents();
window.addEventListener("resize", updateTopbarH);
