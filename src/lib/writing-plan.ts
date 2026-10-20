import type { PromptCategory } from "./types";

export type PlannerKind = "web" | "story" | "opinion";
export interface WritingPlan {
  version: 1;
  kind: PlannerKind;
  topic: string;
  ideas: string[];
  story: string[];
  opinion: string[];
  skipped?: string[];
}

export function suggestedPlanner(category: PromptCategory): PlannerKind {
  return category === "opinion" ? "opinion" : category === "narrative" || category === "creative" ? "story" : "web";
}

export function emptyPlan(category: PromptCategory): WritingPlan {
  return { version: 1, kind: suggestedPlanner(category), topic: "", ideas: ["", "", ""], story: Array(6).fill(""), opinion: Array(8).fill("") };
}

export function planStorageKey(studentId: string, title: string, body: string, category: PromptCategory) {
  return `writegrow:plan:v1:${encodeURIComponent(studentId)}:${encodeURIComponent(JSON.stringify([category, title, body]))}`;
}

export function restorePlan(raw: string | null, category: PromptCategory): WritingPlan {
  const fallback = emptyPlan(category);
  if (!raw) return fallback;
  try {
    const plan = JSON.parse(raw);
    const strings = (value: unknown, length?: number): value is string[] => Array.isArray(value) && value.every((v) => typeof v === "string") && (length === undefined || value.length === length);
    if (plan.version !== 1 || !["web", "story", "opinion"].includes(plan.kind) || typeof plan.topic !== "string" || !strings(plan.ideas) || plan.ideas.length < 1 || plan.ideas.length > 12 || !strings(plan.story, 6) || !strings(plan.opinion, 8)) return fallback;
    if (plan.skipped !== undefined && (!strings(plan.skipped) || !plan.skipped.every((key: string) => /^(story:[0-5]|opinion:[0-7])$/.test(key)))) return fallback;
    return plan as WritingPlan;
  } catch {
    return fallback;
  }
}

export function planningQuestion(plan: WritingPlan): string {
  if (plan.kind === "web") {
    if (!plan.topic.trim()) return "What is the one topic you want to explore?";
    if (plan.ideas.filter((idea) => idea.trim()).length < 2) return "What are two things you could share about your topic?";
    return "Which idea could you explain with a fact, detail, or example?";
  }
  if (plan.kind === "story") {
    if (!plan.story[0].trim()) return "Who will your story follow?";
    if (!plan.story[3].trim()) return "What problem could your character face?";
    if (!plan.story[5].trim()) return "How will your character solve the problem?";
    return "How does your character feel at the end compared with the beginning?";
  }
  if (!plan.opinion[0].trim()) return "What do you believe about this topic?";
  if (!plan.opinion[1].trim()) return "What is one reason someone might agree with you?";
  if (!plan.opinion[2].trim()) return "What example supports your first reason?";
  return "Which reason is strongest, and what makes it convincing?";
}
