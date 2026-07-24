import type { PromptCategory, Skill, WritingLevel } from "./types";
import { scoreFromIssues } from "./analyze";
import {
  diagnose,
  type Diagnosis,
  type Issue,
  type IssueCategory,
  type Sentence,
} from "./diagnostics";
import { challengeItems, type ChallengeItem } from "./revision";
import { brandVoice } from "@/services/brandVoice";

export interface CoachExample {
  original: string;
  suggestion: string;
  note: string;
}

export interface CoachIssue {
  category: IssueCategory;
  type:
    | "Spelling"
    | "Apostrophe"
    | "Context Word"
    | "End punctuation"
    | "Subject/verb agreement"
    | "Common grammar"
    | "Capitalization"
    | "Complete sentence";
  original: string;
  corrected: string;
  suggestion: string;
  note: string;
  options?: string[]; // candidate corrections for "Did you mean X or Y?"
}

export type RubricCategory =
  | "Ideas / Content"
  | "Organization"
  | "Word Choice"
  | "Sentence Fluency"
  | "Conventions";

export interface RubricScore {
  category: RubricCategory;
  score: 1 | 2 | 3 | 4 | 5;
  explanation: string;
}

export interface RevisionChallenge {
  mode: "guided_practice";
  prompt: string;
  totalCorrections: number;
  clues: string[];
  items: ChallengeItem[];
}

export interface SkillSnapshot {
  strengths: string[];
  growing: string[];
}

export interface CoachResult {
  did_well: string;
  improve: string;
  guiding_questions: string[];
  grammar_notes: string | null;
  vocabulary_suggestions: string[];
  encouragement: string;
  examples: CoachExample[];
  all_issues: CoachIssue[];
  scorecard: RubricScore[];
  challenge: RevisionChallenge | null;
  skill_snapshot: SkillSnapshot;
  reflection_prompt: string;
  progress_note: string | null;
  skill_scores: Record<Skill, number>;
  skill_evidence: Record<Skill, string>;
  focus_skills: Skill[];
  source: "openai" | "offline";
}

interface CoachInput {
  grade: number;
  level: WritingLevel;
  category: PromptCategory | null;
  prompt: string;
  text: string;
  scoreHistory?: { category: string; score: number }[];
}

// ── Category helpers ──────────────────────────────────────────────
const DISPLAY_TYPE: Record<IssueCategory, CoachIssue["type"]> = {
  spelling: "Spelling",
  contraction: "Apostrophe",
  context_word: "Context Word",
  end_punctuation: "End punctuation",
  subject_verb: "Subject/verb agreement",
  verb_tense: "Common grammar",
  word_form: "Common grammar",
  capitalization: "Capitalization",
  fragment: "Complete sentence",
};

function groupByCategory(issues: Issue[]): Record<IssueCategory, Issue[]> {
  const c: Record<IssueCategory, Issue[]> = {
    spelling: [], contraction: [], context_word: [], word_form: [], subject_verb: [],
    verb_tense: [], capitalization: [], end_punctuation: [], fragment: [],
  };
  for (const i of issues) c[i.category].push(i);
  return c;
}

function issuePriority(issue: Issue): number {
  if (issue.category === "context_word") return 10;
  if (issue.category === "word_form") return 10;
  if (issue.category === "subject_verb" || issue.category === "verb_tense") return 9;
  if (issue.category === "fragment") return 8;
  if (issue.category === "contraction" || issue.category === "end_punctuation") return 7;
  if (issue.category === "capitalization") return 6;
  if (issue.category === "spelling") return 5;
  return 1;
}

function prioritizedIssues(issues: Issue[]): Issue[] {
  return [...issues].sort((a, b) => issuePriority(b) - issuePriority(a) || b.severity - a.severity);
}

function oneSentenceNote(issue: Issue): string {
  if (issue.category === "spelling") return `This word is spelled “${issue.suggestion}.”`;
  if (issue.category === "contraction") {
    if (issue.suggestion.toLowerCase().startsWith("it's"))
      return `Don't forget the apostrophe; “it's” is short for “it is.”`;
    return `Don't forget the apostrophe in “${issue.suggestion}.”`;
  }
  if (issue.category === "context_word") return issue.note;
  if (issue.category === "word_form" && /\btoo\b/i.test(issue.suggestion)) {
    return `Use “too” here because it means “more than enough.”`;
  }
  return issue.note.replace(/^Almost —\s*/i, "").replace(/\s+/g, " ").trim();
}

