"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CATEGORY_LABELS,
  type PromptCategory,
  type Skill,
} from "@/lib/types";
import { shouldShowAnswers } from "@/lib/revision-ui";
import {
  createOfflineFeedback,
  loadPrompt,
  saveSubmission,
  type PromptPayload,
} from "@/lib/static-app";
import { brandVoice } from "@/services/brandVoice";

interface Prompt {
  submissionId?: string | null;
  prompt_id: string | null;
  title: string;
  body: string;
  category: PromptCategory;
  character_trait: string | null;
  content?: string;
}

interface PromptLimit {
  limitReached: true;
  plan: string;
  resetsInDays: number;
}

interface Feedback {
  did_well: string;
  improve: string;
  guiding_questions: string[];
  grammar_notes: string | null;
  vocabulary_suggestions: string[];
  encouragement: string;
  examples: { original: string; suggestion: string; note: string }[];
  all_issues: {
    category: string;
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
    corrected?: string;
    suggestion: string;
    note: string;
    options?: string[];
  }[];
  scorecard: {
    category: "Ideas / Content" | "Organization" | "Word Choice" | "Sentence Fluency" | "Conventions";
    score: 1 | 2 | 3 | 4 | 5;
    explanation: string;
  }[];
  challenge: {
    mode: "guided_practice";
    prompt: string;
    totalCorrections: number;
    clues: string[];
    items: {
      id: string;
      category: string;
      label: string;
      clue: string;
      strongerClue: string;
    }[];
  } | null;
  skill_snapshot: {
    strengths: string[];
    growing: string[];
  };
  reflection_prompt: string;
  progress_note: string | null;
  skill_scores: Record<Skill, number>;
  skill_evidence: Record<Skill, string>;
  focus_skills: Skill[];
  source: "openai" | "offline";
  aiStatus: "active" | "disabled" | "cap_reached" | "rate_limited";
  remainingMonthlyChecks: number;
}

interface FixCheck {
  fixed: { original: string; corrected: string }[];
  remaining: { original: string; corrected: string; clue: string }[];
  newMistakes: {
    category: string;
    original: string;
    corrected: string;
    explanation: string;
  }[];
  progress: {
    id: string;
    category: string;
    label: string;
    clue: string;
    strongerClue: string;
    fixed: boolean;
  }[];
  celebration: string;
}

function wordCount(t: string) {
  const s = t.trim();
  return s ? s.split(/\s+/).length : 0;
}

function groupedProgress(
  items: { label: string; fixed: boolean }[],
): { label: string; total: number; fixed: number }[] {
  const map = new Map<string, { label: string; total: number; fixed: number }>();
  for (const item of items) {
    const entry = map.get(item.label) ?? { label: item.label, total: 0, fixed: 0 };
    entry.total += 1;
    if (item.fixed) entry.fixed += 1;
    map.set(item.label, entry);
  }
  return [...map.values()];
}

function norm(s: string) {
  return s.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
}

function checkKnownFixes(
  revisedText: string,
  issues: Feedback["all_issues"],
  attempt: number,
): FixCheck {
  const text = norm(revisedText);
  const fixed: FixCheck["fixed"] = [];
  const remaining: FixCheck["remaining"] = [];
  const progress = issues.map((issue, index) => {
    const corrected = issue.corrected ?? issue.suggestion ?? "";
    const hasOriginal = text.includes(norm(issue.original));
    const hasCorrection = corrected ? text.includes(norm(corrected)) : false;
    const isFixed = Boolean(corrected && !hasOriginal && hasCorrection);
    const clue =
      attempt >= 2
        ? issue.note || `Check “${corrected}.”`
        : issue.note || "Look for one small fix in this category.";
    if (isFixed) fixed.push({ original: issue.original, corrected });
    else remaining.push({ original: issue.original, corrected, clue });
    return {
      id: `${issue.category}:${norm(issue.original)}:${index}`,
      category: issue.category,
      label: issue.type,
      clue,
      strongerClue: issue.note || clue,
      fixed: isFixed,
    };
  });

  let celebration = "Good effort! Keep looking for the next growth spot.";
  if (issues.length > 0 && fixed.length === issues.length) {
    celebration = `Excellent! You found all ${issues.length} growth spots.`;
  } else if (fixed.length > 0 && remaining.length === 1) {
    celebration = `Nice work! You found ${fixed.length} of ${issues.length}. Only one is left.`;
  } else if (fixed.length > 0) {
    celebration = `Nice work! You found ${fixed.length} of ${issues.length}. Keep going.`;
  }

  return { fixed, remaining, newMistakes: [], progress, celebration };
}

