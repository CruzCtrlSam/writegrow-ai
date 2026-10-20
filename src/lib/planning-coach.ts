import type { WritingPlan } from "./writing-plan";

export interface PlanningFeedback {
  observation: string;
  question: string;
}

function quote(text: string): string {
  const words = text.trim().split(/\s+/);
  return `"${words.slice(0, 16).join(" ")}${words.length > 16 ? "..." : ""}"`;
}

export function coachPlan(plan: WritingPlan): PlanningFeedback {
  const skipped = new Set(plan.skipped ?? []);
  const needed = (list: "story" | "opinion", index: number) => !plan[list][index].trim() && !skipped.has(`${list}:${index}`);
  if (plan.kind === "web") {
    const ideas = plan.ideas.map((idea) => idea.trim()).filter(Boolean);
    const observation = ideas.length
      ? `You collected ${ideas.length} ${ideas.length === 1 ? "idea" : "ideas"}${plan.topic.trim() ? ` about ${quote(plan.topic)}` : ""}.`
      : plan.topic.trim() ? `You chose ${quote(plan.topic)} as your topic.` : "Your web is ready for your first idea.";
    let question = "What is one topic you would like to explore?";
    if (plan.topic.trim()) {
      if (!ideas.length) question = `What is one thing you want your reader to know about ${quote(plan.topic)}?`;
      else if (new Set(ideas.map((idea) => idea.toLowerCase().replace(/\s+/g, " "))).size < ideas.length) question = "Two of your notes are the same. What different detail could you add to one of them?";
      else if (ideas.length === 1) question = `You wrote ${quote(ideas[0])}. What is another idea that connects to your topic?`;
      else question = `You wrote ${quote(ideas[0])}. What example or detail could help your reader picture that idea?`;
    }
    return { observation, question };
  }
  if (plan.kind === "story") {
    const count = plan.story.filter((note) => note.trim()).length;
    const observation = plan.story[0].trim()
      ? `You introduced ${quote(plan.story[0])}${plan.story[3].trim() ? ` and noted a problem: ${quote(plan.story[3])}` : " in your character notes"}.`
      : count ? `You have notes in ${count} ${count === 1 ? "part" : "parts"} of your story plan.` : "Your story plan has room for your own characters and adventures.";
    const questions = [
      "Who will your story follow?",
      plan.story[0].trim() ? `Where and when does the story of ${quote(plan.story[0])} take place?` : "Where and when does your story happen?",
      "What happens at the beginning, before things change?",
      "What problem or challenge will move your story forward?",
      plan.story[3].trim() ? `You noted ${quote(plan.story[3])}. What does your character try next?` : "What does your character do next?",
      "How does your story end, and what has changed?",
    ];
    const next = questions.findIndex((_, index) => needed("story", index));
    return { observation, question: next >= 0 ? questions[next] : plan.story[5].trim() ? `Your ending notes say ${quote(plan.story[5])}. Which earlier event helps lead to that ending?` : "Which part of your plan would you like to turn into your first scene?" };
  }
  const reasons = [1, 3, 5].filter((index) => plan.opinion[index].trim());
  const observation = plan.opinion[0].trim()
    ? `You stated your opinion: ${quote(plan.opinion[0])}${reasons.length ? `, and added ${reasons.length} ${reasons.length === 1 ? "reason" : "reasons"}` : ""}.`
    : reasons.length ? `You collected ${reasons.length} ${reasons.length === 1 ? "reason" : "reasons"} for your plan.` : "Your opinion plan is ready for what you think and why.";
  let question: string;
  if (needed("opinion", 0)) question = "What do you believe about this topic?";
  else if (!reasons.length && [1, 3, 5].some((index) => needed("opinion", index))) question = "What is one reason someone might agree with your opinion?";
  else {
    const unsupported = reasons.find((index) => needed("opinion", index + 1));
    if (unsupported !== undefined) question = `Your reason says ${quote(plan.opinion[unsupported])}. What fact, experience, or example could support it?`;
    else if (needed("opinion", 7)) question = "How could you remind your reader of your opinion in your own words at the end?";
    else question = reasons.length ? `Which of your ${reasons.length === 1 ? "examples could you explain more fully" : "reasons would you put first"} to help your reader understand your opinion?` : "Which note would you like to turn into your first sentence?";
  }
  return { observation, question };
}
