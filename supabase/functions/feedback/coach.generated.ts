// src/lib/spell.ts
import nspell from "npm:nspell@2.1.5";
import dictionary from "npm:dictionary-en@4.0.0";
var speller;
var ALLOW = /* @__PURE__ */ new Set([
  "ok",
  "okay",
  "yay",
  "uh",
  "um",
  "mom",
  "dad",
  "grandma",
  "grandpa",
  "puppy",
  "kitty",
  "selfie",
  "emoji",
  "online",
  "website",
  "backpack"
]);
function init() {
  if (!speller) speller = nspell(dictionary);
  return speller;
}
function isMisspelled(word) {
  const s = init();
  if (!s) return false;
  const w = word.trim();
  if (w.length < 3) return false;
  if (/\d/.test(w)) return false;
  if (ALLOW.has(w.toLowerCase())) return false;
  if (s.correct(w)) return false;
  if (s.correct(w.toLowerCase())) return false;
  return true;
}
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}
function sharedPrefix(a, b) {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}
function suggestions(word, max = 3) {
  const s = init();
  if (!s) return [];
  const raw = s.suggest(word);
  if (!raw.length) return [];
  const lower = word.toLowerCase();
  const scored = raw.filter((cand) => !cand.includes("'") && !cand.includes(" ")).map((cand) => {
    const cl = cand.toLowerCase();
    const dist = editDistance(lower, cl);
    const prefix = sharedPrefix(lower, cl);
    const lenGap = Math.abs(cand.length - word.length) * 0.3;
    const score = dist - prefix * 0.6 + lenGap + (cl[0] === lower[0] ? 0 : 3);
    return { cand, score };
  });
  scored.sort((a, b) => a.score - b.score);
  const out = [];
  for (const { cand } of scored) {
    if (!out.some((o) => o.toLowerCase() === cand.toLowerCase())) out.push(cand);
    if (out.length >= max) break;
  }
  return out;
}