export function WritingEditor({
  studentId,
  studentName,
  minWords,
  initialCategory,
}: {
  studentId: string;
  studentName: string;
  minWords: number;
  initialCategory?: PromptCategory;
}) {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [promptLimit, setPromptLimit] = useState<PromptLimit | null>(null);
  const [loadingPrompt, setLoadingPrompt] = useState(true);
  const [content, setContent] = useState("");
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [reviewMode, setReviewMode] = useState<"guided" | "direct">("guided");
  const [teacherMode, setTeacherMode] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [reflection, setReflection] = useState("");
  const [checkingFixes, setCheckingFixes] = useState(false);
  const [fixCheck, setFixCheck] = useState<FixCheck | null>(null);
  const [coaching, setCoaching] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const words = wordCount(content);
  const pct = Math.min(100, Math.round((words / minWords) * 100));
  const answersVisible = shouldShowAnswers({
    teacherMode,
    reviewMode,
    attempted: Boolean(fixCheck),
  });
  const copy = brandVoice.messages.writing;

  const fetchPrompt = useCallback(async (forceNew = false) => {
    setLoadingPrompt(true);
      setFeedback(null);
      setFixCheck(null);
    setError(null);
    try {
      const data = await loadPrompt({ studentId, category: initialCategory, forceNew });
      if ("limitReached" in data && data.limitReached) {
        setPrompt(null);
        setPromptLimit(data);
        setSubmissionId(null);
        return;
      }
      const promptData = data as PromptPayload;
      setPromptLimit(null);
      setPrompt(promptData);
      setSubmissionId(promptData.submissionId ?? null);
      setContent(promptData.content ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load a prompt.");
    } finally {
      setLoadingPrompt(false);
    }
  }, [studentId, initialCategory]);

  useEffect(() => {
    fetchPrompt(false);
  }, [fetchPrompt]);

  async function save(status: "draft" | "submitted") {
    if (!prompt) return null;
    setSaveState("saving");
    try {
      const data = await saveSubmission({
        submissionId,
        studentId,
        promptId: prompt.prompt_id,
        promptSnapshot: `${prompt.title} — ${prompt.body}`,
        category: prompt.category,
        content,
        status,
      });
      setSubmissionId(data.submissionId);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 1500);
      return data.submissionId as string;
    } catch (e) {
      setSaveState("idle");
      setError(e instanceof Error ? e.message : "Could not save.");
      return null;
    }
  }

  async function getCoaching() {
    setError(null);
    if (words < 5) {
      setError("Write a little more before asking your coach!");
      return;
    }
    setCoaching(true);
    try {
      const id = await save("submitted");
      if (!id) throw new Error("Could not save your writing.");
      const data = await createOfflineFeedback(id);
      const nextFeedback = data as unknown as Feedback;
      setFeedback(nextFeedback);
      setReviewMode(nextFeedback.challenge ? "guided" : "direct");
      setFixCheck(null);
      setAttemptCount(0);
      setReflection("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Coaching failed.");
    } finally {
      setCoaching(false);
    }
  }

  const feedbackRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (feedback) feedbackRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedback]);

  async function checkFixes() {
    if (!feedback) return;
    setCheckingFixes(true);
    setError(null);
    try {
      const data = checkKnownFixes(content, feedback.all_issues, attemptCount + 1);
      setFixCheck(data);
      setAttemptCount((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check fixes.");
    } finally {
      setCheckingFixes(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Prompt card */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-sprout-500 px-4 py-3 text-white sm:px-5">
          <span className="text-sm font-semibold">
            {prompt ? CATEGORY_LABELS[prompt.category] : "Loading…"}
            {prompt?.character_trait && (
              <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs capitalize">
                {prompt.character_trait}
              </span>
            )}
          </span>
          <button
            onClick={() => fetchPrompt(true)}
            disabled={loadingPrompt || coaching}
            className="min-h-11 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold hover:bg-white/25 disabled:opacity-50"
          >
            ↻ {copy.newPrompt}
          </button>
        </div>
        <div className="p-4 sm:p-5">
          {loadingPrompt ? (
            <p className="text-ink/50">Growing a fresh prompt…</p>
          ) : promptLimit ? (
            <div className="rounded-xl2 bg-honey-100 p-4">
              <h2 className="font-display text-xl font-semibold">
                You've used your prompts for this week.
              </h2>
              <p className="mt-1.5 text-sm text-ink/70">
                More prompts open up in {promptLimit.resetsInDays}{" "}
                {promptLimit.resetsInDays === 1 ? "day" : "days"}. You can still
                revisit saved writing from your history.
              </p>
            </div>
          ) : prompt ? (
            <>
              <h2 className="font-display text-2xl font-semibold">{prompt.title}</h2>
              <p className="mt-1.5 text-ink/75">{prompt.body}</p>
            </>
          ) : (
            <p className="text-clay">No prompt loaded.</p>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="card p-4 sm:p-5">
        <label htmlFor="essay" className="label">
          {studentName}{copy.editorLabelSuffix}
        </label>
        <textarea
          id="essay"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={copy.placeholder}
          disabled={!!promptLimit}
          className="field min-h-[220px] resize-y font-sans text-base leading-relaxed sm:min-h-[280px]"
        />

        {/* Word count progress */}
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-ink/70">
              {words} {words === 1 ? "word" : "words"}
            </span>
            <span className="text-ink/50">{copy.wordSuggested}: ~{minWords}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-sprout-50">
            <div
              className="h-full rounded-full bg-sprout-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={() => save("draft")}
            disabled={saveState === "saving" || coaching || !prompt}
            className="btn-ghost"
          >
            {saveState === "saving"
              ? "Saving…"
              : saveState === "saved"
                ? `${copy.saved} ✓`
                : copy.saveDraft}
          </button>
          <button
            onClick={getCoaching}
            disabled={coaching || !prompt}
            className="btn-primary"
          >
            {coaching ? copy.coaching : copy.submit}
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div ref={feedbackRef} className="card p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl">🌟</span>
            <h2 className="font-display text-2xl font-semibold">
              {copy.coachNotes}
            </h2>
            <label className="ml-auto flex items-center gap-2 rounded-full bg-sprout-50 px-3 py-1.5 text-xs font-semibold text-sprout-800">
              <input
                type="checkbox"
                checked={teacherMode}
                onChange={(e) => {
                  setTeacherMode(e.target.checked);
                  setReviewMode(e.target.checked ? "direct" : "guided");
                }}
                className="h-4 w-4 accent-sprout-500"
              />
              Teacher Mode
            </label>
            {feedback.source === "offline" && (
              <span className="rounded-full bg-honey-100 px-2.5 py-0.5 text-xs font-semibold text-honey-500">
                {copy.offlineCoach}
              </span>
            )}
          </div>
          {feedback.aiStatus === "disabled" && (
            <p className="mt-3 rounded-xl2 bg-sprout-50/70 p-3 text-sm text-ink/70">
              This account is using the free offline coach right now.
            </p>
          )}
          {feedback.aiStatus === "cap_reached" && (
            <p className="mt-3 rounded-xl2 bg-sprout-50/70 p-3 text-sm text-ink/70">
              This month's AI checks are all used, so the free offline coach is
              helping with this piece.
            </p>
          )}
          {feedback.aiStatus === "rate_limited" && (
            <p className="mt-3 rounded-xl2 bg-sprout-50/70 p-3 text-sm text-ink/70">
              The free offline coach is helping for a moment. Try the AI coach
              again after a short break.
            </p>
          )}

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <FeedbackBlock tone="good" title="What you did well" body={feedback.did_well} />
            <FeedbackBlock
              tone="grow"
              title={feedback.all_issues.length ? "One thing to grow" : "Excellent work!"}
              body={feedback.improve}
            />
          </div>

          {feedback.progress_note && (
            <p className="mt-4 rounded-xl2 bg-sprout-50/70 p-4 text-sm font-medium text-sprout-800">
              {feedback.progress_note}
            </p>
          )}

          <div className="mt-4 rounded-xl2 bg-sprout-50/70 p-4">
            <p className="eyebrow">Questions to think about</p>
            <ul className="mt-2 space-y-2">
              {feedback.guiding_questions.map((q, i) => (
                <li key={i} className="flex gap-2 text-sm text-ink/80">
                  <span className="font-semibold text-sprout-600">{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {feedback.grammar_notes && (
              <div className="rounded-xl border border-black/5 p-4">
                <p className="eyebrow">Grammar & punctuation</p>
                <p className="mt-1.5 text-sm text-ink/80">{feedback.grammar_notes}</p>
              </div>
            )}
            {feedback.vocabulary_suggestions.some((v) => !/^Your word choices are already clear/i.test(v)) ? (
              <div className="rounded-xl border border-black/5 p-4">
                <p className="eyebrow">Stronger words to try</p>
                <ul className="mt-1.5 list-inside list-disc space-y-1 text-sm text-ink/80">
                  {feedback.vocabulary_suggestions.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl border border-sprout-200 bg-sprout-50/60 p-4">
                <p className="eyebrow">Nice word choice!</p>
                <p className="mt-1.5 text-sm text-ink/80">
                  You used clear vocabulary throughout your writing.
                </p>
              </div>
            )}
          </div>

          {feedback.challenge && !teacherMode && (
            <div className="mt-4 rounded-xl2 border border-honey-300 bg-honey-100 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow">{copy.challengeTitle}</p>
                  <p className="mt-1.5 text-sm font-medium text-ink/80">
                    {feedback.challenge.prompt}
                  </p>
                </div>
                <div className="flex rounded-full bg-white/70 p-1 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setReviewMode("guided")}
                    className={`rounded-full px-3 py-1.5 ${
                      reviewMode === "guided" ? "bg-sprout-500 text-white" : "text-ink/60"
                    }`}
                  >
                    {copy.clues}
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewMode("direct")}
                    className={`rounded-full px-3 py-1.5 ${
                      reviewMode === "direct" ? "bg-sprout-500 text-white" : "text-ink/60"
                    }`}
                  >
                    {copy.answers}
                  </button>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-white/70 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-ink/60">
                  {copy.challengeChecklist}
                </p>
                <ul className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  {groupedProgress(fixCheck?.progress ?? feedback.challenge.items.map((item) => ({ ...item, fixed: false }))).map((group) => (
                    <li key={group.label} className="flex items-center gap-2 text-ink/75">
                      <span className={group.fixed === group.total ? "text-sprout-700" : "text-ink/35"}>
                        {group.fixed === group.total ? "✓" : "□"}
                      </span>
                      <span>
                        {group.label}
                        {group.total > 1 ? ` (${group.total})` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              {reviewMode === "guided" && (
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-ink/75">
                  {(fixCheck?.progress ?? feedback.challenge.items).filter((item) => !("fixed" in item) || !item.fixed).map((item) => (
                    <li key={item.id}>{item.clue}</li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={checkFixes}
                disabled={checkingFixes}
                className="btn-primary mt-3"
              >
                {checkingFixes ? copy.checking : copy.checkFixes}
              </button>
              {fixCheck && (
                <div className="mt-3 space-y-3 text-sm">
                  <div className="rounded-lg bg-white/70 p-3">
                    <p className="text-base font-semibold text-sprout-800">
                      {fixCheck.celebration}
                    </p>
                    <p className="font-semibold text-sprout-700">
                      You found {fixCheck.fixed.length} of {feedback.all_issues.length}.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-white/70 p-3">
                    <p className="font-semibold text-ink/80">
                      {copy.stillCheck}
                    </p>
                    <ul className="mt-1 list-inside list-disc space-y-1 text-ink/65">
                      {fixCheck.remaining.length
                        ? fixCheck.remaining.map((i, index) => <li key={index}>{i.clue}</li>)
                        : <li>All known growth spots are handled.</li>}
                    </ul>
                  </div>
                  <div className="rounded-lg bg-white/70 p-3">
                    <p className="font-semibold text-ink/80">
                      New growth spots: {fixCheck.newMistakes.length}
                    </p>
                    <p className="mt-1 text-ink/65">
                      {fixCheck.newMistakes.length
                        ? fixCheck.newMistakes.map((i) => i.original).join(", ")
                        : copy.noNewGrowthSpots}
                    </p>
                  </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {feedback.all_issues && feedback.all_issues.length > 0 && answersVisible ? (
            <div className="mt-4 rounded-xl2 border border-clay/20 bg-clay/5 p-4">
              <p className="eyebrow" style={{ color: "#C2654A" }}>
                Mistakes to fix ({feedback.all_issues.length})
              </p>
              <div className="mt-3 space-y-4">
                {[
                  "Spelling",
                  "Apostrophe",
                  "Context Word",
                  "End punctuation",
                  "Subject/verb agreement",
                  "Common grammar",
                  "Capitalization",
                  "Complete sentence",
                ].map(
                  (type) => {
                    const group = feedback.all_issues.filter((i) => i.type === type);
                    if (group.length === 0) return null;
                    return (
                      <div key={type}>
                        <p className="text-xs font-bold uppercase tracking-wide text-clay">
                          {type} · {group.length}
                        </p>
                        <ul className="mt-2 space-y-2">
                          {group.map((ex, i) => {
                            const choices =
                              ex.options && ex.options.length
                                ? ex.options
                                : [ex.suggestion];
                            const isChoice = reviewMode === "direct" && type === "Spelling" && choices.length > 1;
                            const showAnswer = answersVisible;
                            return (
                              <li key={i} className="text-sm">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded bg-clay/10 px-2 py-0.5 font-medium text-clay line-through decoration-clay/40">
                                    {ex.original}
                                  </span>
                                  {!showAnswer ? (
                                    <span className="text-ink/70">
                                      {ex.note}
                                    </span>
                                  ) : isChoice ? (
                                    <span className="flex flex-wrap items-center gap-1.5 text-ink/70">
                                      Did you mean
                                      {choices.map((c, j) => (
                                        <span key={j} className="flex items-center gap-1.5">
                                          <span className="rounded bg-sprout-100 px-2 py-0.5 font-semibold text-sprout-700">
                                            {c}
                                          </span>
                                          {j < choices.length - 1 && (
                                            <span className="text-ink/40">or</span>
                                          )}
                                        </span>
                                      ))}
                                      <span className="text-ink/70">?</span>
                                    </span>
                                  ) : (
                                    <>
                                      <span className="text-ink/40">→</span>
                                      <span className="rounded bg-sprout-100 px-2 py-0.5 font-semibold text-sprout-700">
                                        {ex.corrected ?? ex.suggestion}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {ex.note && showAnswer && !isChoice && (
                                  <p className="mt-1 text-ink/60">{ex.note}</p>
                                )}
                                {teacherMode && (
                                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-clay/70">
                                    {ex.category}
                                  </p>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          ) : feedback.all_issues.length === 0 ? (
            <div className="mt-4 rounded-xl2 border border-sprout-200 bg-sprout-50/50 p-4 text-sm text-sprout-700">
              ✓ {copy.noIssues}
            </div>
          ) : null}

          <p className="mt-4 rounded-xl2 bg-honey-100 p-4 text-sm font-medium text-ink/80">
            💛 {feedback.encouragement}
          </p>

          {feedback.scorecard?.length > 0 && (
            <div className="mt-6">
              <p className="eyebrow">{copy.writingSnapshot}</p>
              <div className="mt-3 grid gap-3 md:grid-cols-5">
                {feedback.scorecard.map((row) => (
                  <div key={row.category} className="rounded-xl bg-sprout-50/50 p-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-sprout-700">
                      {row.category}
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-ink">
                      {row.score}/5
                    </p>
                    <p className="mt-1 text-xs leading-snug text-ink/65">
                      {row.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <p className="eyebrow">{copy.growthSnapshot}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-sprout-50/60 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-sprout-700">
                  {copy.strengths}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink/75">
                  {(feedback.skill_snapshot?.strengths?.length
                    ? feedback.skill_snapshot.strengths
                    : ["Clear effort"]).map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl bg-honey-100/80 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-honey-500">
                  {copy.growingSkills}
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ink/75">
                  {(feedback.skill_snapshot?.growing?.length
                    ? feedback.skill_snapshot.growing
                    : ["Ready for a bigger challenge"]).map((skill) => (
                    <li key={skill}>{skill}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl2 border border-black/5 p-4">
            <label htmlFor="reflection" className="eyebrow">
              {brandVoice.labels.quickReflection}
            </label>
            <p className="mt-1.5 text-sm text-ink/75">{feedback.reflection_prompt}</p>
            <textarea
              id="reflection"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder={copy.reflectionPlaceholder}
              className="field mt-3 min-h-[80px] resize-y text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackBlock({
  tone,
  title,
  body,
}: {
  tone: "good" | "grow";
  title: string;
  body: string;
}) {
  return (
    <div
      className={`rounded-xl2 p-4 ${
        tone === "good"
          ? "bg-sprout-50 text-sprout-800"
          : "bg-honey-100 text-ink"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {title}
      </p>
      <p className="mt-1.5 text-sm">{body}</p>
    </div>
  );
}
