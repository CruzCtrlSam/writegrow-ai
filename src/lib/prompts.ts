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

// A local prompt library so the static app can produce fresh prompts
// without a server-side prompt generator.
const FALLBACK: Record<PromptCategory, { title: string; body: string }[]> = {
  narrative: [
    { title: "The Unexpected Visitor", body: "Write a story about someone who shows up at your door that you did not expect. What happens next?" },
    { title: "A Day That Changed", body: "Tell a story about a day that started ordinary but ended in a way no one saw coming." },
    { title: "Lost and Found", body: "Write a story about a character who finds something important that someone else lost." },
    { title: "The Big Mistake", body: "Tell a story about a character who makes a mistake and has to decide how to fix it." },
    { title: "A Brave Choice", body: "Write about a time a character has to be brave, even though the choice is not easy." },
    { title: "The Secret Note", body: "Write a story that begins when someone discovers a note with a surprising message." },
    { title: "The New Kid", body: "Tell a story about a new student, teammate, or neighbor and what happens on their first day." },
    { title: "The Stormy Afternoon", body: "Write a story about a day when the weather changes everyone's plans." },
    { title: "The Promise", body: "Tell a story about someone trying hard to keep a promise." },
    { title: "A Race Against Time", body: "Write a story where a character must finish something important before time runs out." },
    { title: "The Forgotten Assignment", body: "Write a story about a character who forgets something important and has to handle the problem." },
    { title: "The Surprise Team", body: "Tell a story about people who do not expect to work together but end up needing each other." },
    { title: "The Locked Gate", body: "Write a story about a character who finds a locked gate and must decide whether to keep going." },
    { title: "A Small Act", body: "Tell a story about one small action that makes a big difference for someone else." },
    { title: "The Long Way Home", body: "Write a story about a trip home that does not go the way the character planned." },
  ],
  opinion: [
    { title: "More Recess?", body: "Should the school day include more recess time? Give reasons and try to convince your reader." },
    { title: "Best Season", body: "Which season is the best? Argue your opinion with at least three reasons." },
    { title: "Class Pet", body: "Should every classroom have a class pet? Give your opinion and support it with reasons." },
    { title: "Homework Amount", body: "Do students have the right amount of homework? Explain your opinion with examples." },
    { title: "Best Field Trip", body: "What is the best kind of field trip for students? Give reasons that would persuade a teacher." },
    { title: "Screen Time Rules", body: "Should families set daily screen time limits? Share your opinion and explain why." },
    { title: "School Lunch Choice", body: "Should students help choose the school lunch menu? Support your answer with clear reasons." },
    { title: "Team Sports", body: "Are team sports good for kids? Explain your opinion with reasons and examples." },
    { title: "Outdoor Learning", body: "Should classes sometimes be held outside? Tell what you think and why." },
    { title: "Later Start Time", body: "Should school start later in the morning? Give reasons to support your opinion." },
    { title: "Best School Rule", body: "What school rule helps students the most? Explain your opinion with clear reasons." },
    { title: "Books or Movies?", body: "Is it better to read a book or watch the movie version? Give reasons for your choice." },
    { title: "Group Work", body: "Should students do more projects in groups? Support your opinion with examples." },
    { title: "Learning an Instrument", body: "Should every student learn to play an instrument? Explain what you think and why." },
    { title: "Helpful Technology", body: "Does technology make learning better? Give your opinion and support it with reasons." },
  ],
  informative: [
    { title: "How Something Works", body: "Choose something you understand well and explain how it works, step by step." },
    { title: "A Place I Know", body: "Describe a real place so clearly that a reader who has never been there could picture it." },
    { title: "An Animal's Life", body: "Explain how an animal survives in its habitat, including what it eats and how it stays safe." },
    { title: "How to Learn a Skill", body: "Explain how someone can learn a skill you know, using clear steps and helpful details." },
    { title: "A Helpful Invention", body: "Explain how an invention helps people and why it matters." },
    { title: "A Day in History", body: "Choose an event from history and explain what happened and why it was important." },
    { title: "Staying Healthy", body: "Explain three habits that help people stay healthy and why each one helps." },
    { title: "How a Team Works", body: "Explain how people on a team work together to reach a goal." },
    { title: "A Natural Wonder", body: "Choose a natural place or event and explain what makes it interesting." },
    { title: "Solving a Problem", body: "Explain a problem students sometimes face and describe practical ways to solve it." },
    { title: "How Food Gets to Stores", body: "Explain how a food item might travel from a farm or factory to a store shelf." },
    { title: "A Community Helper", body: "Explain what a community helper does and why that job is important." },
    { title: "How Plants Grow", body: "Explain what plants need to grow and describe the process in order." },
    { title: "Using a Tool Safely", body: "Choose a tool or piece of technology and explain how to use it safely and correctly." },
    { title: "Why Practice Helps", body: "Explain why practicing a skill over time helps someone improve." },
  ],
  creative: [
    { title: "The Talking Map", body: "Imagine you find a map that talks. Write what it tells you and where it leads." },
    { title: "One Wish", body: "A character gets exactly one wish, but there is a twist. Write the story." },
    { title: "The Door in the Library", body: "Imagine a hidden door appears in a library. Write what is behind it." },
    { title: "Tiny for a Day", body: "Write about waking up tiny for one day and trying to solve an ordinary problem." },
    { title: "The Time Capsule", body: "A character opens a time capsule and finds something impossible inside. Write the story." },
    { title: "The Rule Breaks", body: "Imagine one normal rule of the world suddenly stops working. Write what happens next." },
    { title: "Message from Tomorrow", body: "Write a story about receiving a message from someone living one day in the future." },
    { title: "The Invisible Backpack", body: "A backpack turns invisible, but everything inside still matters. Write the story." },
    { title: "The Moonlight Garden", body: "Imagine a garden that only appears at night. Describe what a character finds there." },
    { title: "The Swap", body: "Two characters accidentally switch places for a day. Write what they learn." },
    { title: "The Borrowed Superpower", body: "A character gets a superpower for only one hour. Write what they do with it." },
    { title: "The Pencil That Answers", body: "Imagine a pencil that writes back when someone asks it a question. Write the story." },
    { title: "The Cloud Elevator", body: "A character steps into an elevator that stops at different clouds. Write what happens." },
    { title: "The Museum After Dark", body: "Imagine one museum exhibit comes to life after closing time. Write the story." },
    { title: "The Missing Color", body: "One color disappears from the world for a day. Write about what changes." },
  ],
  summary: [
    { title: "Retell It", body: "Summarize a story, movie, or article you know well using only the most important parts." },
    { title: "Main Idea", body: "Pick something you read recently. State the main idea and two supporting details." },
    { title: "Chapter Snapshot", body: "Summarize one chapter from a book, including the main problem and the most important events." },
    { title: "News in Brief", body: "Summarize a news story or classroom article by telling who, what, when, where, and why it matters." },
    { title: "Character Change", body: "Summarize how a character changes from the beginning to the end of a story." },
    { title: "Lesson Learned", body: "Summarize a story and explain the lesson or message the author wants readers to understand." },
    { title: "Compare Two Texts", body: "Summarize two texts about a similar topic and explain one way they are alike or different." },
    { title: "Problem and Solution", body: "Summarize a text by naming the main problem and explaining how it is solved." },
    { title: "Important Details", body: "Summarize a text by choosing only the details a reader needs to understand the main idea." },
    { title: "Beginning to End", body: "Summarize a story by explaining the beginning, middle, and end in your own words." },
    { title: "Author's Point", body: "Summarize an article by explaining the author's main point and the details that support it." },
    { title: "Cause and Effect", body: "Summarize a text by explaining what happened and what caused it." },
    { title: "Setting and Events", body: "Summarize a story by explaining where it happens and which events matter most." },
    { title: "What Changed?", body: "Summarize a text by explaining what changed from the beginning to the end." },
    { title: "Three-Sentence Summary", body: "Choose a text you know and summarize it in exactly three clear sentences." },
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
  avoidTitles: string[] = [],
): GeneratedPrompt {
  const list = FALLBACK[category];
  const avoid = new Set(avoidTitles.map(normalizeTitle).filter(Boolean));
  const choices = list.filter((prompt) => !avoid.has(normalizeTitle(prompt.title)));
  const pool = choices.length > 0 ? choices : list;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return {
    title: pick.title,
    body: trait
      ? `${pick.body} As you write, show what ${trait} can look like in real life.`
      : pick.body,
    category,
    character_trait: trait,
  };
}

export function fallbackPromptCount(category: PromptCategory): number {
  return FALLBACK[category].length;
}

export function fallbackPromptTotalCount(): number {
  return Object.values(FALLBACK).reduce((total, prompts) => total + prompts.length, 0);
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}
