// Real English spell-checking via nspell + the Hunspell en dictionary.
// Loaded once, synchronously, and cached. Server-side only (the feedback
// route runs in Node). Falls back gracefully if the dictionary can't load.

import nspell from "nspell";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

type Speller = ReturnType<typeof nspell>;

let speller: Speller | null = null;
let tried = false;

// Kid-common / informal words the base dictionary may not include, plus
// words we never want flagged.
const ALLOW = new Set([
  "ok", "okay", "yay", "uh", "um", "mom", "dad", "grandma", "grandpa",
  "puppy", "kitty", "selfie", "emoji", "online", "website", "backpack",
]);

function dictionaryDir(): string | null {
  try {
    const require = createRequire(import.meta.url);
    const resolved = require.resolve("dictionary-en");
    if (typeof resolved === "string") {
      const dir = dirname(resolved);
      if (existsSync(join(dir, "index.aff")) && existsSync(join(dir, "index.dic"))) {
        return dir;
      }
    }
  } catch {
    // Fall through to the app-root lookup below.
  }

  const appRootDir = join(process.cwd(), "node_modules", "dictionary-en");
  if (existsSync(join(appRootDir, "index.aff")) && existsSync(join(appRootDir, "index.dic"))) {
    return appRootDir;
  }

  return null;
}

function init(): Speller | null {
  if (tried) return speller;
  tried = true;
  try {
    const dir = dictionaryDir();
    if (!dir) throw new Error("dictionary-en files not found");
    const aff = readFileSync(join(dir, "index.aff"));
    const dic = readFileSync(join(dir, "index.dic"));
    speller = nspell(aff, dic);
  } catch (err) {
    console.error("spell checker unavailable, using fallback:", err);
    speller = null;
  }
  return speller;
}

export function spellReady(): boolean {
  return init() !== null;
}

export function isMisspelled(word: string): boolean {
  const s = init();
  if (!s) return false;
  const w = word.trim();
  if (w.length < 3) return false;
  if (/\d/.test(w)) return false;
  if (ALLOW.has(w.toLowerCase())) return false;
  if (s.correct(w)) return false;
  // Accept if the lowercased form is valid (handles sentence-initial caps).
  if (s.correct(w.toLowerCase())) return false;
  return true;
}

// Levenshtein distance for ranking candidates by closeness.
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function sharedPrefix(a: string, b: string): number {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
}

// Ranked list of plausible corrections (closest first). Used to offer the
// student a choice — "Did you mean X or Y?" — instead of auto-picking.
// Form-based ranking can't always surface the word the child *meant*
// (that needs sentence context, which the LLM layer provides); it just
// keeps the offered options sensible and close in spelling.
export function suggestions(word: string, max = 3): string[] {
  const s = init();
  if (!s) return [];
  const raw = s.suggest(word);
  if (!raw.length) return [];
  const lower = word.toLowerCase();
  const scored = raw
    .filter((cand) => !cand.includes("'") && !cand.includes(" ")) // drop possessives / phrases
    .map((cand) => {
      const cl = cand.toLowerCase();
      const dist = editDistance(lower, cl);
      const prefix = sharedPrefix(lower, cl);
      const lenGap = Math.abs(cand.length - word.length) * 0.3;
      // Lower is better: closeness + a strong bonus for sharing the start.
      const score = dist - prefix * 0.6 + lenGap + (cl[0] === lower[0] ? 0 : 3);
      return { cand, score };
    });
  scored.sort((a, b) => a.score - b.score);
  const out: string[] = [];
  for (const { cand } of scored) {
    if (!out.some((o) => o.toLowerCase() === cand.toLowerCase())) out.push(cand);
    if (out.length >= max) break;
  }
  return out;
}

// Best single correction (kept for callers that only need one).
export function bestSuggestion(word: string): string | null {
  return suggestions(word, 1)[0] ?? null;
}