function buildAllIssues(issues: Issue[]): CoachIssue[] {
  return prioritizedIssues(issues).slice(0, 10).map((i) => ({
    category: i.category,
    type: DISPLAY_TYPE[i.category],
    original: i.original,
    corrected: i.suggestion,
    suggestion: i.suggestion,
    note: oneSentenceNote(i),
    ...(i.options && i.options.length ? { options: i.options } : {}),
  }));
}

// ── Prioritisation ────────────────────────────────────────────────
type Bucket =
  | "verb_forms" | "spelling" | "contractions"
  | "context_words" | "capitalization" | "end_punctuation" | "sentences";

const BUCKET_OF: Record<IssueCategory, Bucket> = {
  subject_verb: "verb_forms", verb_tense: "verb_forms", word_form: "verb_forms",
  context_word: "context_words",
  spelling: "spelling", contraction: "contractions",
  capitalization: "capitalization", end_punctuation: "end_punctuation",
  fragment: "sentences",
};
const BUCKET_NAME: Record<Bucket, string> = {
  verb_forms: "verb forms", spelling: "spelling",
  contractions: "apostrophes in contractions", capitalization: "capital letters",
  context_words: "commonly confused words",
  end_punctuation: "end punctuation", sentences: "complete sentences",
};
const BUCKET_SKILL: Record<Bucket, Skill> = {
  verb_forms: "grammar", spelling: "grammar", contractions: "punctuation",
  context_words: "grammar",
  capitalization: "capitalization", end_punctuation: "punctuation",
  sentences: "complete_sentences",
};

function rankBuckets(issues: Issue[]): { bucket: Bucket; weight: number; issues: Issue[] }[] {
  const map = new Map<Bucket, { weight: number; issues: Issue[] }>();
  for (const issue of issues) {
    const b = BUCKET_OF[issue.category];
    const entry = map.get(b) ?? { weight: 0, issues: [] };
    entry.weight += issue.severity;
    entry.issues.push(issue);
    map.set(b, entry);
  }
  return [...map.entries()]
    .map(([bucket, v]) => ({ bucket, ...v }))
    .sort((a, b) => b.weight - a.weight);
}

function joinAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

const PLAIN_WORDS: Record<string, string> = {
  good: "helpful, clear, or useful", nice: "kind, cheerful, or thoughtful",
  big: "huge, towering, or enormous", small: "tiny or little",
  happy: "thrilled or delighted", sad: "miserable or gloomy",
  fun: "exciting or thrilling", things: "a more exact noun",
  stuff: "a more exact noun", "a lot": "many or plenty",
};

function vocabularyFromText(text: string): string[] {
  const lower = ` ${text.toLowerCase()} `;
  const found: string[] = [];
  if (/\breally\s+fast\b/i.test(text)) {
    found.push("Try “really fast” → “quickly” or “rapidly.”");
  }
  for (const [word, better] of Object.entries(PLAIN_WORDS)) {
    if (new RegExp(`\\b${word.replace(/ /g, "\\s")}\\b`).test(lower)) {
      found.push(`Try “${word}” → ${better}.`);
    }
    if (found.length >= 2) break;
  }
  if (found.length === 0) {
    found.push("Your word choices are already clear and specific.");
  }
  return found.slice(0, 3);
}

function reflectionPrompt(issues: Issue[]): string {
  if (issues.length === 0) return brandVoice.getReflectionPrompt("general");
  if (issues.some((i) => i.category === "spelling" || i.category === "contraction"))
    return "What did you improve as you edited your writing today?";
  return "What would you like to make even stronger next time?";
}

function categoryKind(category: PromptCategory | null): "narrative" | "opinion" | "informative" | "general" {
  if (category === "narrative" || category === "creative") return "narrative";
  if (category === "opinion") return "opinion";
  if (category === "informative" || category === "summary") return "informative";
  return "general";
}

