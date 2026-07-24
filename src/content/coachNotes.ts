import type { PromptCategory } from "@/lib/types";

type NoteCategory = PromptCategory | "general" | "editing" | "confidence" | "descriptive" | "persuasive";

export const COACH_NOTES: Record<NoteCategory, string[]> = {
  general: [
    "Every first draft is progress.",
    "Your ideas matter.",
    "Focus on getting your ideas onto the page.",
    "Every great writer edits.",
    "Writing gets stronger one draft at a time.",
    "Small improvements become big growth.",
    "The best writers never stop learning.",
    "Great writing starts with great thinking.",
    "One clear sentence can grow into something powerful.",
    "You are building a writer's habits every time you practice.",
  ],
  narrative: [
    "Every story begins with one sentence.",
    "Characters become real through details.",
    "Help your reader picture the moment.",
    "Readers remember great endings.",
    "Small details can make a story feel alive.",
  ],
  opinion: [
    "Strong opinions need strong reasons.",
    "Support your ideas with examples.",
    "Convince with evidence, not just feelings.",
    "A clear reason makes your opinion stronger.",
  ],
  informative: [
    "Teach your reader something new today.",
    "Clear explanations help people learn.",
    "Step-by-step writing makes hard ideas easier.",
    "Useful facts help your reader trust you.",
  ],
  summary: [
    "Strong summaries keep the most important ideas.",
    "Use your own words to show what you understood.",
    "A clear summary helps someone learn quickly.",
  ],
  creative: [
    "Imagination grows when you give it details.",
    "A surprising idea can become a strong story.",
    "Creative writing starts by trying something new.",
  ],
  persuasive: [
    "Great arguments use evidence.",
    "A strong point becomes stronger with proof.",
    "Help your reader understand why your idea matters.",
  ],
  descriptive: [
    "Help readers picture what you see.",
    "Use details that paint a picture.",
    "Clear describing words can pull a reader in.",
  ],
  editing: [
    "Revision is where writing gets stronger.",
    "Careful editing shows respect for your ideas.",
    "One thoughtful edit can make a sentence shine.",
  ],
  confidence: [
    "Don't worry about writing perfectly.",
    "You are allowed to grow one sentence at a time.",
    "Confidence grows when you keep practicing.",
  ],
};
