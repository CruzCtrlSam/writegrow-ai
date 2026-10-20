"use client";

import { useEffect, useState } from "react";
import type { PromptCategory } from "@/lib/types";
import { coachPlan, type PlanningFeedback } from "@/lib/planning-coach";
import { emptyPlan, restorePlan, suggestedPlanner, type PlannerKind, type WritingPlan } from "@/lib/writing-plan";

const layouts: { kind: PlannerKind; label: string }[] = [
  { kind: "web", label: "Idea Web" },
  { kind: "story", label: "Story Planner" },
  { kind: "opinion", label: "Opinion Builder" },
];
const storyLabels = ["Characters", "Setting", "Beginning", "The problem", "What happens next?", "Ending"];
const opinionLabels = ["My opinion", "Reason 1", "An example", "Reason 2", "Another example", "Reason 3", "One more example", "My conclusion"];

export function WritingPlanner({ storageKey, category, open, onOpenChange, onStartWriting }: {
  storageKey: string;
  category: PromptCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartWriting: () => void;
}) {
  const [plan, setPlan] = useState<WritingPlan>(() => emptyPlan(category));
  const [ready, setReady] = useState(false);
  const [feedback, setFeedback] = useState<PlanningFeedback | null>(null);
  const [saveStatus, setSaveStatus] = useState("Loading plan...");

  useEffect(() => {
    try {
      setPlan(restorePlan(localStorage.getItem(storageKey), category));
      setSaveStatus("Saved on this device");
    } catch {
      setSaveStatus("Saving unavailable. Keep this page open.");
    }
    setReady(true);
  }, [storageKey, category]);

  function update(next: WritingPlan) {
    setPlan(next);
    setFeedback(null);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSaveStatus("Saved on this device");
    } catch {
      setSaveStatus("Could not save. Keep this page open.");
    }
  }

  function updateList(list: "ideas" | "story" | "opinion", index: number, value: string) {
    update({ ...plan, [list]: plan[list].map((item, i) => i === index ? value : item), skipped: (plan.skipped ?? []).filter((key) => key !== `${list}:${index}`) });
  }

  const recommended = layouts.find((layout) => layout.kind === suggestedPlanner(category))!.label;
  return (
    <section className="writing-planner min-w-0" aria-labelledby="planner-heading">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sprout-100 pb-3">
        <h2 id="planner-heading" className="font-display text-xl font-semibold">Plan my writing</h2>
        <button type="button" className="btn-ghost" aria-expanded={open} aria-controls="writing-plan" onClick={() => onOpenChange(!open)}>
          {open ? "Hide plan" : "Open planner"}
        </button>
      </div>
      {open && <div id="writing-plan" className="planner-enter pt-4">
        <div className="flex flex-wrap gap-1 border-b border-sprout-100" role="tablist" aria-label="Planning layout">
          {layouts.map(({ kind, label }, index) => <button key={kind} id={`planner-tab-${kind}`} role="tab" type="button" aria-selected={plan.kind === kind} aria-controls={`planner-panel-${kind}`} tabIndex={plan.kind === kind ? 0 : -1} disabled={!ready}
            onClick={() => update({ ...plan, kind })}
            onKeyDown={(event) => {
              const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
              if (!step && event.key !== "Home" && event.key !== "End") return;
              event.preventDefault();
              const next = layouts[event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + step + layouts.length) % layouts.length].kind;
              update({ ...plan, kind: next });
              document.getElementById(`planner-tab-${next}`)?.focus();
            }}
            className={`planner-tab ${plan.kind === kind ? "planner-tab-active" : ""}`}>{label}</button>)}
        </div>
        <p className="mt-2 text-xs text-ink/55">Suggested: {recommended}</p>
        {ready && <div id={`planner-panel-${plan.kind}`} role="tabpanel" aria-labelledby={`planner-tab-${plan.kind}`} className="mt-4">
          {plan.kind === "web" ? <div className="idea-web">
            <div className="planner-topic"><label htmlFor="plan-topic" className="label">My topic</label><textarea id="plan-topic" className="field" rows={2} value={plan.topic} onChange={(e) => update({ ...plan, topic: e.target.value })} /></div>
            <div className="idea-web-branches">
              {plan.ideas.map((idea, index) => <div key={index} className="idea-web-branch">
                <label htmlFor={`plan-idea-${index}`} className="label">Idea {index + 1}</label>
                <textarea id={`plan-idea-${index}`} className="field" rows={3} value={idea} onChange={(e) => updateList("ideas", index, e.target.value)} />
                {plan.ideas.length > 1 && <button type="button" className="mt-1 min-h-9 text-xs text-ink/60 underline underline-offset-4" aria-label={`Remove idea ${index + 1}`} onClick={() => {
                  if (idea.trim() && !window.confirm("Remove this idea?")) return;
                  update({ ...plan, ideas: plan.ideas.filter((_, i) => i !== index) });
                }}>Remove idea</button>}
              </div>)}
            </div>
            {plan.ideas.length < 12 && <button className="btn-ghost mt-3" type="button" onClick={() => update({ ...plan, ideas: [...plan.ideas, ""] })}>Add idea</button>}
          </div> : <div className="planner-outline">
            {(plan.kind === "story" ? storyLabels : opinionLabels).map((label, index) => {
              const list = plan.kind === "story" ? "story" : "opinion";
              const skipKey = `${list}:${index}`;
              return <div key={skipKey}>
                <label htmlFor={`plan-${list}-${index}`} className="label">{label}</label>
                <textarea id={`plan-${list}-${index}`} rows={2} className="field" value={plan[list][index]} onChange={(e) => updateList(list, index, e.target.value)} />
                <label className="mt-1 flex min-h-9 items-center gap-2 text-xs text-ink/60">
                  <input type="checkbox" checked={(plan.skipped ?? []).includes(skipKey)} onChange={(e) => update({ ...plan, skipped: e.target.checked ? [...(plan.skipped ?? []), skipKey] : (plan.skipped ?? []).filter((key) => key !== skipKey) })} aria-label={`${label}: not needed for my plan`} className="accent-sprout-500" />
                  Not needed for my plan
                </label>
              </div>;
            })}
          </div>}
          <div className="mt-5 border-t border-sprout-100 pt-4">
            <button type="button" className="btn-ghost" onClick={() => setFeedback(coachPlan(plan))}>Coach my plan</button>
            <div aria-live="polite" aria-atomic="true">
              {feedback ? <div className="mt-3 border-l-2 border-sprout-400 pl-3 text-sm text-sprout-800">
                <h3 className="font-semibold">Your planning coach</h3>
                <p className="mt-2">{feedback.observation}</p>
                <p className="mt-2">{feedback.question}</p>
              </div> : <p className="mt-3 border-l-2 border-sprout-400 pl-3 text-sm text-sprout-800">{coachPlan(plan).question}</p>}
            </div>
          </div>
        </div>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink/55" role="status">{saveStatus}</p>
          <button type="button" className="btn-primary" onClick={onStartWriting}>Start writing</button>
        </div>
      </div>}
    </section>
  );
}
