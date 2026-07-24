import type { Skill } from "./types";
import {
  diagnose,
  type Diagnosis,
  type Issue,
  type IssueCategory,
  type Sentence,
} from "./diagnostics";

export interface SkillAssessment {
  scores: Record<Skill, number>;
  evidence: Record<Skill, string>;
}

const clamp = (n: number) => Math.max(5, Math.min(100, Math.round(n)));

function list(issues: Issue[], max = 2): string {
  return issues
    .slice(0, max)
    .map((i) => `“${i.original}”→“${i.suggestion}”`)
    .join(", ");
}

function groupByCategory(issues: Issue[]): Record<IssueCategory, Issue[]> {
  const c: Record<IssueCategory, Issue[]> = {
    spelling: [], contraction: [], context_word: [], word_form: [], subject_verb: [],
    verb_tense: [], capitalization: [], end_punctuation: [], fragment: [],
  };
  for (const i of issues) c[i.category].push(i);
  return c;
}

// Score the ten skills from a given error set + the text. Works for the
// offline diagnosis OR the merged (rules + validated LLM) error set.
export function scoreFromIssues(
  rawText: string,
  issues: Issue[],
  fragments: Sentence[],
  sentenceCount: number,
): SkillAssessment {
  const text = rawText.trim();
  const words = text ? text.split(/\s+/) : [];
  const wordCount = words.length;
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const c = groupByCategory(issues);

  const scores = {} as Record<Skill, number>;
  const evidence = {} as Record<Skill, string>;

  if (fragments.length === 0) {
    scores.complete_sentences = clamp(88 + Math.min(sentenceCount, 6));
    evidence.complete_sentences =
      sentenceCount > 0
        ? `All ${sentenceCount} sentences are complete thoughts.`
        : "Write a sentence or two to get started.";
  } else {
    scores.complete_sentences = clamp(90 - fragments.length * 22);
    evidence.complete_sentences = `Incomplete: “${fragments[0].text}”`;
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
    ...c.subject_verb, ...c.verb_tense, ...c.word_form, ...c.context_word, ...c.spelling,
  ];
  if (grammarIssues.length === 0) {
    scores.grammar = 90;
    evidence.grammar = "No grammar, spelling, or verb errors found.";
  } else {
    scores.grammar = clamp(92 - grammarIssues.length * 11);
    evidence.grammar = `Fix: ${list(grammarIssues, 3)}.`;
  }

  scores.paragraph_structure = clamp(
    paragraphs.length > 1 ? 72 + paragraphs.length * 5 : wordCount > 90 ? 50 : 62,
  );
  evidence.paragraph_structure =
    paragraphs.length > 1
      ? `${paragraphs.length} paragraphs — nicely separated.`
      : "Try breaking your writing into paragraphs for each new idea.";

  const transitionWords =
    text.match(
      /\b(first|next|then|after|finally|however|because|also|for example|in addition|meanwhile|therefore|although|on the other hand|suddenly|later)\b/gi,
    ) || [];
  scores.transitions = clamp(48 + transitionWords.length * 9);
  evidence.transitions = transitionWords.length
    ? `Used linking words: ${[...new Set(transitionWords.map((w) => w.toLowerCase()))].slice(0, 3).join(", ")}.`
    : "Add linking words (first, then, because) to connect ideas.";

  const unique = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z']/g, "")));
  const ttr = wordCount ? unique.size / wordCount : 0;
  scores.vocabulary = clamp(40 + ttr * 75);
  evidence.vocabulary =
    ttr > 0.6 ? "Good variety of words." : "Try swapping a few plain words for more exact ones.";

  scores.supporting_details = clamp(38 + Math.min(wordCount, 200) / 3);
  evidence.supporting_details =
    wordCount > 120
      ? "Plenty of detail to support your ideas."
      : "Add an example or two to back up your main idea.";

  scores.organization = clamp((scores.paragraph_structure + scores.transitions) / 2);
  evidence.organization =
    scores.organization > 65
      ? "Ideas flow in a clear order."
      : "Put your ideas in an order a reader can follow.";

  scores.writing_stamina = clamp((wordCount / 200) * 100);
  evidence.writing_stamina = `${wordCount} words written.`;

  const avgLen = wordCount / (sentenceCount || 1);
  if (fragments.length === 0 && avgLen < 4) {
    scores.complete_sentences = clamp(scores.complete_sentences - 10);
    evidence.complete_sentences = "Sentences are very short — try expanding a few.";
  }

  return { scores, evidence };
}

export interface AssessResult extends SkillAssessment {
  diagnosis: Diagnosis;
}

export function assess(rawText: string): AssessResult {
  const d = diagnose(rawText);
  return {
    ...scoreFromIssues(rawText, d.issues, d.fragments, d.sentences.length),
    diagnosis: d,
  };
}
