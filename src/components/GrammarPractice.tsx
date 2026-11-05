"use client";

import { useEffect, useState } from "react";
import { checkGrammarLesson, emptyGrammarProgress, grammarStorageKey, lessonsForGrade, passageTargets, restoreGrammarProgress, type GrammarProgress } from "@/lib/grammar-lessons";
import { ProofreadingPassage } from "@/components/ProofreadingPassage";

export function GrammarPractice({ studentId, grade }: { studentId: string; grade: number }) {
  const lessons = lessonsForGrade(grade);
  const [progress, setProgress] = useState<GrammarProgress>(() => emptyGrammarProgress(grade));
  const [ready, setReady] = useState(false);
  const [saveMessage, setSaveMessage] = useState("Loading practice...");
  const [checked, setChecked] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [hintLevel, setHintLevel] = useState(0);
  const [answersVisible, setAnswersVisible] = useState(false);
  const lesson = lessons.find((item) => item.id === progress.selected) ?? lessons[0];

  useEffect(() => {
    try {
      setProgress(restoreGrammarProgress(localStorage.getItem(grammarStorageKey(studentId)), grade));
      setSaveMessage("Progress saved on this device");
    } catch { setSaveMessage("Saving unavailable. Keep this page open."); }
    setReady(true);
  }, [studentId, grade]);

  function save(next: GrammarProgress) {
    setProgress(next);
    try { localStorage.setItem(grammarStorageKey(studentId), JSON.stringify(next)); setSaveMessage("Progress saved on this device"); }
    catch { setSaveMessage("Could not save progress. Keep this page open."); }
  }
  function select(id: string) {
    save({ ...progress, selected: id });
    setChecked(false); setAttempts(0); setHintLevel(0); setAnswersVisible(false);
  }
  if (!lesson) return <p className="py-6">Grammar practice is available for grades 3 through 8.</p>;
  const values = progress.drafts[lesson.id] ?? {};
  const results = checkGrammarLesson(lesson, values);
  const fixed = results.filter((result) => result.correct).length;
  const allFixed = fixed === results.length;
  const completed = lessons.filter((item) => progress.completed.includes(item.id)).length;
  const assisted = progress.assisted.includes(lesson.id);
  const nextLesson = lessons[lessons.indexOf(lesson) + 1];

  function check() {
    setChecked(true); setAttempts((count) => count + 1);
    if (allFixed && !progress.completed.includes(lesson.id)) save({ ...progress, completed: [...progress.completed, lesson.id] });
  }
  function reveal() {
    setAnswersVisible(true);
    if (!progress.assisted.includes(lesson.id)) save({ ...progress, assisted: [...progress.assisted, lesson.id] });
  }
  return <div className="grammar-practice mt-6">
    <aside className="min-w-0" aria-label="Grammar lessons">
      <p className="eyebrow">Grade {grade} learning path</p>
      <p className="mt-2 text-sm text-ink/60">{completed} of {lessons.length} lessons complete</p>
      <progress className="mt-3 h-2 w-full accent-sprout-500" max={lessons.length} value={completed} aria-label="Lessons completed" />
      <ol className="mt-4 divide-y divide-sprout-100 border-y border-sprout-100">
        {lessons.map((item, index) => <li key={item.id}><button type="button" disabled={!ready} aria-current={item.id === lesson.id ? "step" : undefined} className={`grammar-lesson-button ${item.id === lesson.id ? "bg-sprout-50 text-sprout-800" : "text-ink/70"}`} onClick={() => select(item.id)}>
          <span className="grammar-step" aria-hidden="true">{index + 1}</span>
          <span className="min-w-0"><span className="block font-semibold">{item.title}</span><span className="mt-1 block text-xs font-normal">{item.format} · {progress.completed.includes(item.id) ? "Complete" : item.skill}</span></span>
        </button></li>)}
      </ol>
      <p className="mt-4 text-xs text-ink/50" role="status">{saveMessage}</p>
    </aside>
    <section className="min-w-0" aria-labelledby="grammar-lesson-title">
      <div className="flex flex-wrap items-center gap-3"><span className="eyebrow">{lesson.format}</span><span className="text-xs text-ink/55">{results.length} small fixes</span></div>
      <h2 id="grammar-lesson-title" className="mt-2 font-display text-2xl font-semibold">{lesson.title}</h2>
      <div className="my-5 border-l-2 border-sprout-400 pl-4">
        <h3 className="text-sm font-semibold text-sprout-800">{lesson.skill}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink/75">{lesson.teaching}</p>
        <p className="mt-2 text-sm text-ink/60"><span className="font-semibold">Example: </span>{lesson.example}</p>
      </div>
      <form onSubmit={(event) => { event.preventDefault(); check(); }}>
        <fieldset disabled={!ready}>
          <legend className="mb-3 text-sm font-semibold">Editing challenge</legend>
          <ProofreadingPassage key={lesson.id} lesson={lesson} values={values} checked={checked} disabled={!ready} edits={progress.proofreading?.[lesson.id] ?? []} onChange={(fixId, value, kind) => {
            const history = progress.proofreading?.[lesson.id] ?? [];
            const target = passageTargets(lesson).find((part) => typeof part !== "string" && part.id === fixId);
            if (!target || typeof target === "string") return;
            const before = values[fixId] ?? target.original;
            save({ ...progress, drafts: { ...progress.drafts, [lesson.id]: { ...values, [fixId]: value } }, proofreading: { ...progress.proofreading, [lesson.id]: kind ? [...history, { fixId, kind, before, after: value }].slice(-30) : history.filter((edit) => edit.fixId !== fixId) } });
            setChecked(false);
          }} onUndo={() => {
            const history = progress.proofreading?.[lesson.id] ?? [];
            const last = history[history.length - 1];
            if (!last) return;
            save({ ...progress, drafts: { ...progress.drafts, [lesson.id]: { ...values, [last.fixId]: last.before } }, proofreading: { ...progress.proofreading, [lesson.id]: history.slice(0, -1) } });
            setChecked(false);
          }} />
          <div className="mt-5 flex flex-wrap gap-3">
            <button type="submit" className="btn-primary">Check my fixes</button>
            <button type="button" className="btn-ghost" onClick={() => setHintLevel((level) => Math.min(2, level + 1))}>{hintLevel === 0 ? "Give me a clue" : "Stronger clues"}</button>
            {attempts > 0 && <button type="button" className="btn-ghost" onClick={reveal}>See answers</button>}
          </div>
        </fieldset>
      </form>
      <div aria-live="polite" aria-atomic="true">
        {checked && <div className="mt-5 border-l-2 border-sprout-400 pl-4">
          <h3 className="font-semibold text-sprout-800">{allFixed ? assisted ? "Nice work practicing!" : "Excellent editing!" : fixed ? "Nice progress!" : "Good start. Let's take one small step."}</h3>
          <p className="mt-1 text-sm text-ink/75">{allFixed ? assisted ? "You completed this lesson with support." : `You fixed all ${results.length} spots yourself.` : `You fixed ${fixed} of ${results.length} spots. ${results.length - fixed === 1 ? "Just one is left." : "Try a clue for your next fix."}`}</p>
          {allFixed && nextLesson && <button type="button" className="btn-primary mt-4" onClick={() => select(nextLesson.id)}>Next lesson</button>}
          {allFixed && completed === lessons.length && <p className="mt-2 text-sm font-semibold text-sprout-700">Learning path complete. Bring these skills to your next draft!</p>}
          {allFixed && <button type="button" className="btn-ghost mt-4" onClick={() => {
            const drafts = { ...progress.drafts };
            delete drafts[lesson.id];
            save({ ...progress, drafts, assisted: progress.assisted.filter((id) => id !== lesson.id), proofreading: { ...progress.proofreading, [lesson.id]: [] } });
            setChecked(false); setAttempts(0); setHintLevel(0); setAnswersVisible(false);
          }}>Practice again</button>}
        </div>}
      </div>
      {(checked || hintLevel > 0 || answersVisible) && <ol className="mt-5 divide-y divide-sprout-100 border-t border-sprout-100" aria-label="Practice feedback">
        {results.map((result, index) => <li key={result.id} id={`result-${result.id}`} className="py-3 text-sm">
          <p className="font-semibold">Fix {index + 1}{checked && result.correct ? " · Got it!" : ""}</p>
          {checked && result.correct ? <p className="mt-1 text-ink/65">{result.explanation}</p> : <p className="mt-1 text-ink/65">{attempts >= 2 ? result.explanation : hintLevel >= 2 ? lesson.teaching : result.hint}</p>}
          {answersVisible && <p className="mt-2 text-sprout-800"><span className="font-semibold">One correct answer: </span>{result.answers[0]}</p>}
        </li>)}
      </ol>}
    </section>
  </div>;
}
