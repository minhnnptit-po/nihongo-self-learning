/* ===== Mode Kanji: gõ romaji của âm On / Kun =====
   Thẻ hiện sẵn: chữ Kanji + âm Hán Việt + nghĩa tiếng Việt.
   Đáp án = romaji của bất kỳ âm On hoặc Kun nào (tự sinh từ dòng "On: ... ・ Kun: ...").
   Dòng On/Kun bằng kana chỉ hiện ra khi trả lời đúng (hoặc khi bấm xem đáp án). */
const KANA_ROMAJI = {
  あ:"a",い:"i",う:"u",え:"e",お:"o",
  か:"ka",き:"ki",く:"ku",け:"ke",こ:"ko",
  さ:"sa",し:"shi",す:"su",せ:"se",そ:"so",
  た:"ta",ち:"chi",つ:"tsu",て:"te",と:"to",
  な:"na",に:"ni",ぬ:"nu",ね:"ne",の:"no",
  は:"ha",ひ:"hi",ふ:"fu",へ:"he",ほ:"ho",
  ま:"ma",み:"mi",む:"mu",め:"me",も:"mo",
  や:"ya",ゆ:"yu",よ:"yo",
  ら:"ra",り:"ri",る:"ru",れ:"re",ろ:"ro",
  わ:"wa",を:"o",ん:"n",
  が:"ga",ぎ:"gi",ぐ:"gu",げ:"ge",ご:"go",
  ざ:"za",じ:"ji",ず:"zu",ぜ:"ze",ぞ:"zo",
  だ:"da",ぢ:"ji",づ:"zu",で:"de",ど:"do",
  ば:"ba",び:"bi",ぶ:"bu",べ:"be",ぼ:"bo",
  ぱ:"pa",ぴ:"pi",ぷ:"pu",ぺ:"pe",ぽ:"po"
};
const KANA_SMALL = { "ゃ":"a", "ゅ":"u", "ょ":"o" };

// kana (hiragana hoặc katakana) -> romaji kiểu Hepburn; trả về null nếu có ký tự lạ hoặc kết thúc bằng っ/ッ
function kanaToRomaji(src){
  const s = Array.from(src).map(ch => {
    const c = ch.codePointAt(0);
    return (c >= 0x30A1 && c <= 0x30F6) ? String.fromCodePoint(c - 0x60) : ch; // katakana -> hiragana
  });
  const out = [];
  let sokuon = false;
  for(let i = 0; i < s.length; i++){
    const ch = s[i];
    if(ch === "っ"){ sokuon = true; continue; }
    if(ch === "ー"){
      if(!out.length) return null;
      out.push(out[out.length - 1].slice(-1));
      continue;
    }
    let r = KANA_ROMAJI[ch];
    if(!r) return null;
    const nx = s[i + 1];
    if(nx && KANA_SMALL[nx] && r.endsWith("i")){
      const stem = r.slice(0, -1);
      r = (["sh", "ch", "j"].includes(stem) ? stem : stem + "y") + KANA_SMALL[nx];
      i++;
    }
    if(sokuon){
      r = (r.startsWith("ch") ? "t" : r[0]) + r;
      sokuon = false;
    }
    out.push(r);
  }
  return sokuon ? null : out.join("");
}

// Một mục kun như "は(やす/える)" -> ["はやす", "はえる"] + phần gốc "は"; "-か" -> "か"; "–" -> bỏ
function kunTokenForms(tok){
  tok = tok.trim().replace(/^[-‐–—]+/, "").trim();
  if(!tok) return [];
  const m = tok.match(/^([^()（）]*)[(（]([^()（）]*)[)）]?$/);
  if(!m) return [tok];
  const stem = m[1].trim();
  const tails = m[2].split("/").map(t => t.trim()).filter(Boolean);
  return [stem, ...tails.map(t => stem + t)];
}

// "On: イチ、イツ ・ Kun: ひと（つ）" -> danh sách romaji (On trước, Kun sau, không trùng)
function readingsToRomaji(line){
  const m = line.match(/^On:\s*(.*?)\s*・\s*Kun:\s*(.*)$/);
  if(!m) return [];
  const split = (t) => t.split(/[、,，]/).map(x => x.trim()).filter(Boolean);
  const kana = [
    ...split(m[1]).flatMap(kunTokenForms),
    ...split(m[2]).flatMap(kunTokenForms)
  ];
  const seen = new Set();
  kana.forEach(k => { const r = k && kanaToRomaji(k); if(r) seen.add(r); });
  return Array.from(seen);
}

// [kanji, [âm Hán Việt], "nghĩa\nOn: ... ・ Kun: ..."] -> [kanji, [romaji...], "Hán Việt: ...\nnghĩa", "On: ... ・ Kun: ..."]
function toKanjiCard([kanji, hv, info]){
  const lines = info.split("\n");
  const readings = lines.slice(1).join("\n");
  const hvText = (hv.hv || hv).join(" / ").toLocaleUpperCase("vi");
  return [kanji, readingsToRomaji(readings), `Hán Việt: ${hvText}\n${lines[0]}`, readings];
}
const KANJI = { n5: KANJI_RAW.n5.map(toKanjiCard) };