function evidenceWords(text: string, re: RegExp): string[] {
  return [...new Set((text.match(re) ?? []).map((w) => w.toLowerCase()))];
}

function buildStrength(
  text: string,
  c: Record<IssueCategory, Issue[]>,
  fragments: Sentence[],
  sentenceCount: number,
  category: PromptCategory | null,
): string {
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim()).length;
  const kind = categoryKind(category);
  const spellingGrammar =
    c.spelling.length + c.context_word.length + c.subject_verb.length + c.verb_tense.length + c.word_form.length;
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
    return "You organized your ideas into clear paragraphs — that structure really helps your reader.";
  if (cleanMechanics && fragments.length === 0 && sentenceCount >= 3)
    return "You wrote in complete, careful sentences and kept your ideas clear from start to finish.";
  if (wordCount >= 60)
    return "You stayed focused on the prompt and gave your writing real detail — nice effort.";
  return "You stayed focused on the prompt and put your own real ideas on the page.";
}

function issuePatternSummary(ranked: ReturnType<typeof rankBuckets>): string {
  if (!ranked.length) return "adding one stronger detail";
  const top = ranked.slice(0, 2).map((r) => BUCKET_NAME[r.bucket]);
  return joinAnd(top);
}

function buildGrammarNote(c: Record<IssueCategory, Issue[]>, ranked: ReturnType<typeof rankBuckets>): string | null {
  const punctIssues = [...c.contraction, ...c.end_punctuation];
  const topBuckets = new Set(ranked.slice(0, 2).map((r) => r.bucket));
  if (topBuckets.has("contractions") && c.contraction.length) return null;
  if (topBuckets.has("end_punctuation") && c.end_punctuation.length) return null;
  if (topBuckets.has("context_words") && c.context_word.length) return null;
  if (topBuckets.has("verb_forms") && (c.subject_verb.length || c.word_form.length || c.verb_tense.length)) return null;
  if (topBuckets.has("spelling") && c.contraction.length === 0 && punctIssues.length === 0) return null;
  if (c.contraction.length)
    return `Watch apostrophes in contractions, like “${c.contraction[0].original}” → “${c.contraction[0].suggestion}.”`;
  if (c.end_punctuation.length)
    return `Check where sentences stop, like “${c.end_punctuation[0].original}.”`;
  if (c.subject_verb.length)
    return `Make subjects and verbs match, like “${c.subject_verb[0].original}” → “${c.subject_verb[0].suggestion}.”`;
  if (c.context_word.length)
    return `Check commonly confused words, like “${c.context_word[0].original}” → “${c.context_word[0].suggestion}.”`;
  if (c.word_form.length)
    return `Check small word choices, like “${c.word_form[0].original}” → “${c.word_form[0].suggestion}.”`;
  return null;
}

function clampRubric(n: number): 1 | 2 | 3 | 4 | 5 {
  return Math.max(1, Math.min(5, Math.round(n))) as 1 | 2 | 3 | 4 | 5;
}

function buildScorecard(
  input: CoachInput,
  issues: Issue[],
  fragments: Sentence[],
  sentenceCount: number,
): RubricScore[] {
  const text = input.text.trim();
  const words = text ? text.split(/\s+/) : [];
  const wordCount = words.length;
  const c = groupByCategory(issues);
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
  const fluencyBase = fragments.length === 0 ? (sentenceCount >= 5 ? 4.2 : 3.6) : 3.0 - fragments.length * 0.3;
  const conventionBase = 5 - conventionErrors * 0.45;

  return [
    {
      category: "Ideas / Content",
      score: clampRubric(ideasBase),
      explanation:
        brandVoice.getScorecardExplanation("Ideas / Content", clampRubric(ideasBase)),
    },
    {
      category: "Organization",
      score: clampRubric(orgBase),
      explanation: transitions.length
        ? `The order is easy to follow, with linking words like ${transitions.slice(0, 3).join(", ")}.`
        : brandVoice.getScorecardExplanation("Organization", clampRubric(orgBase)),
    },
    {
      category: "Word Choice",
      score: clampRubric(wordBase),
      explanation: vocabularyFromText(text)[0]?.startsWith("Your word choices")
        ? brandVoice.getScorecardExplanation("Word Choice", clampRubric(wordBase))
        : brandVoice.getScorecardExplanation("Word Choice", clampRubric(wordBase)),
    },
    {
      category: "Sentence Fluency",
      score: clampRubric(fluencyBase),
      explanation: fragments.length
        ? brandVoice.getScorecardExplanation("Sentence Fluency", clampRubric(fluencyBase))
        : brandVoice.getScorecardExplanation("Sentence Fluency", clampRubric(fluencyBase)),
    },
    {
      category: "Conventions",
      score: clampRubric(conventionBase),
      explanation: conventionErrors
        ? brandVoice.getScorecardExplanation("Conventions", clampRubric(conventionBase))
        : brandVoice.getScorecardExplanation("Conventions", clampRubric(conventionBase)),
    },
  ];
}

