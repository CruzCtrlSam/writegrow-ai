// ─────────────────────────────────────────────────────────────────
// Diagnostics engine
// Finds REAL, evidence-backed issues in a student's writing and
// categorizes them. Every issue carries the exact text, a correction,
// and a short kid-friendly reason. This is what makes feedback specific
// instead of generic — nothing is reported without textual evidence.
// ─────────────────────────────────────────────────────────────────

export type IssueCategory =
  | "spelling"
  | "contraction" // missing apostrophe
  | "context_word" // their/there/they're, to/too/two, etc.
  | "word_form" // e.g. "suppose to" -> "supposed to"
  | "subject_verb" // "hands was" -> "hands were"
  | "verb_tense" // "I ever find" -> "I ever found"
  | "capitalization"
  | "end_punctuation"
  | "fragment"; // genuine incomplete sentence

import { isMisspelled, suggestions } from "./spell";

export interface Issue {
  category: IssueCategory;
  original: string; // exact snippet from the student's text
  suggestion: string; // corrected snippet (= options[0] when options exist)
  note: string; // short, encouraging explanation
  severity: number; // weight used for prioritisation
  confidence?: number; // internal certainty; low-confidence issues are hidden
  options?: string[]; // candidate corrections for "Did you mean X or Y?"
}

export interface Sentence {
  text: string;
  words: string[];
}

export interface Diagnosis {
  issues: Issue[];
  sentences: Sentence[];
  fragments: Sentence[]; // sentences judged genuinely incomplete
  byCategory: Record<IssueCategory, Issue[]>;
  pastTense: boolean;
}

// ── Word lists ────────────────────────────────────────────────────

// Missing-apostrophe contractions. Ambiguous real words (id, ill, well,
// lets, wed, shed, were) are deliberately excluded to avoid false hits.
const CONTRACTIONS: Record<string, string> = {
  dont: "don't", didnt: "didn't", cant: "can't", wont: "won't",
  isnt: "isn't", arent: "aren't", wasnt: "wasn't", werent: "weren't",
  couldnt: "couldn't", shouldnt: "shouldn't", wouldnt: "wouldn't",
  hasnt: "hasn't", havent: "haven't", hadnt: "hadn't", doesnt: "doesn't",
  im: "I'm", ive: "I've", youre: "you're", youve: "you've",
  youll: "you'll", theyre: "they're", theyve: "they've", theyll: "they'll",
  whats: "what's", thats: "that's", theres: "there's", heres: "here's",
  hes: "he's", shes: "she's", weve: "we've", weren: "weren't",
};

function contractionNote(original: string, fixed: string): string {
  if (fixed.toLowerCase() === "it's")
    return `Don't forget the apostrophe. “It's” is short for “it is.”`;
  return `Don't forget the apostrophe. “${fixed}” is the correct contraction.`;
}

// Common misspellings -> correct spelling.
const SPELLINGS: Record<string, string> = {
  relized: "realized", realy: "really", definately: "definitely",
  seperate: "separate", recieve: "receive", beleive: "believe",
  freind: "friend", wich: "which", becuase: "because", becasue: "because",
  thier: "their", tommorow: "tomorrow", tomorow: "tomorrow", untill: "until",
  occured: "occurred", embarass: "embarrass", goverment: "government",
  suprise: "surprise", surprize: "surprise", wierd: "weird", finaly: "finally",
  happend: "happened", remeber: "remember", probaly: "probably",
  probly: "probably", favroite: "favorite", enviroment: "environment",
  alot: "a lot", excaped: "escaped", scaryed: "scared", scnce: "science",
  beutiful: "beautiful", dissagree: "disagree", intresting: "interesting",
  carefull: "careful", usefull: "useful", foward: "forward",
};

// Multi-word word-form errors (regex source -> replacement).
const WORD_FORMS: { re: RegExp; fix: (m: string) => string; note: string }[] = [
  { re: /\b(s?suppose|spose)\s+to\b/gi, fix: () => "supposed to", note: "the phrase is “supposed to.”" },
  { re: /\buse\s+to\b/gi, fix: () => "used to", note: "the phrase is “used to.”" },
  { re: /\bshould\s+of\b/gi, fix: () => "should have", note: "it’s “should have,” not “should of.”" },
  { re: /\bcould\s+of\b/gi, fix: () => "could have", note: "it’s “could have,” not “could of.”" },
  { re: /\bwould\s+of\b/gi, fix: () => "would have", note: "it’s “would have,” not “would of.”" },
  { re: /\bmust\s+of\b/gi, fix: () => "must have", note: "it’s “must have,” not “must of.”" },
];