// So khớp romaji cho mode Kanji: bỏ khoảng trắng/dấu ', gộp các kiểu viết (si/shi, tu/tsu, sya/sha...) và nguyên âm kéo dài (ou/oo/uu/ii/ee/aa)
function kanjiRomajiKey(s){
  let x = s.normalize("NFC").toLowerCase().trim()
    .replace(/[āâ]/g, "a").replace(/[īî]/g, "i").replace(/[ūû]/g, "u").replace(/[ēê]/g, "e").replace(/[ōô]/g, "o")
    .replace(/[\s'’\-]/g, "");
  [
    [/sy([auo])/g, "sh$1"], [/cy([auo])/g, "ch$1"], [/ty([auo])/g, "ch$1"],
    [/zy([auo])/g, "j$1"], [/jy([auo])/g, "j$1"],
    [/si/g, "shi"], [/ti/g, "chi"], [/tu/g, "tsu"],
    [/zi/g, "ji"], [/di/g, "ji"], [/du/g, "zu"],
    [/(^|[^sc])hu/g, "$1fu"], [/wo/g, "o"],
    [/tch/g, "cch"]
  ].forEach(([re, rep]) => { x = x.replace(re, rep); });
  return x.replace(/ou|oo/g, "o").replace(/uu/g, "u").replace(/ii/g, "i").replace(/ee/g, "e").replace(/aa/g, "a");
}

/* ==================== Logic chính (thẻ Hiragana / Katakana / Kanji, hero, thanh công cụ) ==================== */
const GROUP_TITLES = {
  gojuon: "Bảng cơ bản (Gojūon)",
  dakuten: "Đục âm & Bán đục âm (Dakuten / Handakuten)",
  yoon: "Âm ghép (Yōon)",
  vidu: "Ví dụ - Từ vựng ứng dụng",
  mix: "Ví dụ kết hợp Kanji + Hiragana + Katakana",
  n5: "102 Hán tự N5 (JLPT)"
};

const MODES = {
  hiragana: { items: HIRAGANA, mainId: "main-hiragana" },
  katakana: { items: KATAKANA, mainId: "main-katakana" },
  teform:   { items: null,       mainId: "main-teform" },
  kanji:    { items: KANJI,      mainId: "main-kanji" },
  vidu:     { items: VIDU,       mainId: "main-vidu" }
};

const countKana = (o) => Object.values(o).reduce((s,g)=>s+g.length,0);
const TOTAL = countKana(HIRAGANA);
const MODE_TOTALS = {
  hiragana: countKana(HIRAGANA),
  katakana: countKana(KATAKANA),
  teform: て.length,
  kanji: countKana(KANJI),
  vidu: countKana(VIDU)
};
const correctCount = { hiragana: 0, katakana: 0, teform: 0, kanji: 0, vidu: 0 };
const PROGRESS_SUFFIX = { hiragana: "đã đúng", katakana: "đã đúng", teform: "đã làm", kanji: "đã đúng", vidu: "đã đúng" };
let hideCorrect = false;
let currentFilter = "all";
let currentMode = "hiragana";

/* ---------- Lưu tiến độ (localStorage): mỗi mode nhớ những câu đã đúng, tải lại trang không mất ----------
   - 4 mode dạng thẻ: lưu id thẻ = "nhóm|chữ" của các thẻ đã trả lời đúng.
   - Thể て: lưu theo từng câu, "c" = đã gõ đúng, "r" = đã xem đáp án.
   Id không còn trong dữ liệu (sau khi sửa data.js) sẽ tự bị bỏ khi lưu lần kế tiếp. */
const PROGRESS_KEY = "nihongo-progress-v1";
const savedProgress = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    return (raw && typeof raw === "object" && !Array.isArray(raw)) ? raw : {};
  } catch (e) { return {}; }
})();
const asIdSet = (v) => new Set(Array.isArray(v) ? v.filter(x => typeof x === "string") : []);
const savedSets = {
  hiragana: asIdSet(savedProgress.hiragana),
  katakana: asIdSet(savedProgress.katakana),
  kanji:    asIdSet(savedProgress.kanji),
  vidu:     asIdSet(savedProgress.vidu)
};
const doneIds = { hiragana: new Set(), katakana: new Set(), kanji: new Set(), vidu: new Set() };
const tfState = {};
if(savedProgress.teform && typeof savedProgress.teform === "object" && !Array.isArray(savedProgress.teform)){
  Object.entries(savedProgress.teform).forEach(([id, st]) => { if(st === "c" || st === "r") tfState[id] = st; });
}
function persistProgress(){
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({
      hiragana: [...doneIds.hiragana],
      katakana: [...doneIds.katakana],
      kanji:    [...doneIds.kanji],
      vidu:     [...doneIds.vidu],
      teform:   tfState
    }));
  } catch (e) {}
}

// Gợi ý khi sai nhiều lần: chữ cái đầu của đáp án (nhiều đáp án hợp lệ thì liệt kê các chữ đầu khác nhau)
function firstLetterHint(answers){
  const list = answers.map(a => normalize(String(a)));
  if(!list.length || list.every(a => a.length <= 1)) return ""; // đáp án 1 chữ cái thì gợi ý = lộ đáp án, bỏ
  const letters = [...new Set(list.map(a => a.charAt(0)).filter(Boolean))];
  return "chữ đầu: " + letters.slice(0, 4).join(" / ") + (letters.length > 4 ? " …" : "");
}

const progressFill = document.getElementById("progressFill");
const progressLabel = document.getElementById("progressLabel");

function normalize(str){
  return str.trim().toLowerCase().normalize("NFC");
}

function makeRevealBtn(){
  const b = document.createElement("button");
  b.type = "button";
  b.className = "reveal-btn";
  b.title = "Xem đáp án (bấm rồi thì không sửa được nữa)";
  b.setAttribute("aria-label", "Xem đáp án");
  b.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  b.addEventListener("mousedown", (e)=> e.preventDefault()); // bấm nút không làm ô nhập mất focus (tránh tự chấm)
  return b;
}

// Tách một chuỗi thành từng đoạn Kanji / Hiragana / Katakana liên tiếp, để hiện riêng từng loại chữ (mode Ví dụ, nhóm "mix")
function scriptTypeOf(ch){
  const c = ch.codePointAt(0);
  if(c >= 0x4E00 && c <= 0x9FFF) return "kanji";
  if(c >= 0x3040 && c <= 0x309F) return "hira";
  if((c >= 0x30A0 && c <= 0x30FF) || c === 0x30FC) return "kata";
  return "other";
}
function segmentMixedWord(word){
  const runs = [];
  let curType = null, cur = "";
  for(const ch of word){
    const t = scriptTypeOf(ch);
    if(t === curType){ cur += ch; }
    else {
      if(cur) runs.push([curType, cur]);
      curType = t; cur = ch;
    }
  }
  if(cur) runs.push([curType, cur]);
  return runs;
}
// Vẽ từng đoạn thành 1 "thẻ" (span) riêng, có màu/khoảng cách riêng cho dễ nhìn
function renderMixedKana(kanaEl, word){
  kanaEl.classList.add("mixed-word");
  segmentMixedWord(word).forEach(([type, text])=>{
    const seg = document.createElement("span");
    seg.className = "seg seg-" + type;
    seg.textContent = text;
    kanaEl.appendChild(seg);
  });
}

/* Mode Kanji: nút ẩn/hiện âm Hán Việt + nghĩa dưới chữ Hán (nhớ lựa chọn cho lần mở sau) */
const HIDE_MEANING_KEY = "nihongo-hide-meaning";
let hideKanjiMeaning = false;
try { hideKanjiMeaning = localStorage.getItem(HIDE_MEANING_KEY) === "1"; } catch (e) {}
// Hai nút trên thanh lọc (chỉ hiện ở mode Kanji) để dùng được cả khi đang cuộn xuống dưới:
// chúng bấm thay cho nút cùng chức năng ở tiêu đề danh sách, nên luôn đồng bộ với nhau.
const kanjiMeaningChip = document.getElementById("kanjiMeaning");
const kanjiShuffleChip = document.getElementById("kanjiShuffle");
function updateTopMeaningChip(){
  if(!kanjiMeaningChip) return;
  kanjiMeaningChip.textContent = hideKanjiMeaning ? "Hiện nghĩa" : "Ẩn nghĩa";
  kanjiMeaningChip.classList.toggle("active", hideKanjiMeaning);
  kanjiMeaningChip.setAttribute("aria-pressed", String(hideKanjiMeaning));
}
if(kanjiMeaningChip) kanjiMeaningChip.addEventListener("click", () => {
  const b = document.querySelector("#main-kanji .meaning-btn");
  if(b) b.click();
});
if(kanjiShuffleChip) kanjiShuffleChip.addEventListener("click", () => {
  const b = document.querySelector("#main-kanji .shuffle-btn:not(.meaning-btn)");
  if(b) b.click();
});

const ICON_EYE ='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const ICON_EYE_OFF = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2"/><path d="M6.6 6.6A17.7 17.7 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4.4-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m2 2 20 20"/></svg>';