// src/lib/diagnostics.ts
var CONTRACTIONS = {
  dont: "don't",
  didnt: "didn't",
  cant: "can't",
  wont: "won't",
  isnt: "isn't",
  arent: "aren't",
  wasnt: "wasn't",
  werent: "weren't",
  couldnt: "couldn't",
  shouldnt: "shouldn't",
  wouldnt: "wouldn't",
  hasnt: "hasn't",
  havent: "haven't",
  hadnt: "hadn't",
  doesnt: "doesn't",
  im: "I'm",
  ive: "I've",
  youre: "you're",
  youve: "you've",
  youll: "you'll",
  theyre: "they're",
  theyve: "they've",
  theyll: "they'll",
  whats: "what's",
  thats: "that's",
  theres: "there's",
  heres: "here's",
  hes: "he's",
  shes: "she's",
  weve: "we've",
  weren: "weren't"
};
function contractionNote(original, fixed) {
  if (fixed.toLowerCase() === "it's")
    return `Don't forget the apostrophe. \u201CIt's\u201D is short for \u201Cit is.\u201D`;
  return `Don't forget the apostrophe. \u201C${fixed}\u201D is the correct contraction.`;
}
var SPELLINGS = {
  relized: "realized",
  realy: "really",
  definately: "definitely",
  seperate: "separate",
  recieve: "receive",
  beleive: "believe",
  freind: "friend",
  wich: "which",
  becuase: "because",
  becasue: "because",
  thier: "their",
  tommorow: "tomorrow",
  tomorow: "tomorrow",
  untill: "until",
  occured: "occurred",
  embarass: "embarrass",
  goverment: "government",
  suprise: "surprise",
  surprize: "surprise",
  wierd: "weird",
  finaly: "finally",
  happend: "happened",
  remeber: "remember",
  probaly: "probably",
  probly: "probably",
  favroite: "favorite",
  enviroment: "environment",
  alot: "a lot",
  excaped: "escaped",
  scaryed: "scared",
  scnce: "science",
  beutiful: "beautiful",
  dissagree: "disagree",
  intresting: "interesting",
  carefull: "careful",
  usefull: "useful",
  foward: "forward"
};
var WORD_FORMS = [
  { re: /\b(s?suppose|spose)\s+to\b/gi, fix: () => "supposed to", note: "the phrase is \u201Csupposed to.\u201D" },
  { re: /\buse\s+to\b/gi, fix: () => "used to", note: "the phrase is \u201Cused to.\u201D" },
  { re: /\bshould\s+of\b/gi, fix: () => "should have", note: "it\u2019s \u201Cshould have,\u201D not \u201Cshould of.\u201D" },
  { re: /\bcould\s+of\b/gi, fix: () => "could have", note: "it\u2019s \u201Ccould have,\u201D not \u201Ccould of.\u201D" },
  { re: /\bwould\s+of\b/gi, fix: () => "would have", note: "it\u2019s \u201Cwould have,\u201D not \u201Cwould of.\u201D" },
  { re: /\bmust\s+of\b/gi, fix: () => "must have", note: "it\u2019s \u201Cmust have,\u201D not \u201Cmust of.\u201D" }
];
var PAST_OF = {
  find: "found",
  see: "saw",
  go: "went",
  come: "came",
  take: "took",
  give: "gave",
  know: "knew",
  think: "thought",
  say: "said",
  tell: "told",
  get: "got",
  feel: "felt",
  hear: "heard",
  leave: "left",
  begin: "began",
  eat: "ate",
  drink: "drank",
  stand: "stood",
  sit: "sat",
  win: "won",
  hold: "held",
  ride: "rode",
  run: "ran",
  swim: "swam",
  fall: "fell",
  break: "broke",
  choose: "chose",
  speak: "spoke",
  write: "wrote",
  bring: "brought",
  buy: "bought",
  catch: "caught",
  teach: "taught"
};
var TENSE_BLOCKERS = /* @__PURE__ */ new Set([
  "to",
  "will",
  "would",
  "can",
  "could",
  "shall",
  "should",
  "may",
  "might",
  "must",
  "do",
  "does",
  "did",
  "dont",
  "didnt",
  "not",
  "never",
  "always",
  "usually",
  "often",
  "let",
  "lets",
  "please",
  "wo",
  "ca"
]);
var NON_PLURAL_S = /* @__PURE__ */ new Set([
  "this",
  "his",
  "is",
  "as",
  "has",
  "was",
  "us",
  "yes",
  "plus",
  "thus",
  "class",
  "glass",
  "grass",
  "dress",
  "press",
  "less",
  "mess",
  "kiss",
  "miss",
  "boss",
  "loss",
  "cross",
  "address",
  "business",
  "christmas",
  "news",
  "always",
  "perhaps",
  "series",
  "species",
  "focus",
  "virus",
  "status",
  "bonus",
  "campus",
  "octopus",
  "famous",
  "nervous",
  "serious",
  "jealous",
  "delicious",
  "across",
  "unless",
  "hers",
  "ours",
  "yours",
  "its",
  "lens",
  "bus",
  "gas",
  "chaos"
]);
var VERB_SIGNALS = /* @__PURE__ */ new Set([
  "is",
  "am",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "has",
  "have",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "can",
  "could",
  "shall",
  "should",
  "may",
  "might",
  "must",
  "like",
  "likes",
  "liked",
  "want",
  "wants",
  "wanted",
  "go",
  "goes",
  "went",
  "gone",
  "see",
  "sees",
  "saw",
  "say",
  "said",
  "get",
  "got",
  "make",
  "made",
  "made",
  "take",
  "took",
  "come",
  "came",
  "run",
  "ran",
  "feel",
  "felt",
  "think",
  "thought",
  "know",
  "knew",
  "look",
  "looked",
  "find",
  "found",
  "tell",
  "told",
  "ask",
  "asked",
  "work",
  "worked",
  "play",
  "played",
  "help",
  "helped",
  "need",
  "needs",
  "needed",
  "use",
  "used",
  "try",
  "tried",
  "start",
  "started",
  "turn",
  "turned",
  "walk",
  "walked",
  "talk",
  "talked",
  "eat",
  "ate",
  "drink",
  "drank",
  "give",
  "gave",
  "leave",
  "left",
  "stay",
  "stayed",
  "keep",
  "kept",
  "let",
  "put",
  "sit",
  "sat",
  "stand",
  "stood",
  "win",
  "won",
  "lose",
  "lost",
  "hold",
  "held",
  "open",
  "opened",
  "close",
  "closed",
  "love",
  "loved",
  "hate",
  "hated",
  "live",
  "lived"
]);
var SUBORDINATORS = /* @__PURE__ */ new Set([
  "because",
  "although",
  "though",
  "since",
  "while",
  "whereas",
  "unless",
  "until",
  "whenever",
  "wherever"
]);
function cap(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
function splitSentences(text) {
  const chunks = text.match(/[^.!?]+[.!?]*/g) ?? [];
  return chunks.map((c) => c.trim()).filter(Boolean).map((t) => ({
    text: t,
    words: t.replace(/[^A-Za-z'\s]/g, " ").split(/\s+/).filter(Boolean)
  }));
}
function hasVerb(words) {
  const lower = words.map((w) => w.toLowerCase());
  for (let i = 0; i < lower.length; i++) {
    const w = lower[i];
    if (VERB_SIGNALS.has(w)) return true;
    if (w.length > 3 && (w.endsWith("ed") || w.endsWith("ing"))) return true;
    if (w === "to" && i + 1 < lower.length) return true;
    if (/'(t|s|re|ve|ll|d|m)$/.test(w)) return true;
    if (CONTRACTIONS[w]) return true;
  }
  return false;
}
function diagnose(rawText) {
  const text = rawText.replace(/\s+/g, " ").trim();
  const sentences = splitSentences(rawText);
  const issues = [];
  const seen = /* @__PURE__ */ new Set();
  const MIN_CONFIDENCE = 0.76;
  const add = (issue) => {
    const confidence = issue.confidence ?? 0.9;
    if (confidence < MIN_CONFIDENCE) return;
    const key = `${issue.category}:${issue.original.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({ ...issue, confidence });
  };
  const pastHits = (text.match(/\b(was|were|had|did|went|saw|came|took|got|said|felt|knew|thought|looked|turned|walked|ran|made|told|left|began|found)\b/gi) || []).length + (text.match(/\b\w{3,}ed\b/gi) || []).length;
  const pastTense = pastHits >= 2;
  for (const m of text.matchAll(/\b([A-Za-z]+)\b/g)) {
    const word = m[1];
    const fix = CONTRACTIONS[word.toLowerCase()];
    if (fix) {
      add({
        category: "contraction",
        original: word,
        suggestion: /^[A-Z]/.test(word) ? cap(fix) : fix,
        note: contractionNote(word, /^[A-Z]/.test(word) ? cap(fix) : fix),
        severity: 2,
        confidence: 0.98
      });
    }
  }
  for (const s of sentences) {
    const tokens = s.text.match(/[A-Za-z][A-Za-z']*/g) ?? [];
    tokens.forEach((tok, idx) => {
      if (tok.includes("'")) return;
      const lower = tok.toLowerCase();
      if (CONTRACTIONS[lower]) return;
      const known = SPELLINGS[lower];
      if (known) {
        const fixed = /^[A-Z]/.test(tok) ? cap(known) : known;
        add({
          category: "spelling",
          original: tok,
          suggestion: fixed,
          note: `This word is spelled \u201C${fixed}.\u201D`,
          severity: 2,
          confidence: 0.98,
          options: [fixed]
        });
        return;
      }
      if (idx > 0 && /^[A-Z]/.test(tok)) return;
      if (isMisspelled(tok)) {
        const isCap = /^[A-Z]/.test(tok);
        const cands = suggestions(tok, 2).map((c) => isCap ? cap(c) : c).filter((c) => c.toLowerCase() !== lower);
        if (cands.length) {
          add({
            category: "spelling",
            original: tok,
            suggestion: cands[0],
            note: cands.length >= 2 ? `Spelling \u2014 did you mean \u201C${cands[0]}\u201D or \u201C${cands[1]}?\u201D` : `This word is spelled \u201C${cands[0]}.\u201D`,
            severity: 2,
            confidence: 0.82,
            options: cands
          });
        }
      }
    });
  }
  for (const { re, fix, note } of WORD_FORMS) {
    for (const m of text.matchAll(re)) {
      const original = m[0];
      add({
        category: "word_form",
        original,
        suggestion: fix(original),
        note: `Use ${note}`,
        severity: 3,
        confidence: 0.92
      });
    }
  }
  const CONFUSABLES = [
    { re: /\byour\s+welcome\b/gi, fix: "you're welcome", cat: "contraction", note: "Don't forget the apostrophe. \u201CYou're\u201D is short for \u201Cyou are.\u201D", confidence: 0.96 },
    { re: /\byour\s+(gonna|going to)\b/gi, fix: "you're $1", cat: "contraction", note: "Don't forget the apostrophe. \u201CYou're\u201D is short for \u201Cyou are.\u201D", confidence: 0.94 },
    { re: /\btheir\s+(is|are|was|were)\b/gi, fix: "there $1", cat: "context_word", note: "Use \u201Cthere\u201D when you mean \u201Cthere is\u201D or \u201Cthere are.\u201D", confidence: 0.95 },
    { re: /\bthere\s+own\b/gi, fix: "their own", cat: "context_word", note: "Use \u201Ctheir\u201D when something belongs to them.", confidence: 0.98 },
    { re: /\bthere\s+(favorite|family|friend|friends|teacher|teachers|parent|parents|mom|dad|brother|sister|house|home|school|class|team|book|books|story|stories|idea|ideas|reason|reasons|toy|toys|world|work|homework|project|projects|writing|dog|cat|room|game|games)\b/gi, fix: "their $1", cat: "context_word", note: "Use \u201Ctheir\u201D when something belongs to someone.", confidence: 0.9 },
    { re: /\bthere\s+(comfy|cozy|happy|sad|ready|right|wrong|nice|kind|mean|funny|tired|hungry|excited|scared|warm|cold|hot)\b/gi, fix: "they're $1", cat: "context_word", note: "Use \u201Cthey\u2019re\u201D when you mean \u201Cthey are.\u201D", confidence: 0.96 },
    { re: /\bto\s+(much|many|late|early|hard|big|small|hot|cold|fast|slow)\b/gi, fix: "too $1", cat: "context_word", note: "Use \u201Ctoo\u201D here because it means \u201Cmore than enough.\u201D", confidence: 0.94 },
    { re: /\bme\s+to([.!?]|$)/gi, fix: "me too$1", cat: "context_word", note: "Use \u201Ctoo\u201D when it means \u201Calso.\u201D", confidence: 0.95 },
    { re: /\b(more|less|better|worse|bigger|smaller|faster|slower|taller|shorter|older|younger|greater|fewer|longer|higher|lower|stronger|nicer|happier|easier|harder|rather)\s+then\b/gi, fix: "$1 than", cat: "context_word", note: "Use \u201Cthan\u201D when comparing.", confidence: 0.95 },
    { re: /\bits\s+(a|an|the|been|going|gonna|not|so|very|really|time|my)\b/gi, fix: "it's $1", cat: "contraction", note: "Don't forget the apostrophe. \u201CIt's\u201D is short for \u201Cit is.\u201D", confidence: 0.96 }
  ];
  for (const { re, fix, cat, note, confidence } of CONFUSABLES) {
    for (const m of text.matchAll(re)) {
      const suggestion = fix.replace(/\$(\d)/g, (_, n) => m[Number(n)] ?? "");
      if (suggestion.toLowerCase() === m[0].toLowerCase()) continue;
      add({
        category: cat,
        original: m[0].trim(),
        suggestion: suggestion.trim(),
        note,
        severity: 2.5,
        confidence: confidence ?? 0.9
      });
    }
  }
  for (const m of text.matchAll(/\b([A-Za-z]+)\s+and\s+(I|[A-Za-z]+)\s+(was)\b/gi)) {
    add({
      category: "subject_verb",
      original: m[0],
      suggestion: m[0].replace(/was$/i, "were"),
      note: `That's more than one person, so use \u201Cwere.\u201D`,
      severity: 3
    });
  }
  const IRREGULAR_PLURAL = /* @__PURE__ */ new Set([
    "children",
    "people",
    "men",
    "women",
    "feet",
    "teeth",
    "mice",
    "geese",
    "oxen",
    "police",
    "cattle",
    "fish",
    "sheep",
    "deer"
  ]);
  for (const m of text.matchAll(/\b(the|a|an|this|that|my|your|his|her|its|our|their|one)\s+([A-Za-z]+)\s+(were)\b/gi)) {
    const noun = m[2].toLowerCase();
    if (noun.endsWith("s") || IRREGULAR_PLURAL.has(noun)) continue;
    add({
      category: "subject_verb",
      original: `${m[2]} were`,
      suggestion: `${m[2]} was`,
      note: `There's just one ${noun}, so use \u201Cwas.\u201D`,
      severity: 3
    });
  }
  for (const m of text.matchAll(/\b(he|she|it)\s+(were)\b/gi)) {
    add({
      category: "subject_verb",
      original: m[0],
      suggestion: `${m[1]} was`,
      note: `\u201C${m[1]}\u201D takes \u201Cwas,\u201D not \u201Cwere.\u201D`,
      severity: 3
    });
  }
  const BASE_VERBS = /* @__PURE__ */ new Set([
    "lick",
    "jump",
    "run",
    "walk",
    "play",
    "look",
    "want",
    "need",
    "eat",
    "help",
    "work",
    "talk",
    "open",
    "close",
    "love",
    "hate",
    "live",
    "stay",
    "keep",
    "turn",
    "start",
    "stop",
    "call",
    "ask",
    "move",
    "smile",
    "cry",
    "laugh",
    "bark",
    "wag",
    "sit",
    "stand",
    "wave",
    "wish",
    "hope",
    "kick",
    "throw",
    "catch",
    "hug",
    "grab",
    "climb",
    "chase",
    "bite",
    "sniff"
  ]);
  for (const m of text.matchAll(/\b(he|she|it)\s+([a-z]+)\b/g)) {
    const verb = m[2].toLowerCase();
    if (!BASE_VERBS.has(verb)) continue;
    const past = PAST_OF[verb] ?? (verb.endsWith("e") ? `${verb}d` : `${verb}ed`);
    const fixedVerb = pastTense ? past : `${verb}s`;
    add({
      category: "subject_verb",
      original: m[0],
      suggestion: `${m[1]} ${fixedVerb}`,
      note: pastTense ? `Your story is in the past, so \u201C${verb}\u201D becomes \u201C${past}.\u201D` : `\u201C${m[1]}\u201D needs \u201C${fixedVerb}.\u201D`,
      severity: 3
    });
  }
  for (const m of text.matchAll(/\b(they|we|you)\s+(was)\b/gi)) {
    add({
      category: "subject_verb",
      original: m[0],
      suggestion: `${m[1]} were`,
      note: `\u201C${m[1]}\u201D takes \u201Cwere,\u201D not \u201Cwas.\u201D`,
      severity: 3
    });
  }
  for (const m of text.matchAll(/(\bif\s+|\bwish\s+|^)?\bI\s+were\b/gi)) {
    if (m[1]) continue;
    add({
      category: "subject_verb",
      original: "I were",
      suggestion: "I was",
      note: `\u201CI\u201D takes \u201Cwas\u201D here.`,
      severity: 3
    });
  }
  for (const m of text.matchAll(/\b([A-Za-z]{3,}s)\s+(was)\b/gi)) {
    const noun = m[1];
    if (NON_PLURAL_S.has(noun.toLowerCase())) continue;
    add({
      category: "subject_verb",
      original: `${noun} was`,
      suggestion: `${noun} were`,
      note: `\u201C${noun}\u201D is more than one, so it takes \u201Cwere.\u201D`,
      severity: 3
    });
  }
  if (pastTense) {
    const pastKeys = Object.keys(PAST_OF).join("|");
    const re = new RegExp(
      `\\b(I|he|she|we|they|you)\\s+((?:[A-Za-z]+\\s+){0,2}?)(${pastKeys})\\b`,
      "gi"
    );
    for (const m of text.matchAll(re)) {
      const middle = m[2].trim().toLowerCase().split(/\s+/).filter(Boolean);
      const verb = m[3].toLowerCase();
      const past = PAST_OF[verb];
      if (!past) continue;
      if (middle.some((w) => TENSE_BLOCKERS.has(w))) continue;
      const original = `${m[1]} ${m[2]}${m[3]}`.replace(/\s+/g, " ").trim();
      add({
        category: "verb_tense",
        original,
        suggestion: original.replace(new RegExp(`${m[3]}$`), past),
        note: `Your story is in the past, so \u201C${verb}\u201D becomes \u201C${past}.\u201D`,
        severity: 3
      });
    }
  }
  for (const s of sentences) {
    const first = s.text.match(/[A-Za-z]/);
    if (first && first[0] >= "a" && first[0] <= "z") {
      const firstWord = s.text.split(/\s+/)[0];
      add({
        category: "capitalization",
        original: firstWord,
        suggestion: cap(firstWord),
        note: `Sentences start with a capital letter.`,
        severity: 1.5
      });
    }
  }
  for (const _m of text.matchAll(/(^|[\s"'(])i([\s.,!?;:"')]|$)/g)) {
    add({
      category: "capitalization",
      original: "i",
      suggestion: "I",
      note: `The word \u201CI\u201D is always capitalized.`,
      severity: 1.5
    });
    break;
  }
  const PRECEDE_OK = /* @__PURE__ */ new Set([
    "and",
    "but",
    "or",
    "so",
    "that",
    "when",
    "if",
    "because",
    "while",
    "as",
    "than",
    "then",
    "where",
    "what",
    "which",
    "since",
    "before",
    "after",
    "though",
    "although",
    "unless",
    "until",
    "think",
    "thought",
    "know",
    "knew",
    "said",
    "say",
    "says",
    "hope",
    "wish",
    "guess",
    "believe",
    "bet",
    "see",
    "saw",
    "feel",
    "felt",
    "heard",
    "hear",
    "told",
    "tell",
    "wonder",
    "remember",
    "realized",
    "decided",
    "hoped",
    "time",
    "day",
    "why"
  ]);
  for (const m of text.matchAll(/\b([A-Za-z]+)\s+(I|He|She|They|We)\s+([a-z]+)/g)) {
    const prev = m[1];
    if (/^[A-Z]/.test(prev)) continue;
    if (PRECEDE_OK.has(prev.toLowerCase())) continue;
    add({
      category: "end_punctuation",
      original: `${m[1]} ${m[2]} ${m[3]}`,
      suggestion: `${m[1]}. ${m[2]} ${m[3]}`,
      note: `This looks like two sentences \u2014 add a period before \u201C${m[2]}.\u201D`,
      severity: 2.5
    });
  }
  if (text && !/[.!?]"?$/.test(text)) {
    const last = sentences[sentences.length - 1];
    if (last && last.words.length >= 3) {
      add({
        category: "end_punctuation",
        original: last.text.slice(-40),
        suggestion: `${last.text.replace(/[.!?]*$/, "")}.`,
        note: `End this sentence with a period.`,
        severity: 1.5
      });
    }
  }
  const fragments = [];
  for (const s of sentences) {
    const n = s.words.length;
    if (n < 3) continue;
    const firstLower = s.words[0]?.toLowerCase();
    const hasComma = s.text.includes(",");
    const startsSubordinate = SUBORDINATORS.has(firstLower ?? "");
    const noVerb = !hasVerb(s.words) && startsSubordinate && n >= 3 && n <= 10;
    const danglingClause = startsSubordinate && !hasComma && n >= 4 && n <= 12;
    if (noVerb || danglingClause) {
      fragments.push(s);
      add({
        category: "fragment",
        original: s.text,
        suggestion: danglingClause ? `Join it to a full sentence, e.g. \u201C${s.text.replace(/[.!?]*$/, "")}, \u2026\u201D` : `Add an action word so this is a full thought.`,
        note: danglingClause ? `This starts with \u201C${s.words[0]}\u201D but never finishes the thought.` : `This piece is missing its action \u2014 it isn't a complete sentence yet.`,
        severity: 4,
        confidence: danglingClause ? 0.86 : 0.8
      });
    }
  }
  const byCategory = {
    spelling: [],
    contraction: [],
    context_word: [],
    word_form: [],
    subject_verb: [],
    verb_tense: [],
    capitalization: [],
    end_punctuation: [],
    fragment: []
  };
  for (const i of issues) byCategory[i.category].push(i);
  return { issues, sentences, fragments, byCategory, pastTense };
}

// src/lib/analyze.ts
var clamp = (n) => Math.max(5, Math.min(100, Math.round(n)));
function list(issues, max = 2) {
  return issues.slice(0, max).map((i) => `\u201C${i.original}\u201D\u2192\u201C${i.suggestion}\u201D`).join(", ");
}
function groupByCategory(issues) {
  const c = {
    spelling: [],
    contraction: [],
    context_word: [],
    word_form: [],
    subject_verb: [],
    verb_tense: [],
    capitalization: [],
    end_punctuation: [],
    fragment: []
  };
  for (const i of issues) c[i.category].push(i);
  return c;
}
function scoreFromIssues(rawText, issues, fragments, sentenceCount) {
  const text = rawText.trim();
  const words = text ? text.split(/\s+/) : [];
  const wordCount = words.length;
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const c = groupByCategory(issues);
  const scores = {};
  const evidence = {};
  if (fragments.length === 0) {
    scores.complete_sentences = clamp(88 + Math.min(sentenceCount, 6));
    evidence.complete_sentences = sentenceCount > 0 ? `All ${sentenceCount} sentences are complete thoughts.` : "Write a sentence or two to get started.";
  } else {
    scores.complete_sentences = clamp(90 - fragments.length * 22);
    evidence.complete_sentences = `Incomplete: \u201C${fragments[0].text}\u201D`;
  }
  if (c.capitalization.length === 0) {
    scores.capitalization = 92;
    evidence.capitalization = "Capital letters look correct.";
  } else {
    scores.capitalization = clamp(95 - c.capitalization.length * 14);
    evidence.capitalization = `Fix: ${list(c.capitalization)}.`;
  }
  const punctIssues = [...c.contraction, ...c.end_punctuation];
  if (punctIssues.length === 0) {
    scores.punctuation = 90;
    evidence.punctuation = "Punctuation and apostrophes look good.";
  } else {
    scores.punctuation = clamp(92 - punctIssues.length * 12);
    evidence.punctuation = `Fix: ${list(punctIssues)}.`;
  }
  const grammarIssues = [
    ...c.subject_verb,
    ...c.verb_tense,
    ...c.word_form,
    ...c.context_word,
    ...c.spelling
  ];
  if (grammarIssues.length === 0) {
    scores.grammar = 90;
    evidence.grammar = "No grammar, spelling, or verb errors found.";
  } else {
    scores.grammar = clamp(92 - grammarIssues.length * 11);
    evidence.grammar = `Fix: ${list(grammarIssues, 3)}.`;
  }
  scores.paragraph_structure = clamp(
    paragraphs.length > 1 ? 72 + paragraphs.length * 5 : wordCount > 90 ? 50 : 62
  );
  evidence.paragraph_structure = paragraphs.length > 1 ? `${paragraphs.length} paragraphs \u2014 nicely separated.` : "Try breaking your writing into paragraphs for each new idea.";
  const transitionWords = text.match(
    /\b(first|next|then|after|finally|however|because|also|for example|in addition|meanwhile|therefore|although|on the other hand|suddenly|later)\b/gi
  ) || [];
  scores.transitions = clamp(48 + transitionWords.length * 9);
  evidence.transitions = transitionWords.length ? `Used linking words: ${[...new Set(transitionWords.map((w) => w.toLowerCase()))].slice(0, 3).join(", ")}.` : "Add linking words (first, then, because) to connect ideas.";
  const unique = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z']/g, "")));
  const ttr = wordCount ? unique.size / wordCount : 0;
  scores.vocabulary = clamp(40 + ttr * 75);
  evidence.vocabulary = ttr > 0.6 ? "Good variety of words." : "Try swapping a few plain words for more exact ones.";
  scores.supporting_details = clamp(38 + Math.min(wordCount, 200) / 3);
  evidence.supporting_details = wordCount > 120 ? "Plenty of detail to support your ideas." : "Add an example or two to back up your main idea.";
  scores.organization = clamp((scores.paragraph_structure + scores.transitions) / 2);
  evidence.organization = scores.organization > 65 ? "Ideas flow in a clear order." : "Put your ideas in an order a reader can follow.";
  scores.writing_stamina = clamp(wordCount / 200 * 100);
  evidence.writing_stamina = `${wordCount} words written.`;
  const avgLen = wordCount / (sentenceCount || 1);
  if (fragments.length === 0 && avgLen < 4) {
    scores.complete_sentences = clamp(scores.complete_sentences - 10);
    evidence.complete_sentences = "Sentences are very short \u2014 try expanding a few.";
  }
  return { scores, evidence };
}

// src/content/brandPromise.ts
var BRAND_PROMISE = "Strong writers aren't born. They're built.";

// src/content/coachNotes.ts
var COACH_NOTES = {
  general: [
    "Every first draft is progress.",
    "Your ideas matter.",
    "Focus on getting your ideas onto the page.",
    "Every great writer edits.",
    "Writing gets stronger one draft at a time.",
    "Small improvements become big growth.",
    "The best writers never stop learning.",
    "Great writing starts with great thinking.",
    "One clear sentence can grow into something powerful.",
    "You are building a writer's habits every time you practice."
  ],
  narrative: [
    "Every story begins with one sentence.",
    "Characters become real through details.",
    "Help your reader picture the moment.",
    "Readers remember great endings.",
    "Small details can make a story feel alive."
  ],
  opinion: [
    "Strong opinions need strong reasons.",
    "Support your ideas with examples.",
    "Convince with evidence, not just feelings.",
    "A clear reason makes your opinion stronger."
  ],
  informative: [
    "Teach your reader something new today.",
    "Clear explanations help people learn.",
    "Step-by-step writing makes hard ideas easier.",
    "Useful facts help your reader trust you."
  ],
  summary: [
    "Strong summaries keep the most important ideas.",
    "Use your own words to show what you understood.",
    "A clear summary helps someone learn quickly."
  ],
  creative: [
    "Imagination grows when you give it details.",
    "A surprising idea can become a strong story.",
    "Creative writing starts by trying something new."
  ],
  persuasive: [
    "Great arguments use evidence.",
    "A strong point becomes stronger with proof.",
    "Help your reader understand why your idea matters."
  ],
  descriptive: [
    "Help readers picture what you see.",
    "Use details that paint a picture.",
    "Clear describing words can pull a reader in."
  ],
  editing: [
    "Revision is where writing gets stronger.",
    "Careful editing shows respect for your ideas.",
    "One thoughtful edit can make a sentence shine."
  ],
  confidence: [
    "Don't worry about writing perfectly.",
    "You are allowed to grow one sentence at a time.",
    "Confidence grows when you keep practicing."
  ]
};

// src/content/encouragements.ts
var ENCOURAGEMENTS = {
  complete: [
    "Excellent work. You found every correction yourself.",
    "Fantastic editing. Your hard work made this clearer.",
    "That is exactly what strong writers do."
  ],
  partial: [
    "Nice improvement. Keep building on that.",
    "Good thinking. You are getting closer.",
    "That edit made your writing easier to understand."
  ],
  tryAgain: [
    "Good effort. Use the clues and take one more look.",
    "You are learning how to revise. Keep going.",
    "Stay with it. Strong writers reread carefully."
  ],
  clean: [
    "This piece met today's writing goals.",
    "Your writing is clear and carefully checked.",
    "You are ready for a bigger writing challenge."
  ]
};

// src/content/growthLabels.ts
var GROWTH_LABELS = {
  todaysGrowth: "Today's Growth",
  growingSkills: "Growing Skills",
  writingSnapshot: "Writing Snapshot",
  growthJourney: "Growth Journey",
  nextStep: "Next Step",
  coachFeedback: "Coach's Feedback",
  growthGoals: "Growth Goals",
  growthStreak: "Growth Streak",
  writingProgress: "Writing Progress",
  quickReflection: "Quick Reflection",
  coachNote: "Coach's Note"
};

// src/content/reflectionPrompts.ts
var REFLECTION_PROMPTS = {
  narrative: [
    "What part of your story are you most proud of?",
    "Which detail helped your reader picture the moment?",
    "What part of your story makes you smile the most?"
  ],
  opinion: [
    "Which reason made your opinion strongest?",
    "What example helped explain your thinking best?",
    "What would you add to make your opinion even stronger?"
  ],
  informative: [
    "What fact helped teach your reader something new?",
    "Which step did you explain most clearly?",
    "What detail made your explanation easier to understand?"
  ],
  summary: [
    "Which important idea did you explain most clearly?",
    "How did you decide what information mattered most?"
  ],
  creative: [
    "Which idea felt most original to you?",
    "What detail made your writing feel more alive?"
  ],
  general: [
    "What are you most proud of in your writing today?",
    "What did you improve this time?",
    "What would you like to get better at next?"
  ]
};

// src/content/scorecardMessages.ts
var SCORECARD_MESSAGES = {
  ideas: {
    high: "Your ideas are clear and give the reader something meaningful to follow.",
    mid: "Your main idea is coming through. One more detail would make it even stronger.",
    low: "You have a good start. Add one clear idea and a detail to help your reader."
  },
  organization: {
    high: "Your writing is easy to follow from one idea to the next.",
    mid: "Your ideas are in place. A few linking words would help the reader move with you.",
    low: "Your ideas matter. Put them in an order that helps the reader follow your thinking."
  },
  wordChoice: {
    high: "Your words fit the topic and help the reader understand your ideas.",
    mid: "Most of your word choices fit well. Try replacing one common phrase with a more descriptive one.",
    low: "Start with clear words first. Then choose one place to add a stronger detail."
  },
  fluency: {
    high: "Your sentences read smoothly as complete thoughts.",
    mid: "Your ideas are clear. One sentence may need a little more to sound complete.",
    low: "Read each sentence aloud and listen for places where the thought needs finishing."
  },
  conventions: {
    high: "Your spelling, grammar, and punctuation show careful editing.",
    mid: "Your ideas are easy to understand. A few spelling or punctuation fixes will make them even clearer.",
    low: "Your ideas are worth careful editing. Start with the spelling and punctuation clues."
  }
};

// src/content/terminology.ts
var TERMINOLOGY = {
  feedback: "Coach's Feedback",
  corrections: "growth spots",
  errors: "places to strengthen",
  results: "Writing Snapshot",
  scores: "growth markers",
  mistakes: "growth spots"
};

// src/content/uiMessages.ts
var UI_MESSAGES = {
  auth: {
    loginTitle: "Welcome back",
    loginSubtitle: "Strong writers aren't born. They're built.",
    signupTitle: "Create your parent account",
    signupSubtitle: "Start a growth journey for every young writer in your home.",
    confirmEmail: "Check your email to confirm your account, then log in.",
    genericError: "Something went wrong. Please try again.",
    loading: "Please wait...",
    loginButton: "Log in",
    signupButton: "Create account",
    nameLabel: "Your name",
    emailLabel: "Email",
    passwordLabel: "Password",
    passwordPlaceholder: "At least 6 characters",
    newHere: "New here?",
    alreadyHaveAccount: "Already have an account?",
    createOne: "Create one"
  },
  writing: {
    pageEyebrow: "Today's Growth",
    pageTitle: "Today's writing",
    pageSubtitle: "Read the prompt, write your best, then ask your coach for the next step.",
    editorLabelSuffix: "'s writing",
    placeholder: "Start writing here. Take your time \u2014 your coach is here to help you grow, not to write it for you.",
    saveDraft: "Save draft",
    saved: "Saved",
    saving: "Saving...",
    submit: "Submit & get coaching",
    coaching: "Coaching...",
    wordSuggested: "Suggested",
    newPrompt: "New prompt",
    coachNotes: "Your coach's notes",
    offlineCoach: "Free Writing Coach",
    challengeTitle: "Your challenge",
    challengeChecklist: "Find every place that could be improved",
    clues: "Clues",
    answers: "Answers",
    checkFixes: "Check my fixes",
    checking: "Checking...",
    stillCheck: "Still check",
    noNewGrowthSpots: "None spotted.",
    writingSnapshot: "Writing Snapshot",
    growthSnapshot: "Growth Snapshot",
    strengths: "Strengths",
    growingSkills: "Growing Skills",
    reflectionPlaceholder: "Optional: write one sentence about your work today.",
    noIssues: "No spelling, grammar, or punctuation growth spots found in this piece \u2014 great care."
  },
  plans: {
    startFree: "Start free",
    unlockCoach: "Unlock your Personal Writing Coach",
    freeCoachIncluded: "Free Writing Coach included"
  }
};

// src/services/brandVoice.ts
function pickStable(items, seed = "") {
  if (!items.length) return "";
  let hash = 0;
  for (const char of seed || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)) {
    hash = hash * 31 + char.charCodeAt(0) >>> 0;
  }
  return items[hash % items.length];
}
function bandForGrade(grade) {
  if (!grade || grade <= 4) return "grades3-4";
  if (grade <= 6) return "grades5-6";
  return "grades7-8";
}
function scoreBand(score) {
  if (score >= 4) return "high";
  if (score >= 3) return "mid";
  return "low";
}
var brandVoice = {
  locale: "en",
  messages: UI_MESSAGES,
  terminology: TERMINOLOGY,
  labels: GROWTH_LABELS,
  getBrandPromise() {
    return BRAND_PROMISE;
  },
  getCoachNote(context) {
    const key = context?.category ?? "general";
    const notes = COACH_NOTES[key] ?? COACH_NOTES.general;
    return pickStable(notes, context?.seed);
  },
  getEncouragement(level, seed) {
    return pickStable(ENCOURAGEMENTS[level], seed);
  },
  getReflectionPrompt(category, grade, seed) {
    const prompts = REFLECTION_PROMPTS[category ?? "general"] ?? REFLECTION_PROMPTS.general;
    const chosen = pickStable(prompts, `${bandForGrade(grade)}:${seed ?? ""}`);
    return chosen || REFLECTION_PROMPTS.general[0];
  },
  getScorecardExplanation(category, score) {
    const band = scoreBand(score);
    if (category === "Ideas / Content") return SCORECARD_MESSAGES.ideas[band];
    if (category === "Organization") return SCORECARD_MESSAGES.organization[band];
    if (category === "Word Choice") return SCORECARD_MESSAGES.wordChoice[band];
    if (category === "Sentence Fluency") return SCORECARD_MESSAGES.fluency[band];
    return SCORECARD_MESSAGES.conventions[band];
  },
  getSkillDescription(skill) {
    const descriptions = {
      complete_sentences: "Complete sentences",
      capitalization: "Capital letters",
      punctuation: "Punctuation",
      paragraph_structure: "Paragraph development",
      supporting_details: "Supporting details",
      transitions: "Transitions",
      vocabulary: "Word choice",
      organization: "Clear organization",
      grammar: "Grammar choices",
      writing_stamina: "Writing stamina"
    };
    return descriptions[skill];
  },
  getWelcomeMessage(history) {
    if (history?.focus) {
      return `Welcome back${history.name ? `, ${history.name}` : ""}. Last time you worked on ${history.focus}. Let's keep building on that.`;
    }
    return `Welcome back${history?.name ? `, ${history.name}` : ""}. ${BRAND_PROMISE}`;
  },
  getEmptyStateMessage() {
    return "Add your first young writer and begin their growth journey.";
  },
  getOfflineCoachMessage() {
    return "The Free Writing Coach is helping with this piece.";
  },
  getPremiumCoachMessage() {
    return "Unlock your Personal Writing Coach for deeper guidance and more writing support.";
  }
};

// src/lib/revision.ts
function norm(s) {
  return s.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
}
function correctionOf(issue) {
  return issue.corrected ?? issue.suggestion ?? "";
}
function spellingMeaning(word) {
  const lower = word.toLowerCase();
  if (lower === "forward") return "moving ahead";
  if (lower === "careful") return "being safe and paying attention";
  if (lower === "useful") return "helpful";
  if (lower === "beautiful") return "very pretty";
  if (lower === "disagree") return "not agreeing";
  return null;
}
function challengeLabel(issue) {
  if (issue.category === "spelling") return "Spelling";
  if (issue.category === "contraction") return "Apostrophe";
  if (issue.category === "context_word") return "Context Word";
  if (issue.category === "word_form") return "Common grammar";
  if (issue.category === "subject_verb") return "Subject/verb agreement";
  if (issue.category === "verb_tense") return "Common grammar";
  if (issue.category === "end_punctuation") return "End punctuation";
  if (issue.category === "capitalization") return "Capital letter";
  if (issue.category === "fragment") return "Complete sentence";
  return "Common grammar";
}
function clueForIssue(issue, attempt = 0) {
  const corrected = correctionOf(issue);
  if (issue.category === "spelling") {
    const meaning = spellingMeaning(corrected);
    if (meaning) {
      return attempt >= 2 ? `Check the spelling of the word that means ${meaning}: \u201C${corrected}.\u201D` : `Look closely at the word that means ${meaning}.`;
    }
    return attempt >= 2 ? `Check the spelling of \u201C${corrected}.\u201D` : "One word is spelled almost right, but one or two letters need checking.";
  }
  if (issue.category === "contraction") {
    return attempt >= 2 ? `Look for the missing apostrophe in \u201C${corrected}.\u201D` : "One contraction is missing an apostrophe.";
  }
  if (issue.category === "word_form") {
    if (/\btoo\b/i.test(corrected)) {
      return attempt >= 2 ? `One sentence needs \u201Ctoo\u201D because it means more than enough.` : "One sentence uses the wrong version of \u201Ctoo.\u201D";
    }
    return "One sentence has a small grammar word to check.";
  }
  if (issue.category === "context_word") {
    return attempt >= 2 ? `Check the commonly confused word that should be \u201C${corrected}.\u201D` : "One commonly confused word doesn't fit its meaning.";
  }
  if (issue.category === "end_punctuation") return "One sentence needs a clearer stopping place.";
  if (issue.category === "capitalization") return "One word needs a capital letter.";
  if (issue.category === "fragment") return "One thought may need a subject and an action.";
  return "One grammar choice needs a closer look.";
}
function challengeItems(issues) {
  return issues.map((issue, index) => ({
    id: `${issue.category}:${norm(issue.original)}:${index}`,
    category: issue.category,
    label: challengeLabel(issue),
    clue: clueForIssue(issue, 0),
    strongerClue: clueForIssue(issue, 2)
  }));
}

// src/lib/coaching.ts
var DISPLAY_TYPE = {
  spelling: "Spelling",
  contraction: "Apostrophe",
  context_word: "Context Word",
  end_punctuation: "End punctuation",
  subject_verb: "Subject/verb agreement",
  verb_tense: "Common grammar",
  word_form: "Common grammar",
  capitalization: "Capitalization",
  fragment: "Complete sentence"
};
function groupByCategory2(issues) {
  const c = {
    spelling: [],
    contraction: [],
    context_word: [],
    word_form: [],
    subject_verb: [],
    verb_tense: [],
    capitalization: [],
    end_punctuation: [],
    fragment: []
  };
  for (const i of issues) c[i.category].push(i);
  return c;
}
function issuePriority(issue) {
  if (issue.category === "context_word") return 10;
  if (issue.category === "word_form") return 10;
  if (issue.category === "subject_verb" || issue.category === "verb_tense") return 9;
  if (issue.category === "fragment") return 8;
  if (issue.category === "contraction" || issue.category === "end_punctuation") return 7;
  if (issue.category === "capitalization") return 6;
  if (issue.category === "spelling") return 5;
  return 1;
}
function prioritizedIssues(issues) {
  return [...issues].sort((a, b) => issuePriority(b) - issuePriority(a) || b.severity - a.severity);
}
function oneSentenceNote(issue) {
  if (issue.category === "spelling") return `This word is spelled \u201C${issue.suggestion}.\u201D`;
  if (issue.category === "contraction") {
    if (issue.suggestion.toLowerCase().startsWith("it's"))
      return `Don't forget the apostrophe; \u201Cit's\u201D is short for \u201Cit is.\u201D`;
    return `Don't forget the apostrophe in \u201C${issue.suggestion}.\u201D`;
  }
  if (issue.category === "context_word") return issue.note;
  if (issue.category === "word_form" && /\btoo\b/i.test(issue.suggestion)) {
    return `Use \u201Ctoo\u201D here because it means \u201Cmore than enough.\u201D`;
  }
  return issue.note.replace(/^Almost —\s*/i, "").replace(/\s+/g, " ").trim();
}
function buildAllIssues(issues) {
  return prioritizedIssues(issues).slice(0, 10).map((i) => ({
    category: i.category,
    type: DISPLAY_TYPE[i.category],
    original: i.original,
    corrected: i.suggestion,
    suggestion: i.suggestion,
    note: oneSentenceNote(i),
    ...i.options && i.options.length ? { options: i.options } : {}
  }));
}
var BUCKET_OF = {
  subject_verb: "verb_forms",
  verb_tense: "verb_forms",
  word_form: "verb_forms",
  context_word: "context_words",
  spelling: "spelling",
  contraction: "contractions",
  capitalization: "capitalization",
  end_punctuation: "end_punctuation",
  fragment: "sentences"
};
var BUCKET_NAME = {
  verb_forms: "verb forms",
  spelling: "spelling",
  contractions: "apostrophes in contractions",
  capitalization: "capital letters",
  context_words: "commonly confused words",
  end_punctuation: "end punctuation",
  sentences: "complete sentences"
};
var BUCKET_SKILL = {
  verb_forms: "grammar",
  spelling: "grammar",
  contractions: "punctuation",
  context_words: "grammar",
  capitalization: "capitalization",
  end_punctuation: "punctuation",
  sentences: "complete_sentences"
};
function rankBuckets(issues) {
  const map = /* @__PURE__ */ new Map();
  for (const issue of issues) {
    const b = BUCKET_OF[issue.category];
    const entry = map.get(b) ?? { weight: 0, issues: [] };
    entry.weight += issue.severity;
    entry.issues.push(issue);
    map.set(b, entry);
  }
  return [...map.entries()].map(([bucket, v]) => ({ bucket, ...v })).sort((a, b) => b.weight - a.weight);
}
function joinAnd(items) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
var PLAIN_WORDS = {
  good: "helpful, clear, or useful",
  nice: "kind, cheerful, or thoughtful",
  big: "huge, towering, or enormous",
  small: "tiny or little",
  happy: "thrilled or delighted",
  sad: "miserable or gloomy",
  fun: "exciting or thrilling",
  things: "a more exact noun",
  stuff: "a more exact noun",
  "a lot": "many or plenty"
};
function vocabularyFromText(text) {
  const lower = ` ${text.toLowerCase()} `;
  const found = [];
  if (/\breally\s+fast\b/i.test(text)) {
    found.push("Try \u201Creally fast\u201D \u2192 \u201Cquickly\u201D or \u201Crapidly.\u201D");
  }
  for (const [word, better] of Object.entries(PLAIN_WORDS)) {
    if (new RegExp(`\\b${word.replace(/ /g, "\\s")}\\b`).test(lower)) {
      found.push(`Try \u201C${word}\u201D \u2192 ${better}.`);
    }
    if (found.length >= 2) break;
  }
  if (found.length === 0) {
    found.push("Your word choices are already clear and specific.");
  }
  return found.slice(0, 3);
}
function reflectionPrompt(issues) {
  if (issues.length === 0) return brandVoice.getReflectionPrompt("general");
  if (issues.some((i) => i.category === "spelling" || i.category === "contraction"))
    return "What did you improve as you edited your writing today?";
  return "What would you like to make even stronger next time?";
}
function categoryKind(category) {
  if (category === "narrative" || category === "creative") return "narrative";
  if (category === "opinion") return "opinion";
  if (category === "informative" || category === "summary") return "informative";
  return "general";
}
function evidenceWords(text, re) {
  return [...new Set((text.match(re) ?? []).map((w) => w.toLowerCase()))];
}
function buildStrength(text, c, fragments, sentenceCount, category) {
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim()).length;
  const kind = categoryKind(category);
  const spellingGrammar = c.spelling.length + c.context_word.length + c.subject_verb.length + c.verb_tense.length + c.word_form.length;
  const punct = c.contraction.length + c.end_punctuation.length;
  const cleanMechanics = spellingGrammar === 0 && punct === 0;
  if (kind === "informative") {
    const orderWords = evidenceWords(text, /\b(first|then|when|because|that is why|inside|middle)\b/gi);
    if (orderWords.length >= 2)
      return "You explained the process in a clear order and included important details that help the reader understand it.";
    return "You explained your topic with facts and details that help the reader learn something.";
  }
  if (kind === "opinion") {
    if (/\b(i think|in my opinion|because|first|second|third|that's why|thats why)\b/i.test(text))
      return "You shared a clear opinion and gave reasons to support it.";
    return "You made your opinion clear so the reader knows what you believe.";
  }
  if (kind === "narrative") {
    if (sentenceCount >= 4)
      return "You built a story with events in order and details a reader can follow.";
    return "You gave your story a clear idea to build on.";
  }
  if (paragraphs > 1)
    return "You organized your ideas into clear paragraphs \u2014 that structure really helps your reader.";
  if (cleanMechanics && fragments.length === 0 && sentenceCount >= 3)
    return "You wrote in complete, careful sentences and kept your ideas clear from start to finish.";
  if (wordCount >= 60)
    return "You stayed focused on the prompt and gave your writing real detail \u2014 nice effort.";
  return "You stayed focused on the prompt and put your own real ideas on the page.";
}
function issuePatternSummary(ranked) {
  if (!ranked.length) return "adding one stronger detail";
  const top = ranked.slice(0, 2).map((r) => BUCKET_NAME[r.bucket]);
  return joinAnd(top);
}
function buildGrammarNote(c, ranked) {
  const punctIssues = [...c.contraction, ...c.end_punctuation];
  const topBuckets = new Set(ranked.slice(0, 2).map((r) => r.bucket));
  if (topBuckets.has("contractions") && c.contraction.length) return null;
  if (topBuckets.has("end_punctuation") && c.end_punctuation.length) return null;
  if (topBuckets.has("context_words") && c.context_word.length) return null;
  if (topBuckets.has("verb_forms") && (c.subject_verb.length || c.word_form.length || c.verb_tense.length)) return null;
  if (topBuckets.has("spelling") && c.contraction.length === 0 && punctIssues.length === 0) return null;
  if (c.contraction.length)
    return `Watch apostrophes in contractions, like \u201C${c.contraction[0].original}\u201D \u2192 \u201C${c.contraction[0].suggestion}.\u201D`;
  if (c.end_punctuation.length)
    return `Check where sentences stop, like \u201C${c.end_punctuation[0].original}.\u201D`;
  if (c.subject_verb.length)
    return `Make subjects and verbs match, like \u201C${c.subject_verb[0].original}\u201D \u2192 \u201C${c.subject_verb[0].suggestion}.\u201D`;
  if (c.context_word.length)
    return `Check commonly confused words, like \u201C${c.context_word[0].original}\u201D \u2192 \u201C${c.context_word[0].suggestion}.\u201D`;
  if (c.word_form.length)
    return `Check small word choices, like \u201C${c.word_form[0].original}\u201D \u2192 \u201C${c.word_form[0].suggestion}.\u201D`;
  return null;
}
function clampRubric(n) {
  return Math.max(1, Math.min(5, Math.round(n)));
}
function buildScorecard(input, issues, fragments, sentenceCount) {
  const text = input.text.trim();
  const words = text ? text.split(/\s+/) : [];
  const wordCount = words.length;
  const c = groupByCategory2(issues);
  const transitions = evidenceWords(text, /\b(first|second|third|next|then|when|because|also|finally|that is why|however)\b/gi);
  const kind = categoryKind(input.category);
  const conventionErrors = c.spelling.length + c.contraction.length + c.context_word.length + c.end_punctuation.length + c.capitalization.length + c.subject_verb.length + c.verb_tense.length + c.word_form.length;
  const unique = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z']/g, "")).filter(Boolean));
  const variety = wordCount ? unique.size / wordCount : 0;
  let ideasBase = wordCount >= 120 ? 4.6 : wordCount >= 80 ? 4.2 : wordCount >= 45 ? 3.5 : 2.7;
  if (kind === "informative" && /\b(because|why|how|works|make|creates|should|never)\b/i.test(text)) ideasBase += 0.3;
  if (kind === "opinion" && /\bbecause\b/i.test(text)) ideasBase += 0.3;
  const orgBase = transitions.length >= 4 ? 4.6 : transitions.length >= 2 ? 4.1 : sentenceCount >= 4 ? 3.5 : 2.8;
  const wordBase = variety > 0.72 ? 4.4 : variety > 0.58 ? 3.9 : 3.2;
  const fluencyBase = fragments.length === 0 ? sentenceCount >= 5 ? 4.2 : 3.6 : 3 - fragments.length * 0.3;
  const conventionBase = 5 - conventionErrors * 0.45;
  return [
    {
      category: "Ideas / Content",
      score: clampRubric(ideasBase),
      explanation: brandVoice.getScorecardExplanation("Ideas / Content", clampRubric(ideasBase))
    },
    {
      category: "Organization",
      score: clampRubric(orgBase),
      explanation: transitions.length ? `The order is easy to follow, with linking words like ${transitions.slice(0, 3).join(", ")}.` : brandVoice.getScorecardExplanation("Organization", clampRubric(orgBase))
    },
    {
      category: "Word Choice",
      score: clampRubric(wordBase),
      explanation: vocabularyFromText(text)[0]?.startsWith("Your word choices") ? brandVoice.getScorecardExplanation("Word Choice", clampRubric(wordBase)) : brandVoice.getScorecardExplanation("Word Choice", clampRubric(wordBase))
    },
    {
      category: "Sentence Fluency",
      score: clampRubric(fluencyBase),
      explanation: fragments.length ? brandVoice.getScorecardExplanation("Sentence Fluency", clampRubric(fluencyBase)) : brandVoice.getScorecardExplanation("Sentence Fluency", clampRubric(fluencyBase))
    },
    {
      category: "Conventions",
      score: clampRubric(conventionBase),
      explanation: conventionErrors ? brandVoice.getScorecardExplanation("Conventions", clampRubric(conventionBase)) : brandVoice.getScorecardExplanation("Conventions", clampRubric(conventionBase))
    }
  ];
}
function buildChallenge(issues) {
  if (!issues.length) return null;
  const items = challengeItems(buildAllIssues(issues));
  return {
    mode: "guided_practice",
    prompt: "Can you make your writing even stronger?",
    totalCorrections: items.length,
    clues: items.map((item) => item.clue),
    items
  };
}
function buildSkillSnapshot(scores, evidence, issues) {
  const c = groupByCategory2(issues);
  const strengths = [];
  const growing = [];
  if (scores.complete_sentences >= 85) strengths.push("Complete sentences");
  if (scores.organization >= 70) strengths.push("Clear organization");
  if (scores.supporting_details >= 75) strengths.push("Good supporting details");
  if (scores.vocabulary >= 80) strengths.push("Clear word choice");
  if (scores.transitions >= 70) strengths.push("Helpful transitions");
  if (/conclusion|that'?s why|finally|in the end/i.test(Object.values(evidence).join(" "))) {
    strengths.push("Strong conclusion");
  }
  if (c.spelling.length) growing.push("Spelling");
  if (c.contraction.length) growing.push("Apostrophes");
  if (c.end_punctuation.length) growing.push("End punctuation");
  if (c.context_word.length) growing.push("Commonly confused words");
  if (c.subject_verb.length || c.verb_tense.length || c.word_form.length) growing.push("Grammar choices");
  if (c.fragment.length) growing.push("Complete thoughts");
  if (scores.transitions < 65) growing.push("Stronger transitions");
  if (scores.paragraph_structure < 65) growing.push("Paragraph development");
  if (scores.vocabulary < 65 && issues.length === 0) growing.push("More descriptive word choice");
  return {
    strengths: [...new Set(strengths)].slice(0, 4),
    growing: [...new Set(growing)].slice(0, 3)
  };
}
function buildProgressNote(history, scorecard) {
  if (!history?.length) return null;
  const byCategory = /* @__PURE__ */ new Map();
  for (const row of history) {
    byCategory.set(row.category, [...byCategory.get(row.category) ?? [], row.score]);
  }
  for (const current of scorecard) {
    const past = byCategory.get(current.category) ?? [];
    if (past.length >= 2) {
      const avg = past.reduce((sum, n) => sum + n, 0) / past.length;
      if (current.score >= avg + 0.75) {
        return `You're getting stronger at ${current.category.toLowerCase()} compared with your recent writing.`;
      }
    }
  }
  const strongest = [...scorecard].sort((a, b) => b.score - a.score)[0];
  return strongest ? `${strongest.category} is becoming one of your steady strengths.` : null;
}
function buildDeterministic(input, issues, fragments, sentenceCount) {
  const simple = input.grade <= 5;
  const c = groupByCategory2(issues);
  const { scores, evidence } = scoreFromIssues(
    input.text,
    issues,
    fragments,
    sentenceCount
  );
  const ranked = rankBuckets(issues);
  const examples = [];
  const used = /* @__PURE__ */ new Set();
  for (const r of ranked) {
    for (const issue of [...r.issues].sort((a, b) => b.severity - a.severity)) {
      const key = `${issue.category}:${issue.original.toLowerCase()}`;
      if (used.has(key)) continue;
      used.add(key);
      examples.push({ original: issue.original, suggestion: issue.suggestion, note: issue.note });
      if (examples.length >= 3) break;
    }
    if (examples.length >= 3) break;
  }
  let improve;
  let focus_skills;
  if (ranked.length > 0) {
    const top = ranked.slice(0, 2);
    const names = joinAnd(top.map((t) => BUCKET_NAME[t.bucket]));
    improve = simple ? `Let's work on ${names}. Small fixes here will make a big difference!` : `Your main growth area is ${names}. These are small, fixable patterns \u2014 clean them up and your writing will read much more smoothly.`;
    focus_skills = [...new Set(top.map((t) => BUCKET_SKILL[t.bucket]))];
  } else {
    improve = `${brandVoice.getEncouragement("clean")} Next time, let's challenge you with a more advanced writing skill.`;
    focus_skills = [];
  }
  const grammar_notes = buildGrammarNote(c, ranked);
  const topBucket = ranked[0]?.bucket;
  const questions = [];
  if (topBucket === "verb_forms") {
    questions.push("Read your writing out loud \u2014 do the action words match when things happened (past vs. now)?");
    questions.push("Does each subject match its verb (one thing vs. many things)?");
  } else if (topBucket === "spelling") {
    questions.push("Which two or three words could you double-check by sounding them out?");
    questions.push("Are there any words you weren't sure how to spell as you wrote?");
  } else if (topBucket === "contractions" || topBucket === "end_punctuation") {
    questions.push("Where could an apostrophe or end mark make a sentence clearer?");
    questions.push("If you read each sentence aloud, where does your voice naturally stop?");
  } else if (topBucket === "context_words") {
    questions.push("Which word might sound right but mean something different?");
    questions.push("Can you find one commonly confused word and ask what it means in that sentence?");
  } else if (topBucket === "sentences") {
    questions.push("Does each sentence have a who and a what-they-did?");
    questions.push("Which sentence feels unfinished, and how could you complete it?");
  } else {
    questions.push("What is the one main idea you most want your reader to remember?");
    questions.push("Where could you add a detail or example to make that idea clearer?");
  }
  questions.push(
    simple ? "Can you read it out loud and fix anything that sounds off?" : "Which sentence is your strongest, and how could you make another one just as strong?"
  );
  const scorecard = buildScorecard(input, issues, fragments, sentenceCount);
  return {
    did_well: buildStrength(input.text, c, fragments, sentenceCount, input.category),
    improve,
    guiding_questions: questions.slice(0, 3),
    grammar_notes,
    vocabulary_suggestions: vocabularyFromText(input.text),
    encouragement: ranked.length ? `Great job ${categoryKind(input.category) === "informative" ? "explaining your topic" : "getting your ideas down"}. Work on ${issuePatternSummary(ranked)} and your writing will be even clearer.` : brandVoice.getEncouragement("clean"),
    examples,
    all_issues: buildAllIssues(issues),
    scorecard,
    challenge: buildChallenge(issues),
    skill_snapshot: buildSkillSnapshot(scores, evidence, issues),
    reflection_prompt: input.category ? brandVoice.getReflectionPrompt(input.category, input.grade, input.text) : reflectionPrompt(issues),
    progress_note: buildProgressNote(input.scoreHistory, scorecard),
    skill_scores: scores,
    skill_evidence: evidence,
    focus_skills
  };
}
function offlineCoach(input) {
  const d = diagnose(input.text);
  const core = buildDeterministic(input, d.issues, d.fragments, d.sentences.length);
  return { ...core, source: "offline" };
}
export {
  offlineCoach
};
