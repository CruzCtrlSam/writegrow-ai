import type { PromptCategory, WritingLevel } from "./types";

// Grade-appropriate minimum word-count suggestions.
// Adjusted up/down for advanced / below-grade writers.
export function minWordsFor(grade: number, level: WritingLevel): number {
  const base: Record<number, number> = {
    3: 60,
    4: 80,
    5: 110,
    6: 150,
    7: 190,
    8: 230,
  };
  let target = base[grade] ?? 100;
  if (level === "advanced") target = Math.round(target * 1.25);
  if (level === "below_grade") target = Math.round(target * 0.75);
  return target;
}

// Count words in a block of text.
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

// A small offline fallback library so the app produces prompts even
// without the OpenAI key. Keyed loosely so any grade gets something.
const FALLBACK: Record<PromptCategory, { title: string; body: string }[]> = {
  narrative: [
    { title: "The Unexpected Visitor", body: "Write a story about someone who shows up at your door that you did not expect. What happens next?" },
    { title: "A Day That Changed", body: "Tell a story about a day that started ordinary but ended in a way no one saw coming." },
  ],
  opinion: [
    { title: "More Recess?", body: "Should the school day include more recess time? Give reasons and try to convince your reader." },
    { title: "Best Season", body: "Which season is the best? Argue your opinion with at least three reasons." },
  ],
  informative: [
    { title: "How Something Works", body: "Choose something you understand well and explain how it works, step by step." },
    { title: "A Place I Know", body: "Describe a real place so clearly that a reader who has never been there could picture it." },
  ],
  creative: [
    { title: "The Talking Map", body: "Imagine you find a map that talks. Write what it tells you and where it leads." },
    { title: "One Wish", body: "A character gets exactly one wish, but there is a twist. Write the story." },
  ],
  summary: [
    { title: "Retell It", body: "Summarize a story, movie, or article you know well using only the most important parts." },
    { title: "Main Idea", body: "Pick something you read recently. State the main idea and two supporting details." },
  ],
};

export interface GeneratedPrompt {
  title: string;
  body: string;
  category: PromptCategory;
  character_trait: string | null;
}

export function fallbackPrompt(
  category: PromptCategory,
  trait: string | null,
): GeneratedPrompt {
  const list = FALLBACK[category];
  const pick = list[Math.floor(Math.random() * list.length)];
  return {
    title: pick.title,
    body: trait
      ? `${pick.body} As you write, show what ${trait} can look like in real life.`
      : pick.body,
    category,
    character_trait: trait,
  };
}