function buildSection(mode, key, items){
  const section = document.createElement("section");
  section.className = "section";
  section.dataset.group = key;

  const titleWrap = document.createElement("div");
  titleWrap.className = "section-title";
  titleWrap.innerHTML = `<h2>${GROUP_TITLES[key]}</h2><span class="section-count">${items.length} câu</span>`;

  const shuffleBtn = document.createElement("button");
  shuffleBtn.className = "shuffle-btn";
  shuffleBtn.type = "button";
  shuffleBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/></svg><span>Xáo trộn</span>';
  if(mode === "kanji"){
    // Nút ẩn/hiện nghĩa: đặt ngay cạnh nút Xáo trộn (bên trái nó)
    const meaningBtn = document.createElement("button");
    meaningBtn.className = "shuffle-btn meaning-btn";
    meaningBtn.type = "button";
    const syncMeaningBtn = () => {
      section.classList.toggle("hide-meaning", hideKanjiMeaning);
      meaningBtn.setAttribute("aria-pressed", String(hideKanjiMeaning));
      meaningBtn.innerHTML = (hideKanjiMeaning ? ICON_EYE : ICON_EYE_OFF) + `<span>${hideKanjiMeaning ? "Hiện nghĩa" : "Ẩn nghĩa"}</span>`;
      updateTopMeaningChip();
    };
    syncMeaningBtn();
    meaningBtn.addEventListener("click", ()=>{
      hideKanjiMeaning = !hideKanjiMeaning;
      try { localStorage.setItem(HIDE_MEANING_KEY, hideKanjiMeaning ? "1" : "0"); } catch (e) {}
      syncMeaningBtn();
    });
    titleWrap.appendChild(meaningBtn);
  }
  titleWrap.appendChild(shuffleBtn);

  section.appendChild(titleWrap);

  const grid = document.createElement("div");
  grid.className = "grid";

  shuffleBtn.addEventListener("click", ()=>{
    const cards = Array.from(grid.children);
    for(let i = cards.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    grid.style.opacity = ".4";
    grid.style.transform = "scale(.99)";
    setTimeout(()=>{
      cards.forEach(c => grid.appendChild(c));
      grid.style.opacity = "1";
      grid.style.transform = "scale(1)";
    }, 140);
  });

  items.forEach((item) => {
    const [kana, answer, meaning, readings] = item;
    const answers = Array.isArray(answer) ? answer : [answer];
    // mode Kanji: so khớp theo romaji đã chuẩn hoá (si/shi, ou/o...), không so chuỗi thô
    const answerKeys = mode === "kanji" ? new Set(answers.map(kanjiRomajiKey)) : null;

    const card = document.createElement("div");
    card.className = "card";
    card.dataset.group = key;
    if(meaning) card.classList.add("word-card");

    const kanaEl = document.createElement("div");
    kanaEl.className = "kana";
    kanaEl.lang = "ja";
    if(key === "mix"){
      renderMixedKana(kanaEl, kana);
    } else {
      kanaEl.textContent = kana;
    }

    let meaningEl = null;
    if(meaning){
      meaningEl = document.createElement("div");
      meaningEl.className = "meaning";
      if(readings){
        // Hán Việt + nghĩa nằm trong .mn (nút "Ẩn nghĩa" ẩn phần này)
        const mn = document.createElement("span");
        mn.className = "mn";
        mn.textContent = meaning;
        meaningEl.appendChild(mn);
        // âm On/Kun: nằm sẵn trong thẻ nhưng bị CSS ẩn, chỉ hiện khi thẻ .correct / .revealed
        const rd = document.createElement("div");
        rd.className = "rd";
        rd.lang = "ja";
        rd.textContent = readings;
        meaningEl.appendChild(rd);
      } else {
        meaningEl.textContent = meaning;
      }
    }

    const input = document.createElement("input");
    input.type = "text";
    input.autocomplete = "off";
    input.autocapitalize = "off";
    input.spellcheck = false;
    input.placeholder = "romaji...";
    input.setAttribute("aria-label", mode === "kanji" ? `Romaji âm On hoặc Kun của ${kana}` : `Romaji của ${kana}`);

    const fb = document.createElement("div");
    fb.className = "fb";

    const cardId = key + "|" + kana;   // id để lưu tiến độ
    let wrongTries = 0, lastWrong = ""; // đếm số lần sai (khác nhau) để hiện gợi ý
    card._resetTries = () => { wrongTries = 0; lastWrong = ""; };

    const retryBtn = document.createElement("button");
    retryBtn.className = "retry-btn";
    retryBtn.type = "button";
    retryBtn.innerHTML = "↺";
    retryBtn.title = "Làm lại chữ này";
    retryBtn.addEventListener("click", (e)=>{
      e.stopPropagation();
      const wasCorrect = card.classList.contains("correct");
      card.classList.remove("correct","wrong","revealed");
      input.value = "";
      input.disabled = false;
      revealBtn.disabled = false;
      fb.textContent = "";
      fb.className = "fb";
      card._resetTries();
      if(wasCorrect){
        correctCount[mode]--;
        doneIds[mode].delete(cardId);
        persistProgress();
      }
      updateProgress();
      if(hideCorrect) applyFilters();
      input.focus();
    });

    function check(){
      if(card.classList.contains("correct") || card.classList.contains("revealed")) return;
      const val = normalize(input.value);
      if(!val) return;
      const ok = answerKeys ? answerKeys.has(kanjiRomajiKey(val)) : answers.map(normalize).includes(val);
      if(ok){
        card.classList.remove("wrong");
        card.classList.add("correct");
        fb.textContent = "tạm";
        fb.className = "fb ok";
        input.disabled = true;
        correctCount[mode]++;
        doneIds[mode].add(cardId);
        persistProgress();
        updateProgress();
        if(hideCorrect) applyFilters();
      } else {
        card.classList.remove("correct");
        card.classList.add("wrong");
        if(val !== lastWrong){ lastWrong = val; wrongTries++; } // blur lại với cùng giá trị sai không tính thêm
        const hint = wrongTries >= 2 ? firstLetterHint(answers) : "";
        fb.textContent = hint ? `non vl · ${hint}` : "non vl";
        fb.className = "fb no";
        setTimeout(()=>card.classList.remove("wrong"), 320);
      }
    }

    input.addEventListener("keydown", (e)=>{
      if(e.key === "Enter") check();
    });
    input.addEventListener("blur", check);
    input.addEventListener("input", ()=>{
      input.classList.remove("typing");
      void input.offsetWidth;
      input.classList.add("typing");
    });

    card.appendChild(kanaEl);
    if(meaningEl) card.appendChild(meaningEl);
    // nút nhỏ cạnh ô nhập: xem đáp án (last resort, xem rồi thì khoá luôn)
    const revealBtn = makeRevealBtn();
    revealBtn.addEventListener("click", (e)=>{
      e.stopPropagation();
      if(card.classList.contains("correct") || card.classList.contains("revealed")) return;
      card.classList.remove("wrong");
      card.classList.add("revealed");
      input.value = answers[0];
      input.disabled = true;
      revealBtn.disabled = true;
      fb.textContent = "đáp án nè";
      fb.className = "fb rv";
    });
    const ans = document.createElement("div");
    ans.className = "ans";
    ans.appendChild(input);
    ans.appendChild(revealBtn);
    card.appendChild(ans);
    card.appendChild(fb);
    card.appendChild(retryBtn);
    // khôi phục thẻ đã đúng từ lần học trước
    if(savedSets[mode] && savedSets[mode].has(cardId)){
      card.classList.add("correct");
      input.value = answers[0];
      input.disabled = true;
      fb.textContent = "tạm";
      fb.className = "fb ok";
      correctCount[mode]++;
      doneIds[mode].add(cardId);
    }
    grid.appendChild(card);
  });

  section.appendChild(grid);
  document.getElementById(MODES[mode].mainId).appendChild(section);
}

const progressShown = { hiragana:0, katakana:0, teform:0, kanji:0, vidu:0 };
const celebratedModes = new Set();
let progressAnimId = 0;

// Rắc vài mẩu "pháo giấy" nhỏ quanh thanh tiến độ khi hoàn thành 100% một chế độ
function celebrateComplete(){
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const rect = progressFill.getBoundingClientRect();
  if (!rect.width) return;
  const colors = ["#8B6CFF","#5F9A2E","#D9436A","#9E8CF0","#F1C453"];
  for(let i = 0; i < 18; i++){
    const bit = document.createElement("span");
    bit.className = "confetti-bit";
    bit.style.left = (rect.left + rect.width * Math.random()) + "px";
    bit.style.top = (rect.top + rect.height / 2) + "px";
    bit.style.background = colors[i % colors.length];
    const angle = Math.random() * Math.PI - Math.PI; // toả lên trên & hai bên
    const dist = 60 + Math.random() * 90;
    bit.style.setProperty("--dx", (Math.cos(angle) * dist).toFixed(1) + "px");
    bit.style.setProperty("--dy", (Math.sin(angle) * dist - 40).toFixed(1) + "px");
    bit.style.setProperty("--rot", (Math.random() * 360).toFixed(0) + "deg");
    document.body.appendChild(bit);
    bit.addEventListener("animationend", () => bit.remove());
  }
}

// animate = false: nhảy thẳng tới số mới (dùng khi đổi chế độ, vì đổi hẳn sang bộ số khác)
// animate = true (mặc định): đếm chạy mượt từ số cũ sang số mới
function updateProgress(animate = true){
  const total = MODE_TOTALS[currentMode] ?? TOTAL;
  const done = correctCount[currentMode];
  const pct = Math.round((done/total)*100);
  progressFill.style.setProperty("--p", pct);

  if (pct >= 100 && total > 0 && !celebratedModes.has(currentMode)){
    celebratedModes.add(currentMode);
    celebrateComplete();
  } else if (pct < 100){
    celebratedModes.delete(currentMode);
  }

  const reduceMo = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  cancelAnimationFrame(progressAnimId);

  if (reduceMo || !animate){
    progressShown[currentMode] = done;
    progressLabel.textContent = `${done} / ${total} ${PROGRESS_SUFFIX[currentMode]}`;
    return;
  }

  progressFill.classList.remove("pulse");
  void progressFill.offsetWidth;
  progressFill.classList.add("pulse");

  const from = progressShown[currentMode] ?? 0;
  const to = done;
  const mode = currentMode;
  const start = performance.now();
  const dur = Math.min(480, 140 + Math.abs(to - from) * 26);

  function step(now){
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    const shown = Math.round(from + (to - from) * eased);
    if (mode === currentMode){
      progressLabel.textContent = `${shown} / ${total} ${PROGRESS_SUFFIX[currentMode]}`;
    }
    if (t < 1){
      progressAnimId = requestAnimationFrame(step);
    } else {
      progressShown[mode] = to;
    }
  }
  progressAnimId = requestAnimationFrame(step);
}

function applyFilters(){
  if(currentMode === "teform") return; // bộ lọc chỉ dành cho Hiragana / Katakana
  const activeMain = document.getElementById(MODES[currentMode].mainId);
  activeMain.querySelectorAll(".section").forEach(section=>{
    const match = currentFilter === "all" || section.dataset.group === currentFilter;
    section.classList.toggle("hidden", !match);
  });
  if(hideCorrect){
    activeMain.querySelectorAll(".card.correct").forEach(c=>c.classList.add("hidden"));
  } else {
    activeMain.querySelectorAll(".card.correct").forEach(c=>c.classList.remove("hidden"));
  }
}

Object.entries(MODES).forEach(([mode, cfg])=>{
  if(!cfg.items) return; // teform không dùng buildSection
  Object.entries(cfg.items).forEach(([key, items]) => buildSection(mode, key, items));
});
// mode nào đã hoàn thành 100% từ lần trước thì không bắn pháo giấy lại mỗi lần mở trang / chuyển mode
["hiragana", "katakana", "kanji", "vidu"].forEach(m => {
  if(MODE_TOTALS[m] > 0 && correctCount[m] >= MODE_TOTALS[m]) celebratedModes.add(m);
});
updateProgress();

/* ---------- Hero: nội dung đổi theo chế độ ---------- */
const HERO = {
  hiragana: {
    title: "Đọc Hiragana,\ngõ romaji.",
    sub: `Nhìn chữ, gõ cách đọc rồi nhấn Enter. Có ${countKana(HIRAGANA)} thẻ, từ bảng cơ bản đến từ vựng.`,
    steps: ["Nhìn chữ Hiragana", "Gõ cách đọc bằng romaji", "Nhấn Enter để kiểm tra"]
  },
  katakana: {
    title: "Đọc Katakana,\ngõ romaji.",
    sub: `Katakana dùng cho từ mượn và tên nước ngoài. Có ${countKana(KATAKANA)} thẻ; âm kéo dài ー gõ bằng dấu - hoặc nguyên âm đôi.`,
    steps: ["Nhìn chữ Katakana", "Gõ cách đọc bằng romaji", "Nhấn Enter để kiểm tra"]
  },
  teform: {
    title: "Chia động từ\nsang thể て.",
    sub: `Nhìn động từ thể ます rồi gõ romaji của thể て. Có ${て.length} câu, không chấm điểm, không áp lực: xem đáp án lúc nào cũng được và làm lại riêng từng câu.`,
    steps: ["Nhìn động từ thể ます", "Gõ romaji của thể て", "Nhấn Enter, chưa nhớ thì xem đáp án"]
  },
  kanji: {
    title: "Học Kanji N5,\ngõ cách đọc romaji.",
    sub: `Nhìn chữ Hán kèm âm Hán Việt và nghĩa, gõ cách đọc bằng romaji (âm On hoặc Kun đều được) rồi nhấn Enter. Có ${countKana(KANJI)} chữ Kanji trình độ N5; âm On/Kun chỉ hiện ra khi bạn trả lời đúng.`,
    steps: ["Nhìn chữ Kanji, âm Hán Việt và nghĩa", "Gõ romaji của âm On hoặc Kun", "Nhấn Enter, đúng thì hiện âm On/Kun"]
  },
  vidu: {
    title: "Ví dụ tổng hợp,\ngõ romaji.",
    sub: `Từ vựng Hiragana + Katakana gộp chung, và các cụm kết hợp cả Kanji + Hiragana + Katakana. Có ${countKana(VIDU)} thẻ.`,
    steps: ["Nhìn từ / cụm từ", "Gõ cách đọc bằng romaji", "Nhấn Enter để kiểm tra"]
  }
};

const heroCopy = document.getElementById("heroCopy");
const heroTitle = document.getElementById("heroTitle");
const heroSub = document.getElementById("heroSub");
const heroSteps = [1,2,3].map(n => document.getElementById("heroS" + n));
const orbKana = document.getElementById("orbKana");
const orbRomaji = document.getElementById("orbRomaji");
let orbIdx = -1;
let orbShown = null;

function orbPool(mode){
  if(mode === "teform") return [["て", "te"]];
  if(mode === "kanji") return KANJI.n5.map(([k, a]) => [k, Array.isArray(a) ? a[0] : a]);
  if(mode === "vidu") return [...VIDU_KANA, ...MIX_EXAMPLES].map(([k, a]) => [k, Array.isArray(a) ? a[0] : a]);
  const src = mode === "katakana" ? KATAKANA : HIRAGANA;
  return src.gojuon.map(([k, a]) => [k, Array.isArray(a) ? a[0] : a]);
}
// Co chữ trong bong bóng cho vừa khít: đo bề ngang thật của chữ, so với bề ngang an toàn
// bên trong bong bóng rồi tính hệ số co (chỉ co nhỏ lại, không phóng to hơn cỡ gốc).
function fitOrbKana(){
  const holder = orbKana.parentElement; // .orb-content
  if(!holder) return;
  // Tắt transition khi đo: font-size có transition .25s nên nếu không tắt, lúc đo chữ vẫn đang ở cỡ cũ
  // (đã co nhỏ từ chữ trước) => đo ra "vừa" => không co, rồi chữ mới phình to tràn khỏi bong bóng.
  const prevTransition = orbKana.style.transition;
  orbKana.style.transition = "none";
  orbKana.style.setProperty("--orb-scale", 1); // về cỡ gốc trước khi đo
  const safeWidth = holder.clientWidth * 0.66;
  const natural = orbKana.scrollWidth;
  let scale = 1;
  if(natural > safeWidth && natural > 0) scale = Math.max(0.1, Math.min(1, safeWidth / natural));
  orbKana.style.setProperty("--orb-scale", scale.toFixed(3));
  void orbKana.offsetWidth; // chốt cỡ mới rồi mới bật lại transition
  orbKana.style.transition = prevTransition;
}
window.addEventListener("resize", () => { if(orbShown !== null) fitOrbKana(); });
// font Nhật tải xong có thể làm bề ngang chữ đổi => co lại một lần nữa cho chắc
if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if(orbShown !== null) fitOrbKana(); });

