import { diagnose } from "./diagnostics";
import type { IssueCategory } from "./diagnostics";
import { brandVoice } from "@/services/brandVoice";

export interface RevisionIssue {
  category: IssueCategory | string;
  type?: string;
  original: string;
  corrected?: string;
  suggestion?: string;
  note?: string;
}

export interface ChallengeItem {
  id: string;
  category: IssueCategory | string;
  label: string;
  clue: string;
  strongerClue: string;
}

export interface RevisionProgressItem extends ChallengeItem {
  fixed: boolean;
}

export interface RevisionCheckResult {
  fixed: { original: string; corrected: string }[];
  remaining: { original: string; corrected: string; clue: string }[];
  newMistakes: {
    category: string;
    original: string;
    corrected: string;
    explanation: string;
  }[];
  progress: RevisionProgressItem[];
  celebration: string;
}

export function shouldShowAnswers({
  teacherMode,
  reviewMode,
  attempted,
}: {
  teacherMode: boolean;
  reviewMode: "guided" | "direct";
  attempted: boolean;
}): boolean {
  return teacherMode || reviewMode === "direct" || attempted;
}

export function norm(s: string) {
  return s.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
}

function correctionOf(issue: RevisionIssue): string {
  return issue.corrected ?? issue.suggestion ?? "";
}

function spellingMeaning(word: string): string | null {
  const lower = word.toLowerCase();
  if (lower === "forward") return "moving ahead";
  if (lower === "careful") return "being safe and paying attention";
  if (lower === "useful") return "helpful";
  if (lower === "beautiful") return "very pretty";
  if (lower === "disagree") return "not agreeing";
  return null;
}

export function challengeLabel(issue: RevisionIssue): string {
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

export function clueForIssue(issue: RevisionIssue, attempt = 0): string {
  const corrected = correctionOf(issue);
  if (issue.category === "spelling") {
    const meaning = spellingMeaning(corrected);
    if (meaning) {
      return attempt >= 2
        ? `Check the spelling of the word that means ${meaning}: “${corrected}.”`
        : `Look closely at the word that means ${meaning}.`;
    }
    return attempt >= 2
      ? `Check the spelling of “${corrected}.”`
      : "One word is spelled almost right, but one or two letters need checking.";
  }
  if (issue.category === "contraction") {
    return attempt >= 2
      ? `Look for the missing apostrophe in “${corrected}.”`
      : "One contraction is missing an apostrophe.";
  }
  if (issue.category === "word_form") {
    if (/\btoo\b/i.test(corrected)) {
      return attempt >= 2
        ? `One sentence needs “too” because it means more than enough.`
        : "One sentence uses the wrong version of “too.”";
    }
    return "One sentence has a small grammar word to check.";
  }
  if (issue.category === "context_word") {
    return attempt >= 2
      ? `Check the commonly confused word that should be “${corrected}.”`
      : "One commonly confused word doesn't fit its meaning.";
  }
  if (issue.category === "end_punctuation") return "One sentence needs a clearer stopping place.";
  if (issue.category === "capitalization") return "One word needs a capital letter.";
  if (issue.category === "fragment") return "One thought may need a subject and an action.";
  return "One grammar choice needs a closer look.";
}

export function challengeItems(issues: RevisionIssue[]): ChallengeItem[] {
  return issues.map((issue, index) => ({
    id: `${issue.category}:${norm(issue.original)}:${index}`,
    category: issue.category,
    label: challengeLabel(issue),
    clue: clueForIssue(issue, 0),
    strongerClue: clueForIssue(issue, 2),
  }));
}

export function evaluateRevision(
  revisedText: string,
  issues: RevisionIssue[],
  attempt = 1,
): RevisionCheckResult {
  const text = norm(revisedText);
  const fixed: { original: string; corrected: string }[] = [];
  const remaining: { original: string; corrected: string; clue: string }[] = [];
  const progress = challengeItems(issues).map((item, index) => {
    const issue = issues[index];
    const corrected = correctionOf(issue);
    const hasOriginal = text.includes(norm(issue.original));
    const hasCorrection = corrected ? text.includes(norm(corrected)) : false;
    const isFixed = Boolean(corrected && !hasOriginal && hasCorrection);
    if (isFixed) fixed.push({ original: issue.original, corrected });
    else remaining.push({ original: issue.original, corrected, clue: clueForIssue(issue, attempt) });
    return { ...item, clue: clueForIssue(issue, attempt), fixed: isFixed };
  });

  const knownOriginals = new Set(issues.map((i) => norm(i.original)));
  const knownCorrections = new Set(issues.map((i) => norm(correctionOf(i))).filter(Boolean));
  const newMistakes = diagnose(revisedText).issues
    .filter((issue) => {
      const original = norm(issue.original);
      return !knownOriginals.has(original) && !knownCorrections.has(original);
    })
    .map((issue) => ({
      category: issue.category,
      original: issue.original,
      corrected: issue.suggestion,
      explanation: issue.note,
    }));

  let celebration: string;
  if (issues.length > 0 && fixed.length === issues.length) {
    celebration = `${brandVoice.getEncouragement("complete")} You found all ${issues.length} growth spots.`;
  } else if (fixed.length > 0 && remaining.length === 1) {
    celebration = `${brandVoice.getEncouragement("partial")} You found ${fixed.length} of ${issues.length}. Only one is left.`;
  } else if (fixed.length > 0) {
    const spellingFixed = fixed.some((f) =>
      issues.some((i) => i.category === "spelling" && i.original === f.original),
    );
    celebration = spellingFixed
      ? `${brandVoice.getEncouragement("partial")} You found a spelling spot. Keep looking for one more.`
      : `${brandVoice.getEncouragement("partial")} You found ${fixed.length} of ${issues.length}. Keep looking; you're getting closer.`;
  } else {
    celebration = brandVoice.getEncouragement("tryAgain");
  }

  return { fixed, remaining, newMistakes, progress, celebration };
}
