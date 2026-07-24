import type { PromptCategory } from "@/lib/types";

export const REFLECTION_PROMPTS: Record<PromptCategory | "general", string[]> = {
  narrative: [
    "What part of your story are you most proud of?",
    "Which detail helped your reader picture the moment?",
    "What part of your story makes you smile the most?",
  ],
  opinion: [
    "Which reason made your opinion strongest?",
    "What example helped explain your thinking best?",
    "What would you add to make your opinion even stronger?",
  ],
  informative: [
    "What fact helped teach your reader something new?",
    "Which step did you explain most clearly?",
    "What detail made your explanation easier to understand?",
  ],
  summary: [
    "Which important idea did you explain most clearly?",
    "How did you decide what information mattered most?",
  ],
  creative: [
    "Which idea felt most original to you?",
    "What detail made your writing feel more alive?",
  ],
  general: [
    "What are you most proud of in your writing today?",
    "What did you improve this time?",
    "What would you like to get better at next?",
  ],
};