function swapOrb(k, r){
  orbKana.classList.remove("in");
  orbRomaji.classList.remove("in");
  void orbKana.offsetWidth;
  orbKana.textContent = k;
  orbRomaji.textContent = r;
  fitOrbKana();
  orbShown = k;
  orbKana.classList.add("in");
  orbRomaji.classList.add("in");
}
function orbNext(){
  const pool = orbPool(currentMode);
  if(pool.length === 1){
    if(orbShown !== pool[0][0]) swapOrb(pool[0][0], pool[0][1]);
    return;
  }
  let n;
  do { n = Math.floor(Math.random() * pool.length); } while(n === orbIdx);
  orbIdx = n;
  swapOrb(pool[n][0], pool[n][1]);
}
function setHero(mode, animate){
  const h = HERO[mode];
  heroTitle.textContent = h.title;
  heroSub.textContent = h.sub;
  heroSteps.forEach((el, i) => { el.textContent = h.steps[i]; });
  if(animate){
    heroCopy.classList.remove("swap");
    void heroCopy.offsetWidth;
    heroCopy.classList.add("swap");
  }
  orbIdx = -1;
  orbShown = null;
  orbNext();
}
const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if(!reduceMotion) setInterval(orbNext, 2800);

/* ---------- Chuyển chế độ ---------- */
const modeRow = document.getElementById("modeRow");
const MODE_INDEX = { hiragana: 0, katakana: 1, teform: 2, kanji: 3, vidu: 4 };
const allChip = document.querySelector('#filterControls .chip[data-filter="all"]');
function updateAllChipLabel(mode){
  if(allChip) allChip.textContent = `Tất cả (${MODE_TOTALS[mode] ?? TOTAL})`;
}
const topbarEl = document.getElementById("topbar");