// Irregular present -> past for the verb-tense check.
const PAST_OF: Record<string, string> = {
  find: "found", see: "saw", go: "went", come: "came", take: "took",
  give: "gave", know: "knew", think: "thought", say: "said", tell: "told",
  get: "got", feel: "felt", hear: "heard", leave: "left", begin: "began",
  eat: "ate", drink: "drank", stand: "stood", sit: "sat", win: "won",
  hold: "held", ride: "rode", run: "ran", swim: "swam", fall: "fell",
  break: "broke", choose: "chose", speak: "spoke", write: "wrote",
  bring: "brought", buy: "bought", catch: "caught", teach: "taught",
};

// Words that license a base verb (so we DON'T convert to past tense).
const TENSE_BLOCKERS = new Set([
  "to", "will", "would", "can", "could", "shall", "should", "may",
  "might", "must", "do", "does", "did", "dont", "didnt", "not", "never",
  "always", "usually", "often", "let", "lets", "please", "wo", "ca",
]);

// -s words that are NOT plural nouns (avoids false subject-verb hits).
const NON_PLURAL_S = new Set([
  "this", "his", "is", "as", "has", "was", "us", "yes", "plus", "thus",
  "class", "glass", "grass", "dress", "press", "less", "mess", "kiss",
  "miss", "boss", "loss", "cross", "address", "business", "christmas",
  "news", "always", "perhaps", "series", "species", "focus", "virus",
  "status", "bonus", "campus", "octopus", "famous", "nervous", "serious",
  "jealous", "delicious", "across", "unless", "hers", "ours", "yours",
  "its", "lens", "bus", "gas", "chaos",
]);

// Verb / auxiliary signals used to decide whether a sentence has a verb.
const VERB_SIGNALS = new Set([
  "is", "am", "are", "was", "were", "be", "been", "being", "has", "have",
  "had", "do", "does", "did", "will", "would", "can", "could", "shall",
  "should", "may", "might", "must", "like", "likes", "liked", "want",
  "wants", "wanted", "go", "goes", "went", "gone", "see", "sees", "saw",
  "say", "said", "get", "got", "make", "made", "made", "take", "took",
  "come", "came", "run", "ran", "feel", "felt", "think", "thought",
  "know", "knew", "look", "looked", "find", "found", "tell", "told",
  "ask", "asked", "work", "worked", "play", "played", "help", "helped",
  "need", "needs", "needed", "use", "used", "try", "tried", "start",
  "started", "turn", "turned", "walk", "walked", "talk", "talked",
  "eat", "ate", "drink", "drank", "give", "gave", "leave", "left",
  "stay", "stayed", "keep", "kept", "let", "put", "sit", "sat", "stand",
  "stood", "win", "won", "lose", "lost", "hold", "held", "open", "opened",
  "close", "closed", "love", "loved", "hate", "hated", "live", "lived",
]);

const SUBORDINATORS = new Set([
  "because", "although", "though", "since", "while", "whereas", "unless",
  "until", "whenever", "wherever",
]);

// ── Helpers ───────────────────────────────────────────────────────