function buildChallenge(issues: Issue[]): RevisionChallenge | null {
  if (!issues.length) return null;
  const items = challengeItems(buildAllIssues(issues));
  return {
    mode: "guided_practice",
    prompt: "Can you make your writing even stronger?",
    totalCorrections: items.length,
    clues: items.map((item) => item.clue),
    items,
  };
}

function buildSkillSnapshot(
  scores: Record<Skill, number>,
  evidence: Record<Skill, string>,
  issues: Issue[],
): SkillSnapshot {
  const c = groupByCategory(issues);
  const strengths: string[] = [];
  const growing: string[] = [];

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
    growing: [...new Set(growing)].slice(0, 3),
  };
}

function buildProgressNote(history: CoachInput["scoreHistory"], scorecard: RubricScore[]): string | null {
  if (!history?.length) return null;
  const byCategory = new Map<string, number[]>();
  for (const row of history) {
    byCategory.set(row.category, [...(byCategory.get(row.category) ?? []), row.score]);
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

// The single deterministic builder: every score, the growth note, praise,
// grammar notes, and the mistake list all come from the error set — never
// from a model's impression.
function buildDeterministic(
  input: CoachInput,
  issues: Issue[],
  fragments: Sentence[],
  sentenceCount: number,
) {
  const simple = input.grade <= 5;
  const c = groupByCategory(issues);
  const { scores, evidence } = scoreFromIssues(
    input.text, issues, fragments, sentenceCount,
  );
  const ranked = rankBuckets(issues);

  const examples: CoachExample[] = [];
  const used = new Set<string>();
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

  let improve: string;
  let focus_skills: Skill[];
  if (ranked.length > 0) {
    const top = ranked.slice(0, 2);
    const names = joinAnd(top.map((t) => BUCKET_NAME[t.bucket]));
    improve = simple
      ? `Let's work on ${names}. Small fixes here will make a big difference!`
      : `Your main growth area is ${names}. These are small, fixable patterns — clean them up and your writing will read much more smoothly.`;
    focus_skills = [...new Set(top.map((t) => BUCKET_SKILL[t.bucket]))];
  } else {
    improve =
      `${brandVoice.getEncouragement("clean")} Next time, let's challenge you with a more advanced writing skill.`;
    focus_skills = [];
  }

  const grammar_notes = buildGrammarNote(c, ranked);

  const topBucket = ranked[0]?.bucket;
  const questions: string[] = [];
  if (topBucket === "verb_forms") {
    questions.push("Read your writing out loud — do the action words match when things happened (past vs. now)?");
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
    simple
      ? "Can you read it out loud and fix anything that sounds off?"
      : "Which sentence is your strongest, and how could you make another one just as strong?",
  );

  const scorecard = buildScorecard(input, issues, fragments, sentenceCount);

  return {
    did_well: buildStrength(input.text, c, fragments, sentenceCount, input.category),
    improve,
    guiding_questions: questions.slice(0, 3),
    grammar_notes,
    vocabulary_suggestions: vocabularyFromText(input.text),
    encouragement: ranked.length
      ? `Great job ${categoryKind(input.category) === "informative" ? "explaining your topic" : "getting your ideas down"}. Work on ${issuePatternSummary(ranked)} and your writing will be even clearer.`
      : brandVoice.getEncouragement("clean"),
    examples,
    all_issues: buildAllIssues(issues),
    scorecard,
    challenge: buildChallenge(issues),
    skill_snapshot: buildSkillSnapshot(scores, evidence, issues),
    reflection_prompt: input.category
      ? brandVoice.getReflectionPrompt(input.category, input.grade, input.text)
      : reflectionPrompt(issues),
    progress_note: buildProgressNote(input.scoreHistory, scorecard),
    skill_scores: scores,
    skill_evidence: evidence,
    focus_skills,
  };
}

export function offlineCoach(input: CoachInput): CoachResult {
  const d = diagnose(input.text);
  const core = buildDeterministic(input, d.issues, d.fragments, d.sentences.length);
  return { ...core, source: "offline" };
}

// ── LLM contextual proofreading ───────────────────────────────────
interface LLMError {
  original?: unknown;
  suggestion?: unknown;
  type?: unknown;
  note?: unknown;
  options?: unknown;
}

const LLM_TYPE_TO_CATEGORY: Record<string, { category: IssueCategory; severity: number }> = {
  spelling: { category: "spelling", severity: 2 },
  grammar: { category: "word_form", severity: 3 },
  context_word: { category: "context_word", severity: 3 },
  "context word": { category: "context_word", severity: 3 },
  homophone: { category: "context_word", severity: 3 },
  punctuation: { category: "end_punctuation", severity: 2.5 },
  capitalization: { category: "capitalization", severity: 1.5 },
};

const ONE_BEST_SPELLINGS = new Set(["carefull", "usefull", "beutiful", "dissagree", "foward", "intresting"]);

function llmErrorToIssue(e: {
  original: string;
  suggestion: string;
  type: string;
  note: string;
  options?: string[];
}): Issue {
  const m = LLM_TYPE_TO_CATEGORY[e.type.toLowerCase()] ?? { category: "word_form" as IssueCategory, severity: 2.5 };
  return {
    category: m.category,
    original: e.original,
    suggestion: e.suggestion,
    note: e.note || "Take another look at this.",
    severity: m.severity,
    ...(e.options && e.options.length ? { options: e.options } : {}),
  };
}

// Validate LLM errors against the text (no hallucinations, no rewrites) and
// merge with the deterministic detector so nothing it found is ever lost.
// Exported for tests.
export function validateAndMerge(
  text: string,
  d: Diagnosis,
  llmErrors: LLMError[],
): Issue[] {
  const lowerText = text.toLowerCase();
  const merged: Issue[] = [];
  const seen: string[] = [];
  const norm = (s: string) => s.toLowerCase().trim();
  const overlaps = (orig: string) => {
    const o = norm(orig);
    return seen.some((s) => s === o || s.includes(o) || o.includes(s));
  };

  // 1) Validated LLM errors first — these carry the in-context corrections.
  for (const raw of llmErrors) {
    const original = typeof raw.original === "string" ? raw.original.trim() : "";
    const suggestion = typeof raw.suggestion === "string" ? raw.suggestion.trim() : "";
    const type = typeof raw.type === "string" ? raw.type : "grammar";
    const note = typeof raw.note === "string" ? raw.note : "";
    if (!original || !suggestion) continue;
    if (!lowerText.includes(norm(original))) continue; // anti-hallucination
    if (norm(original) === norm(suggestion)) continue;
    // Reject rewrites: a correction shouldn't balloon the span.
    if (suggestion.length > original.length + 30) continue;
    if (suggestion.split(/\s+/).length > original.split(/\s+/).length + 4) continue;
    if (overlaps(original)) continue;

    // Normalize options for "Did you mean X or Y?" (spelling especially).
    let options: string[] | undefined;
    if (Array.isArray(raw.options)) {
      options = raw.options
        .filter((o): o is string => typeof o === "string" && o.trim().length > 0)
        .map((o) => o.trim())
        .slice(0, 3);
    }
    if (type.toLowerCase() === "spelling") {
      if (ONE_BEST_SPELLINGS.has(norm(original))) {
        options = [suggestion];
      } else {
        options = options && options.length ? options : [suggestion];
      }
      // Ensure the chosen suggestion is the first option.
      if (!options.some((o) => o.toLowerCase() === suggestion.toLowerCase())) {
        options = [suggestion, ...options].slice(0, 3);
      }
    }

    merged.push(llmErrorToIssue({ original, suggestion, type, note, options }));
    seen.push(norm(original));
  }

  // 2) Everything the deterministic detector found that the LLM didn't cover.
  // Guarantees no misspelling or known pattern is ever dropped.
  for (const i of d.issues) {
    if (overlaps(i.original)) continue;
    merged.push(i);
    seen.push(norm(i.original));
  }

  return merged;
}

interface ProofreadResult {
  errors: LLMError[];
  guiding_questions: string[];
  encouragement: string;
}

async function proofreadWithLLM(
  input: CoachInput,
  d: Diagnosis,
): Promise<ProofreadResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const band =
    input.grade <= 5
      ? `The student is in grade ${input.grade}. Use short, simple, warm language.`
      : `The student is in grade ${input.grade}. You may be more specific and detailed, but stay encouraging.`;
  const detected = d.byCategory.spelling.map((i) => i.original);
  const detectedLine = detected.length
    ? `The automated checker already flagged these likely-misspelled words: ${detected.join(", ")}. You MUST give an in-context correction for each — choose the word the child most likely meant given the sentence (e.g. "a box of cookes" → "cookies", not "cooked").`
    : `The automated checker found no clear misspellings, but read carefully for any it might have missed.`;

  const system = `You are a meticulous, kind proofreader for a child's writing (grades 3–8). ${band}

Find EVERY real error and give a correction that fits the SENTENCE CONTEXT.
- Cover spelling, grammar (subject–verb agreement, verb tense, verb form), punctuation (missing/runaway), capitalization, and WRONG-WORD / homophone mistakes a spell-checker misses (their/there/they're, your/you're, to/too/two, then/than, its/it's, are/our).
- For each error, give the exact text span EXACTLY as it appears in the writing, the corrected version (a few words at most — NEVER rewrite a whole sentence), the type, and a short kid-friendly reason.
- For SPELLING errors, choose ONE best correction from sentence context. Only include multiple "options" when the sentence is genuinely ambiguous. If one form clearly fits, options should contain only that correction.
- Rank errors by learning importance: meaning-changing errors first, then grammar, punctuation, spelling, and style last. Do not overwhelm the student with tiny style suggestions.
- Do NOT invent errors. Do NOT flag correct text. Only list genuine mistakes.

Return ONLY JSON:
{
  "errors": [ { "original": string, "suggestion": string, "type": "spelling"|"grammar"|"punctuation"|"capitalization", "note": string, "options": string[] } ],
  "guiding_questions": string[],   // 2-3 warm questions to help them revise
  "encouragement": string          // one warm closing line
}`;

  const user = `Prompt: "${input.prompt}"
${detectedLine}

The student's writing (proofread it — do NOT rewrite it):
"""
${input.text}
"""`;

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      errors: Array.isArray(parsed.errors) ? parsed.errors : [],
      guiding_questions: Array.isArray(parsed.guiding_questions)
        ? parsed.guiding_questions.filter((q: unknown) => typeof q === "string" && q.length > 3).slice(0, 3)
        : [],
      encouragement:
        typeof parsed.encouragement === "string" && parsed.encouragement.length > 3
          ? parsed.encouragement
          : "",
    };
  } catch (err) {
    console.error("LLM proofread failed, using offline coach:", err);
    return null;
  }
}

export async function coachWriting(
  input: CoachInput,
  opts: { allowAI: boolean },
): Promise<CoachResult> {
  const d = diagnose(input.text);
  if (!opts.allowAI) return offlineCoach(input);
  if (!process.env.OPENAI_API_KEY) return offlineCoach(input);

  const llm = await proofreadWithLLM(input, d);
  if (!llm) return offlineCoach(input);

  // Merge contextual LLM corrections with the deterministic detector.
  const merged = validateAndMerge(input.text, d, llm.errors);

  // All praise, scores, and the growth note are computed deterministically
  // from the merged error set — the model can never reintroduce false praise.
  const core = buildDeterministic(input, merged, d.fragments, d.sentences.length);

  return {
    ...core,
    guiding_questions: llm.guiding_questions.length ? llm.guiding_questions : core.guiding_questions,
    encouragement: llm.encouragement || core.encouragement,
    source: "openai",
  };
}