// Viên thuốc chọn mode bám theo đúng nút đang chọn. Trên màn hình hẹp các nút có bề rộng khác nhau
// (nhãn dài ngắn khác nhau) nên không thể suy ra vị trí từ "chỉ số × 1/5 bề rộng" như trước.
const modeThumb = modeRow.querySelector(".mode-thumb");
function syncModeThumb(){
  const act = modeRow.querySelector(".mode-btn.active");
  if(!modeThumb || !act || !act.offsetWidth) return;
  modeThumb.style.setProperty("--tx", (act.offsetLeft - 4) + "px"); // .mode-thumb đặt sẵn left:4px
  modeThumb.style.setProperty("--tw", act.offsetWidth + "px");
}
syncModeThumb();
if(window.ResizeObserver){
  const ro = new ResizeObserver(syncModeThumb); // bắt cả lúc đổi cỡ chữ, font tải xong, thanh co/giãn khi cuộn
  ro.observe(modeRow);
  modeRow.querySelectorAll(".mode-btn").forEach(b => ro.observe(b));
}
window.addEventListener("resize", syncModeThumb);
if(document.fonts && document.fonts.ready) document.fonts.ready.then(syncModeThumb);

document.querySelectorAll("#modeRow .mode-btn").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    if(btn.dataset.mode === currentMode) return;
    document.querySelectorAll("#modeRow .mode-btn").forEach(b=>{
      b.classList.remove("active");
      b.setAttribute("aria-pressed", "false");
    });
    btn.classList.add("active");
    btn.setAttribute("aria-pressed", "true");
    modeRow.dataset.mode = btn.dataset.mode;
    modeRow.style.setProperty("--i", MODE_INDEX[btn.dataset.mode]);
    syncModeThumb();
    const thumbFill = modeRow.querySelector(".thumb-fill");
    if (thumbFill) {
      thumbFill.classList.remove("squash");
      void thumbFill.offsetWidth;
      thumbFill.classList.add("squash");
    }

    const oldMain = document.getElementById(MODES[currentMode].mainId);
    oldMain.classList.add("fade-out");

    setTimeout(()=>{
      oldMain.classList.add("hidden");
      oldMain.classList.remove("fade-out");

      currentMode = btn.dataset.mode;
      topbarEl.classList.toggle("mode-teform", currentMode === "teform");
      topbarEl.classList.toggle("mode-kanji", currentMode === "kanji");
      topbarEl.classList.toggle("mode-vidu", currentMode === "vidu");
      currentFilter = "all";
      document.querySelectorAll("#filterControls .chip[data-filter]").forEach(b=>{
        b.classList.toggle("active", b.dataset.filter === "all");
      });
      updateAllChipLabel(currentMode);
      const newMain = document.getElementById(MODES[currentMode].mainId);
      newMain.classList.remove("hidden");
      newMain.classList.add("fade-out");
      void newMain.offsetWidth;
      newMain.classList.remove("fade-out");

      setHero(currentMode, true);
      updateProgress(false);
      applyFilters();
    }, 220);
  });
});
setHero(currentMode, false);
updateAllChipLabel(currentMode);