function cap(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function splitSentences(text: string): Sentence[] {
  const chunks = text.match(/[^.!?]+[.!?]*/g) ?? [];
  return chunks
    .map((c) => c.trim())
    .filter(Boolean)
    .map((t) => ({
      text: t,
      words: t.replace(/[^A-Za-z'\s]/g, " ").split(/\s+/).filter(Boolean),
    }));
}

function hasVerb(words: string[]): boolean {
  const lower = words.map((w) => w.toLowerCase());
  for (let i = 0; i < lower.length; i++) {
    const w = lower[i];
    if (VERB_SIGNALS.has(w)) return true;
    if (w.length > 3 && (w.endsWith("ed") || w.endsWith("ing"))) return true;
    // infinitive "to <verb>"
    if (w === "to" && i + 1 < lower.length) return true;
    // contraction-as-verb (don't, didn't, it's, etc.)
    if (/'(t|s|re|ve|ll|d|m)$/.test(w)) return true;
    if (CONTRACTIONS[w]) return true;
  }
  return false;
}

// ── Main ──────────────────────────────────────────────────────────

export function diagnose(rawText: string): Diagnosis {
  const text = rawText.replace(/\s+/g, " ").trim();
  const sentences = splitSentences(rawText);
  const issues: Issue[] = [];
  const seen = new Set<string>();
  const MIN_CONFIDENCE = 0.76;

  const add = (issue: Issue) => {
    const confidence = issue.confidence ?? 0.9;
    if (confidence < MIN_CONFIDENCE) return;
    const key = `${issue.category}:${issue.original.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({ ...issue, confidence });
  };

  // Past-tense detection.
  const pastHits =
    (text.match(/\b(was|were|had|did|went|saw|came|took|got|said|felt|knew|thought|looked|turned|walked|ran|made|told|left|began|found)\b/gi) || [])
      .length + (text.match(/\b\w{3,}ed\b/gi) || []).length;
  const pastTense = pastHits >= 2;

  // 1) Contractions (missing apostrophe).
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
        confidence: 0.98,
      });
    }
  }

  // 2) Spelling — static list first (good corrections), then a real
  // dictionary for everything else. Proper nouns (mid-sentence capitals)
  // are skipped so names like "Texas" aren't flagged.
  for (const s of sentences) {
    const tokens = s.text.match(/[A-Za-z][A-Za-z']*/g) ?? [];
    tokens.forEach((tok, idx) => {
      if (tok.includes("'")) return; // contraction/possessive handled elsewhere
      const lower = tok.toLowerCase();
      if (CONTRACTIONS[lower]) return; // owned by the contraction rule
      const known = SPELLINGS[lower];
      if (known) {
        const fixed = /^[A-Z]/.test(tok) ? cap(known) : known;
        add({
          category: "spelling",
          original: tok,
          suggestion: fixed,
          note: `This word is spelled “${fixed}.”`,
          severity: 2,
          confidence: 0.98,
          options: [fixed],
        });
        return;
      }
      // Skip mid-sentence Capitalized words (likely proper nouns).
      if (idx > 0 && /^[A-Z]/.test(tok)) return;
      if (isMisspelled(tok)) {
        const isCap = /^[A-Z]/.test(tok);
        const cands = suggestions(tok, 2)
          .map((c) => (isCap ? cap(c) : c))
          .filter((c) => c.toLowerCase() !== lower);
        if (cands.length) {
          add({
            category: "spelling",
            original: tok,
            suggestion: cands[0],
            note:
              cands.length >= 2
                ? `Spelling — did you mean “${cands[0]}” or “${cands[1]}?”`
                : `This word is spelled “${cands[0]}.”`,
            severity: 2,
            confidence: 0.82,
            options: cands,
          });
        }
      }
    });
  }

  // 3) Word-form phrases.
  for (const { re, fix, note } of WORD_FORMS) {
    for (const m of text.matchAll(re)) {
      const original = m[0];
      add({
        category: "word_form",
        original,
        suggestion: fix(original),
        note: `Use ${note}`,
        severity: 3,
        confidence: 0.92,
      });
    }
  }

  // 3b) Commonly confused words (high-precision rules). The LLM catches the
  // long tail in context; these reliable patterns work offline too.
  const CONFUSABLES: { re: RegExp; fix: string; cat: IssueCategory; note: string; confidence?: number }[] = [
    { re: /\byour\s+welcome\b/gi, fix: "you're welcome", cat: "contraction", note: "Don't forget the apostrophe. “You're” is short for “you are.”", confidence: 0.96 },
    { re: /\byour\s+(gonna|going to)\b/gi, fix: "you're $1", cat: "contraction", note: "Don't forget the apostrophe. “You're” is short for “you are.”", confidence: 0.94 },
    { re: /\btheir\s+(is|are|was|were)\b/gi, fix: "there $1", cat: "context_word", note: "Use “there” when you mean “there is” or “there are.”", confidence: 0.95 },
    { re: /\bthere\s+own\b/gi, fix: "their own", cat: "context_word", note: "Use “their” when something belongs to them.", confidence: 0.98 },
    { re: /\bthere\s+(favorite|family|friend|friends|teacher|teachers|parent|parents|mom|dad|brother|sister|house|home|school|class|team|book|books|story|stories|idea|ideas|reason|reasons|toy|toys|world|work|homework|project|projects|writing|dog|cat|room|game|games)\b/gi, fix: "their $1", cat: "context_word", note: "Use “their” when something belongs to someone.", confidence: 0.9 },
    { re: /\bthere\s+(comfy|cozy|happy|sad|ready|right|wrong|nice|kind|mean|funny|tired|hungry|excited|scared|warm|cold|hot)\b/gi, fix: "they're $1", cat: "context_word", note: "Use “they’re” when you mean “they are.”", confidence: 0.96 },
    { re: /\bto\s+(much|many|late|early|hard|big|small|hot|cold|fast|slow)\b/gi, fix: "too $1", cat: "context_word", note: "Use “too” here because it means “more than enough.”", confidence: 0.94 },
    { re: /\bme\s+to([.!?]|$)/gi, fix: "me too$1", cat: "context_word", note: "Use “too” when it means “also.”", confidence: 0.95 },
    { re: /\b(more|less|better|worse|bigger|smaller|faster|slower|taller|shorter|older|younger|greater|fewer|longer|higher|lower|stronger|nicer|happier|easier|harder|rather)\s+then\b/gi, fix: "$1 than", cat: "context_word", note: "Use “than” when comparing.", confidence: 0.95 },
    { re: /\bits\s+(a|an|the|been|going|gonna|not|so|very|really|time|my)\b/gi, fix: "it's $1", cat: "contraction", note: "Don't forget the apostrophe. “It's” is short for “it is.”", confidence: 0.96 },
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
        confidence: confidence ?? 0.9,
      });
    }
  }

  // 4) Subject–verb agreement.
  // Compound subject + "was" -> "were" (e.g. "My sister and I was").
  for (const m of text.matchAll(/\b([A-Za-z]+)\s+and\s+(I|[A-Za-z]+)\s+(was)\b/gi)) {
    add({
      category: "subject_verb",
      original: m[0],
      suggestion: m[0].replace(/was$/i, "were"),
      note: `That's more than one person, so use “were.”`,
      severity: 3,
    });
  }
  // Singular subject + "were" -> "was" (e.g. "The puppy were").
  const IRREGULAR_PLURAL = new Set([
    "children", "people", "men", "women", "feet", "teeth", "mice", "geese",
    "oxen", "police", "cattle", "fish", "sheep", "deer",
  ]);
  for (const m of text.matchAll(/\b(the|a|an|this|that|my|your|his|her|its|our|their|one)\s+([A-Za-z]+)\s+(were)\b/gi)) {
    const noun = m[2].toLowerCase();
    if (noun.endsWith("s") || IRREGULAR_PLURAL.has(noun)) continue;
    add({
      category: "subject_verb",
      original: `${m[2]} were`,
      suggestion: `${m[2]} was`,
      note: `There's just one ${noun}, so use “was.”`,
      severity: 3,
    });
  }
  // he/she/it + "were" -> "was".
  for (const m of text.matchAll(/\b(he|she|it)\s+(were)\b/gi)) {
    add({
      category: "subject_verb",
      original: m[0],
      suggestion: `${m[1]} was`,
      note: `“${m[1]}” takes “was,” not “were.”`,
      severity: 3,
    });
  }
  // Singular subject + base verb (e.g. "it lick" -> "it licked"/"licks").
  const BASE_VERBS = new Set([
    "lick", "jump", "run", "walk", "play", "look", "want", "need", "eat",
    "help", "work", "talk", "open", "close", "love", "hate", "live", "stay",
    "keep", "turn", "start", "stop", "call", "ask", "move", "smile", "cry",
    "laugh", "bark", "wag", "sit", "stand", "wave", "wish", "hope", "kick",
    "throw", "catch", "hug", "grab", "climb", "chase", "bite", "sniff",
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
      note: pastTense
        ? `Your story is in the past, so “${verb}” becomes “${past}.”`
        : `“${m[1]}” needs “${fixedVerb}.”`,
      severity: 3,
    });
  }
  // Pronoun mismatches.
  for (const m of text.matchAll(/\b(they|we|you)\s+(was)\b/gi)) {
    add({
      category: "subject_verb",
      original: m[0],
      suggestion: `${m[1]} were`,
      note: `“${m[1]}” takes “were,” not “was.”`,
      severity: 3,
    });
  }
  // "I were" (but not the correct subjunctive "if/wish I were").
  for (const m of text.matchAll(/(\bif\s+|\bwish\s+|^)?\bI\s+were\b/gi)) {
    if (m[1]) continue; // subjunctive is fine
    add({
      category: "subject_verb",
      original: "I were",
      suggestion: "I was",
      note: `“I” takes “was” here.`,
      severity: 3,
    });
  }
  // Plural noun + "was".
  for (const m of text.matchAll(/\b([A-Za-z]{3,}s)\s+(was)\b/gi)) {
    const noun = m[1];
    if (NON_PLURAL_S.has(noun.toLowerCase())) continue;
    add({
      category: "subject_verb",
      original: `${noun} was`,
      suggestion: `${noun} were`,
      note: `“${noun}” is more than one, so it takes “were.”`,
      severity: 3,
    });
  }

  // 5) Verb tense (only in clearly past-tense narratives).
  if (pastTense) {
    const pastKeys = Object.keys(PAST_OF).join("|");
    const re = new RegExp(
      `\\b(I|he|she|we|they|you)\\s+((?:[A-Za-z]+\\s+){0,2}?)(${pastKeys})\\b`,
      "gi",
    );
    for (const m of text.matchAll(re)) {
      const middle = m[2].trim().toLowerCase().split(/\s+/).filter(Boolean);
      const verb = m[3].toLowerCase();
      const past = PAST_OF[verb];
      if (!past) continue;
      if (middle.some((w: string) => TENSE_BLOCKERS.has(w))) continue;
      const original = `${m[1]} ${m[2]}${m[3]}`.replace(/\s+/g, " ").trim();
      add({
        category: "verb_tense",
        original,
        suggestion: original.replace(new RegExp(`${m[3]}$`), past),
        note: `Your story is in the past, so “${verb}” becomes “${past}.”`,
        severity: 3,
      });
    }
  }

  // 6) Capitalization — sentence starts + lone "i".
  for (const s of sentences) {
    const first = s.text.match(/[A-Za-z]/);
    if (first && first[0] >= "a" && first[0] <= "z") {
      const firstWord = s.text.split(/\s+/)[0];
      add({
        category: "capitalization",
        original: firstWord,
        suggestion: cap(firstWord),
        note: `Sentences start with a capital letter.`,
        severity: 1.5,
      });
    }
  }
  for (const _m of text.matchAll(/(^|[\s"'(])i([\s.,!?;:"')]|$)/g)) {
    add({
      category: "capitalization",
      original: "i",
      suggestion: "I",
      note: `The word “I” is always capitalized.`,
      severity: 1.5,
    });
    break; // report once
  }

  // 7a) Run-on — a missing sentence boundary before a new clause.
  // Words that can legitimately precede "I" without a break.
  const PRECEDE_OK = new Set([
    "and", "but", "or", "so", "that", "when", "if", "because", "while", "as",
    "than", "then", "where", "what", "which", "since", "before", "after",
    "though", "although", "unless", "until", "think", "thought", "know",
    "knew", "said", "say", "says", "hope", "wish", "guess", "believe", "bet",
    "see", "saw", "feel", "felt", "heard", "hear", "told", "tell", "wonder",
    "remember", "realized", "decided", "hoped", "time", "day",
    "why",
  ]);
  for (const m of text.matchAll(/\b([A-Za-z]+)\s+(I|He|She|They|We)\s+([a-z]+)/g)) {
    const prev = m[1];
    if (/^[A-Z]/.test(prev)) continue; // sentence-initial capital handled elsewhere
    if (PRECEDE_OK.has(prev.toLowerCase())) continue;
    add({
      category: "end_punctuation",
      original: `${m[1]} ${m[2]} ${m[3]}`,
      suggestion: `${m[1]}. ${m[2]} ${m[3]}`,
      note: `This looks like two sentences — add a period before “${m[2]}.”`,
      severity: 2.5,
    });
  }

  // 7) End punctuation — only the final sentence if it has no end mark.
  if (text && !/[.!?]"?$/.test(text)) {
    const last = sentences[sentences.length - 1];
    if (last && last.words.length >= 3) {
      add({
        category: "end_punctuation",
        original: last.text.slice(-40),
        suggestion: `${last.text.replace(/[.!?]*$/, "")}.`,
        note: `End this sentence with a period.`,
        severity: 1.5,
      });
    }
  }

  // 8) Fragments — conservative, evidence-first.
  const fragments: Sentence[] = [];
  for (const s of sentences) {
    const n = s.words.length;
    if (n < 3) continue; // short exclamations are fine
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
        suggestion: danglingClause
          ? `Join it to a full sentence, e.g. “${s.text.replace(/[.!?]*$/, "")}, …”`
          : `Add an action word so this is a full thought.`,
        note: danglingClause
          ? `This starts with “${s.words[0]}” but never finishes the thought.`
          : `This piece is missing its action — it isn't a complete sentence yet.`,
        severity: 4,
        confidence: danglingClause ? 0.86 : 0.8,
      });
    }
  }

  const byCategory = {
    spelling: [], contraction: [], context_word: [], word_form: [], subject_verb: [],
    verb_tense: [], capitalization: [], end_punctuation: [], fragment: [],
  } as Record<IssueCategory, Issue[]>;
  for (const i of issues) byCategory[i.category].push(i);

  return { issues, sentences, fragments, byCategory, pastTense };
}
