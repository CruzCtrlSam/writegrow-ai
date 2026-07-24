import type { PromptCategory, Skill } from "@/lib/types";
import { BRAND_PROMISE } from "@/content/brandPromise";
import { COACH_NOTES } from "@/content/coachNotes";
import { ENCOURAGEMENTS } from "@/content/encouragements";
import { GROWTH_LABELS } from "@/content/growthLabels";
import { REFLECTION_PROMPTS } from "@/content/reflectionPrompts";
import { SCORECARD_MESSAGES } from "@/content/scorecardMessages";
import { TERMINOLOGY } from "@/content/terminology";
import { UI_MESSAGES } from "@/content/uiMessages";

type GradeBand = "grades3-4" | "grades5-6" | "grades7-8";

function pickStable(items: string[], seed = "") {
  if (!items.length) return "";
  let hash = 0;
  for (const char of seed || new Date().toISOString().slice(0, 10)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return items[hash % items.length];
}

function bandForGrade(grade?: number): GradeBand {
  if (!grade || grade <= 4) return "grades3-4";
  if (grade <= 6) return "grades5-6";
  return "grades7-8";
}

function scoreBand(score: number): "high" | "mid" | "low" {
  if (score >= 4) return "high";
  if (score >= 3) return "mid";
  return "low";
}

export const brandVoice = {
  locale: "en",
  messages: UI_MESSAGES,
  terminology: TERMINOLOGY,
  labels: GROWTH_LABELS,

  getBrandPromise() {
    return BRAND_PROMISE;
  },

  getCoachNote(context?: { category?: PromptCategory | null; seed?: string }) {
    const key = context?.category ?? "general";
    const notes = COACH_NOTES[key] ?? COACH_NOTES.general;
    return pickStable(notes, context?.seed);
  },

  getEncouragement(level: keyof typeof ENCOURAGEMENTS, seed?: string) {
    return pickStable(ENCOURAGEMENTS[level], seed);
  },

  getReflectionPrompt(category?: PromptCategory | "general" | null, grade?: number, seed?: string) {
    const prompts = REFLECTION_PROMPTS[category ?? "general"] ?? REFLECTION_PROMPTS.general;
    const chosen = pickStable(prompts, `${bandForGrade(grade)}:${seed ?? ""}`);
    return chosen || REFLECTION_PROMPTS.general[0];
  },

  getScorecardExplanation(category: string, score: number) {
    const band = scoreBand(score);
    if (category === "Ideas / Content") return SCORECARD_MESSAGES.ideas[band];
    if (category === "Organization") return SCORECARD_MESSAGES.organization[band];
    if (category === "Word Choice") return SCORECARD_MESSAGES.wordChoice[band];
    if (category === "Sentence Fluency") return SCORECARD_MESSAGES.fluency[band];
    return SCORECARD_MESSAGES.conventions[band];
  },

  getSkillDescription(skill: Skill) {
    const descriptions: Record<Skill, string> = {
      complete_sentences: "Complete sentences",
      capitalization: "Capital letters",
      punctuation: "Punctuation",
      paragraph_structure: "Paragraph development",
      supporting_details: "Supporting details",
      transitions: "Transitions",
      vocabulary: "Word choice",
      organization: "Clear organization",
      grammar: "Grammar choices",
      writing_stamina: "Writing stamina",
    };
    return descriptions[skill];
  },

  getWelcomeMessage(history?: { focus?: string | null; name?: string | null }) {
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
  },
};

export type BrandVoice = typeof brandVoice;