/* ---------- Góc trái trên cùng: logo (về trang chủ) + nút 3 gạch (mở / đóng thanh chọn mode, tiến độ, lọc) ---------- */
const menuDock = document.getElementById("menuDock");
const menuToggle = document.getElementById("menuToggle");
const brandLogo = document.getElementById("brandLogo");
let menuCloseTimer = 0;

function isMenuOpen(){ return menuDock.classList.contains("open"); }
function setMenu(open){
  clearTimeout(menuCloseTimer);
  menuDock.classList.toggle("open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
}
menuToggle.addEventListener("click", () => setMenu(!isMenuOpen()));

// bấm ra ngoài thanh hoặc nhấn Esc thì đóng
document.addEventListener("pointerdown", (e) => {
  if(isMenuOpen() && !menuDock.contains(e.target)) setMenu(false);
});
document.addEventListener("keydown", (e) => {
  if(e.key === "Escape" && isMenuOpen()){ setMenu(false); menuToggle.focus({ preventScroll: true }); }
});

// chọn mode xong thì chờ viên thuốc trượt tới nơi (cho kịp nhìn hoạt ảnh) rồi tự đóng để thấy nội dung mới
modeRow.addEventListener("click", (e) => {
  if(!e.target.closest(".mode-btn")) return;
  clearTimeout(menuCloseTimer);
  menuCloseTimer = setTimeout(() => setMenu(false), 650);
});

// logo: về trang chủ (đầu trang, mode đang chọn giữ nguyên)
brandLogo.addEventListener("click", (e) => {
  e.preventDefault();
  setMenu(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.querySelectorAll("#filterControls .chip[data-filter]").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    document.querySelectorAll("#filterControls .chip[data-filter]").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    applyFilters();
  });
});

document.getElementById("toggleHide").addEventListener("click", (e)=>{
  hideCorrect = !hideCorrect;
  e.target.classList.toggle("active", hideCorrect);
  e.target.textContent = hideCorrect ? "Hiện câu đã đúng" : "Ẩn câu đã đúng";
  applyFilters();
});

document.getElementById("resetBtn").addEventListener("click", ()=>{
  const activeMain = document.getElementById(MODES[currentMode].mainId);
  activeMain.querySelectorAll(".card").forEach(card=>{
    card.classList.remove("correct","wrong","hidden","revealed");
    const input = card.querySelector("input");
    input.value = "";
    input.disabled = false;
    const rb = card.querySelector(".reveal-btn");
    if(rb) rb.disabled = false;
    const fb = card.querySelector(".fb");
    fb.textContent = "";
    fb.className = "fb";
    if(card._resetTries) card._resetTries();
  });
  correctCount[currentMode] = 0;
  if(doneIds[currentMode]){ doneIds[currentMode].clear(); persistProgress(); }
  updateProgress();
});

/* ---------- Vệt sáng kính đi theo con trỏ (nội suy mỗi khung hình cho mượt, không giật) ---------- */
(function(){
  const reduceGlow = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const glowState = new Map(); // element -> {tx,ty (đích), cx,cy (vị trí đang vẽ)}
  let glowRaf = 0;

  function glowLoop(){
    glowRaf = 0;
    let stillMoving = false;
    glowState.forEach((s, el) => {
      s.cx += (s.tx - s.cx) * 0.22;
      s.cy += (s.ty - s.cy) * 0.22;
      el.style.setProperty("--mx", s.cx.toFixed(1) + "px");
      el.style.setProperty("--my", s.cy.toFixed(1) + "px");
      if (Math.abs(s.tx - s.cx) > 0.3 || Math.abs(s.ty - s.cy) > 0.3) stillMoving = true;
      else glowState.delete(el);
    });
    if (stillMoving) glowRaf = requestAnimationFrame(glowLoop);
  }

  document.addEventListener("pointermove", (e)=>{
    const t = e.target.closest && e.target.closest(".card, .tf-row, .topbar");
    if(!t) return;
    const r = t.getBoundingClientRect();
    const tx = e.clientX - r.left, ty = e.clientY - r.top;
    if (reduceGlow){
      t.style.setProperty("--mx", tx + "px");
      t.style.setProperty("--my", ty + "px");
      return;
    }
    let s = glowState.get(t);
    if (!s){ s = { tx, ty, cx: tx, cy: ty }; glowState.set(t, s); }
    else { s.tx = tx; s.ty = ty; }
    if (!glowRaf) glowRaf = requestAnimationFrame(glowLoop);
  }, { passive: true });
})();


