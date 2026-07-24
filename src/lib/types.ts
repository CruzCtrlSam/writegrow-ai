// Shared domain types for WriteGrow AI

export type WritingLevel = "below_grade" | "on_grade" | "advanced";

export type PromptCategory =
  | "narrative"
  | "opinion"
  | "informative"
  | "creative"
  | "summary";

export type SubmissionStatus = "draft" | "submitted";
export type PlanTier = "free" | "basic" | "pro" | "premium" | "family";

export interface Student {
  id: string;
  parent_id: string;
  name: string;
  grade: number;
  level: WritingLevel;
  created_at: string;
}

export interface WritingPrompt {
  id: string;
  category: PromptCategory;
  grade_min: number;
  grade_max: number;
  title: string;
  body: string;
  character_trait: string | null;
  is_seed: boolean;
}

export interface Submission {
  id: string;
  student_id: string;
  prompt_id: string | null;
  prompt_snapshot: string | null;
  category: PromptCategory | null;
  content: string;
  word_count: number;
  status: SubmissionStatus;
  created_at: string;
  updated_at: string;
}

export interface AIFeedback {
  id: string;
  submission_id: string;
  student_id: string;
  did_well: string;
  improve: string;
  guiding_questions: string[];
  grammar_notes: string;
  vocabulary_suggestions: string[];
  encouragement: string;
  created_at: string;
}

// The ten tracked skills.
export const SKILLS = [
  "complete_sentences",
  "capitalization",
  "punctuation",
  "paragraph_structure",
  "supporting_details",
  "transitions",
  "vocabulary",
  "organization",
  "grammar",
  "writing_stamina",
] as const;

export type Skill = (typeof SKILLS)[number];

export const SKILL_LABELS: Record<Skill, string> = {
  complete_sentences: "Complete sentences",
  capitalization: "Capitalization",
  punctuation: "Punctuation",
  paragraph_structure: "Paragraph structure",
  supporting_details: "Supporting details",
  transitions: "Transitions",
  vocabulary: "Vocabulary",
  organization: "Organization",
  grammar: "Grammar",
  writing_stamina: "Writing stamina",
};

export const CATEGORY_LABELS: Record<PromptCategory, string> = {
  narrative: "Narrative",
  opinion: "Opinion / Persuasive",
  informative: "Informative / Expository",
  creative: "Creative Writing",
  summary: "Summary Writing",
};

export const LEVEL_LABELS: Record<WritingLevel, string> = {
  below_grade: "Below grade",
  on_grade: "On grade",
  advanced: "Advanced",
};

export const CHARACTER_TRAITS = [
  "kindness",
  "courage",
  "responsibility",
  "diligence",
  "honesty",
  "perseverance",
] as const;