/* ==================== Chế độ Thể て ==================== */
// ===== Chế độ Thể て: không chấm điểm, làm lại từng câu =====
(function(){
  function normalizeRomaji(s){
    let x = s.toLowerCase().trim().replace(/[\s'\-]/g,'');
    const subs = [
      [/sya/g,'sha'],[/syu/g,'shu'],[/syo/g,'sho'],
      [/tya/g,'cha'],[/tyu/g,'chu'],[/tyo/g,'cho'],
      [/zya/g,'ja'],[/zyu/g,'ju'],[/zyo/g,'jo'],
      [/si/g,'shi'],[/ti/g,'chi'],[/tu/g,'tsu'],
      [/zi/g,'ji'],[/di/g,'ji'],[/du/g,'zu'],
      [/hu/g,'fu'],[/wo/g,'o'],
      [/tch/g,'cch']
    ];
    subs.forEach(([re,rep]) => { x = x.replace(re, rep); });
    x = x.replace(/ou/g,'o').replace(/uu/g,'u').replace(/ii/g,'i').replace(/ee/g,'e').replace(/aa/g,'a');
    return x;
  }

  const listEl = document.getElementById('tfList');
  const hintLine = document.getElementById('tfHint');
  const HINT_DEFAULT = hintLine.textContent;
  const HINT_ALL = 'Đã đi hết một lượt rồi, giỏi lắm! Muốn ôn lại thì bấm ↺ ở từng câu, hoặc "Làm lại từ đầu".';

  document.getElementById('tfTotal').textContent = て.length;

  let rows = [], inputs = [], fbEls = [], eyeBtns = [], done = [];
  let tries = [], lastWrongVal = []; // số lần sai (khác nhau) của từng câu, để hiện gợi ý chữ đầu
  const tfId = (i) => i + "|" + て[i][0]; // id lưu tiến độ

  // chỉ đếm số câu đã đi qua cho thanh tiến độ, không phân biệt đúng / sai
  function updateScore(){
    correctCount.teform = done.filter(Boolean).length;
    hintLine.textContent = (done.length && done.every(Boolean)) ? HINT_ALL : HINT_DEFAULT;
    updateProgress();
  }

  function buildList(){
    listEl.innerHTML = '';
    rows = []; inputs = []; fbEls = []; eyeBtns = [];
    done = new Array(て.length).fill(false);
    tries = []; lastWrongVal = [];

    て.forEach((item, i) => {
      const [kana, meta, kanaAnswer, romajiAnswer] = item;
      const row = document.createElement('div');
      row.className = 'tf-row';

      const no = document.createElement('div');
      no.className = 'tf-no';
      no.textContent = (i+1) + '.';

      const prompt = document.createElement('div');
      prompt.className = 'tf-prompt';
      const kanaEl = document.createElement('span');
      kanaEl.className = 'tf-kana';
      kanaEl.lang = 'ja';
      kanaEl.textContent = kana;
      prompt.appendChild(kanaEl);
      if (meta){
        const metaEl = document.createElement('span');
        metaEl.className = 'tf-meta';
        metaEl.textContent = `(${meta})`;
        prompt.appendChild(metaEl);
      }

      const input = document.createElement('input');
      input.type = 'text';
      input.autocomplete = 'off';
      input.autocapitalize = 'off';
      input.spellcheck = false;
      input.placeholder = 'romaji';
      input.setAttribute('aria-label', `Thể て của ${kana}`);

      const eyeBtn = makeRevealBtn();
      eyeBtn.title = 'Xem đáp án';
      eyeBtn.addEventListener('click', () => reveal(i));

      const ans = document.createElement('div');
      ans.className = 'tf-ans';
      ans.appendChild(input);
      ans.appendChild(eyeBtn);

      // cột phải: lời nhắn nhẹ / đáp án + nút làm lại riêng câu này
      const side = document.createElement('div');
      side.className = 'tf-side';
      const fb = document.createElement('div');
      fb.className = 'tf-fb';
      const redoBtn = document.createElement('button');
      redoBtn.type = 'button';
      redoBtn.className = 'tf-redo';
      redoBtn.textContent = '↺ Làm lại câu này';
      redoBtn.title = 'Xoá đáp án và làm lại riêng câu này';
      redoBtn.addEventListener('click', () => redo(i));
      side.appendChild(fb);
      side.appendChild(redoBtn);

      row.appendChild(no);
      row.appendChild(prompt);
      row.appendChild(ans);
      row.appendChild(side);
      listEl.appendChild(row);

      rows.push(row);
      inputs.push(input);
      fbEls.push(fb);
      eyeBtns.push(eyeBtn);

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.isComposing){
          e.preventDefault();
          checkAnswer(i, romajiAnswer);
        }
      });
      input.addEventListener('input', () => {
        // gõ lại thì xoá lời nhắn cũ cho đỡ rối mắt
        if (rows[i].classList.contains('nudge')){
          rows[i].classList.remove('nudge');
          fbEls[i].textContent = '';
        }
        input.classList.remove('typing');
        void input.offsetWidth; // ép trình duyệt tính lại để animation chạy lại mỗi lần gõ
        input.classList.add('typing');
      });
    });

    // khôi phục các câu đã làm từ lần trước (đồng thời bỏ những id không còn trong dữ liệu)
    const valid = {};
    て.forEach((item, i) => {
      const st = tfState[tfId(i)];
      if (st !== 'c' && st !== 'r') return;
      valid[tfId(i)] = st;
      lock(i, st === 'c' ? 'correct' : 'revealed', true);
      fbEls[i].className = 'tf-fb';
      if (st === 'c'){
        inputs[i].value = item[3];
        fbEls[i].textContent = 'tạm';
      } else {
        fbEls[i].textContent = `Đáp án: ${item[3]} (${item[2]})`;
      }
    });
    Object.keys(tfState).forEach(k => delete tfState[k]);
    Object.assign(tfState, valid);

    updateScore();
  }

  function focusNext(from){
    for (let j = from+1; j < て.length; j++){
      if (!done[j]){
        inputs[j].focus({ preventScroll: true });
        // chỉ cuộn khi ô kế tiếp bị thanh trên cùng che hoặc nằm ngoài màn hình
        const r = rows[j].getBoundingClientRect();
        if (r.top < 150 || r.bottom > window.innerHeight - 16){
          rows[j].scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        return;
      }
    }
  }

  function lock(i, cls, silent){
    done[i] = true;
    rows[i].classList.remove('nudge', 'wrong');
    rows[i].classList.add(cls);
    inputs[i].disabled = true;
    eyeBtns[i].disabled = true;
    if (!silent){ // silent = đang khôi phục từ localStorage, khỏi ghi lại
      tfState[tfId(i)] = (cls === 'correct') ? 'c' : 'r';
      persistProgress();
    }
  }

  // xem đáp án: chỉ hiện đáp án nhẹ nhàng (màu tím), không tính đúng / sai; có nút làm lại riêng câu này
  function reveal(i){
    if (done[i]) return;
    const kanaAnswer = て[i][2], romajiAnswer = て[i][3];
    lock(i, 'revealed');
    fbEls[i].className = 'tf-fb';
    fbEls[i].textContent = `Đáp án: ${romajiAnswer} (${kanaAnswer})`;
    updateScore();
    focusNext(i);
  }

  // làm lại đúng câu này, không đụng tới các câu khác
  function redo(i){
    done[i] = false;
    tries[i] = 0; lastWrongVal[i] = '';
    delete tfState[tfId(i)];
    persistProgress();
    rows[i].classList.remove('revealed', 'correct', 'nudge', 'wrong');
    inputs[i].value = '';
    inputs[i].disabled = false;
    eyeBtns[i].disabled = false;
    fbEls[i].className = 'tf-fb';
    fbEls[i].textContent = '';
    updateScore();
    inputs[i].focus({ preventScroll: true });
  }

  function checkAnswer(i, romajiAnswer){
    if (done[i]) return;
    const raw = inputs[i].value.trim();
    if (!raw) return;

    if (normalizeRomaji(raw) === normalizeRomaji(romajiAnswer)){
      lock(i, 'correct');
      fbEls[i].className = 'tf-fb';
      fbEls[i].textContent = 'tạm';
      updateScore();
      focusNext(i);
    } else {
      // sai thì lắc + đỏ lên + "non vl" như các mode khác, cho gõ lại, không khoá
      rows[i].classList.add('nudge');
      rows[i].classList.remove('wrong');
      void rows[i].offsetWidth;
      rows[i].classList.add('wrong');
      if (raw !== lastWrongVal[i]){ lastWrongVal[i] = raw; tries[i] = (tries[i] || 0) + 1; }
      const hint = tries[i] >= 2 ? firstLetterHint([romajiAnswer]) : '';
      fbEls[i].className = 'tf-fb no';
      fbEls[i].textContent = hint ? `non vl · ${hint}` : 'non vl';
      setTimeout(() => rows[i].classList.remove('wrong'), 420);
    }
  }

  document.getElementById('tfRetry').addEventListener('click', () => {
    Object.keys(tfState).forEach(k => delete tfState[k]); // làm lại từ đầu: xoá tiến độ đã lưu của mode này
    persistProgress();
    buildList();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    inputs[0].focus({ preventScroll: true });
  });

  buildList();
  // đã làm hết Thể て từ lần trước thì không bắn pháo giấy khi mở trang / chuyển mode
  if (MODE_TOTALS.teform > 0 && correctCount.teform >= MODE_TOTALS.teform) celebratedModes.add('teform');
})();


/* ==================== Hiệu ứng trượt thẻ + hero ==================== */
/* Thẻ trượt ra/vào hai bên theo chiều cuộn (lặp lại mỗi lần lướt qua) + hiệu ứng lia chuột cho hero */
(function(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /* ---------- 1. Thẻ trượt vào / thu ra ---------- */
  if ('IntersectionObserver' in window){
    const SEL = '.card, .tf-row, .section-title';
    const curTx = (el) => {
      const t = getComputedStyle(el).translate;
      return t && t !== 'none' ? (parseFloat(t) || 0) : 0;
    };

    // rootMargin: trên -12% để thẻ thu về hai bên ngay khi lướt qua; hai bên +100% để thẻ đang nằm ngoài màn hình vẫn được theo dõi
    const io = new IntersectionObserver((entries) => {
      const vw = document.documentElement.clientWidth;
      const enter = [];
      entries.forEach(e => {
        const el = e.target;
        if (e.intersectionRatio >= 0.1){
          if (el.classList.contains('rv-out')) enter.push(e);
        } else {
          el.classList.add('rv-out');
        }
      });
      if (!enter.length) return;

      enter.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      const plan = enter.map((e, i) => {
        const el = e.target, r = e.boundingClientRect, tx = curTx(el);
        const left = r.left - tx, right = r.right - tx;   // vị trí gốc, bỏ phần đang dịch chuyển
        let fromLeft = true, mid = false;
        if (el.classList.contains('card')){
          // xác định cột của thẻ trong lưới: cột trái trượt sang trái, cột phải sang phải, cột giữa (nếu số cột lẻ) thu nhỏ tại chỗ
          const g = el.parentNode, gr = g.getBoundingClientRect();
          const n = Math.max(1, getComputedStyle(g).gridTemplateColumns.split(' ').length);
          const col = Math.min(n - 1, Math.max(0, Math.floor(((left + right) / 2 - gr.left) / gr.width * n)));
          mid = n > 1 && n % 2 === 1 && col === (n - 1) / 2;
          fromLeft = col < n / 2;
        }
        else if (el.classList.contains('tf-row')) fromLeft = Array.prototype.indexOf.call(el.parentNode.children, el) % 2 === 0;
        const dist = Math.min(900, fromLeft ? right + 24 : vw - left + 24);
        return { el, mid, rx: (mid ? 0 : fromLeft ? -dist : dist) + 'px', rd: Math.min(i, 6) * 25 + 'ms' };
      });

      // đặt lại điểm xuất phát (không animation) rồi mới cho trượt vào
      plan.forEach(p => {
        p.el.style.transition = 'none';
        p.el.style.setProperty('--rx', p.rx);
        p.el.style.setProperty('--rd', p.rd);
        p.el.classList.toggle('rv-mid', p.mid);
      });
      void document.body.offsetWidth;
      plan.forEach(p => {
        p.el.style.transition = '';
        p.el.classList.remove('rv-out');
      });
    }, { threshold: 0.1, rootMargin: '-12% 100% -4% 100%' });

    const track = (el) => {
      if (el.dataset.rv) return;
      el.dataset.rv = '1';
      el.classList.add('rvx', 'rv-out');
      io.observe(el);
    };
    const scan = (root) => {
      if (root.nodeType !== 1) return;
      if (root.matches(SEL)) track(root);
      root.querySelectorAll(SEL).forEach(track);
    };

    scan(document.body);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(scan)))
      .observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- 2. Hero: đèn rọi + orb nghiêng theo chuột ---------- */
  const hero = document.querySelector('.hero');
  if (hero){
    let raf = 0, px = 0.5, py = 0.5;
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width;
      py = (e.clientY - r.top) / r.height;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        hero.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        hero.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        hero.style.setProperty('--ox', (px * 2 - 1).toFixed(3));
        hero.style.setProperty('--oy', (py * 2 - 1).toFixed(3));
      });
    });
    hero.addEventListener('pointerleave', () => {
      hero.style.setProperty('--ox', 0);
      hero.style.setProperty('--oy', 0);
    });
  }
})();

/* ---------- Chuyển giao diện Sáng / Tối (giữ chất liệu kính lỏng) ---------- */
(() => {
  const THEME_KEY = 'nihongo-theme';
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');
  const metaColor = document.getElementById('themeColorMeta');
  if (!btn) return;

  const colorFor = (t) => (t === 'dark' ? '#2A2250' : '#F5F2EC');

  const applyMeta = (t) => {
    if (metaColor) metaColor.setAttribute('content', colorFor(t));
    btn.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
  };

  applyMeta(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

  btn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyMeta(next);
  });

  // Nếu người dùng chưa từng chọn thủ công, theo hệ thống khi hệ thống đổi
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e) => {
      if (localStorage.getItem(THEME_KEY)) return; // đã chọn thủ công thì không tự đổi nữa
      const t = e.matches ? 'dark' : 'light';
      root.setAttribute('data-theme', t);
      applyMeta(t);
    });
  } catch (e) {}
})();

/* ---------- Nền trôi nhẹ theo con trỏ (song song toàn trang, nội suy mượt) ---------- */
(function(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const bg = document.querySelector('.bg');
  if (!bg) return;
  let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
  function loop(){
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    bg.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
    if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05){
      raf = requestAnimationFrame(loop);
    } else {
      raf = 0;
    }
  }
  window.addEventListener('pointermove', (e) => {
    tx = (e.clientX / window.innerWidth - 0.5) * 26;
    ty = (e.clientY / window.innerHeight - 0.5) * 26;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
})();

/* ---------- Hiệu ứng gợn sóng khi bấm nút, tăng độ "đã tay" cho mọi thao tác ---------- */
(function(){
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const SEL = '.chip, .mode-btn, .theme-toggle, .menu-toggle, .shuffle-btn, .reveal-btn, .retry-btn, .tf-redo';
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest && e.target.closest(SEL);
    if (!btn || btn.disabled) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 1.3;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = (e.clientX - r.left - size / 2) + 'px';
    ripple.style.top = (e.clientY - r.top - size / 2) + 'px';
    if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
    // Dùng overflow:clip (nếu trình duyệt hỗ trợ): vẫn cắt gợn sóng nhưng KHÔNG làm nút co lại.
    // Với overflow:hidden, nút nằm trong lưới 1fr (thanh chọn mode) mất kích thước tối thiểu => co lại khi vừa chạm,
    // kéo theo nút bên cạnh trượt vào dưới ngón tay nên cú bấm bị mất.
    btn.style.overflow = 'hidden';
    btn.style.overflow = 'clip';
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  }, { passive: true });
})();
