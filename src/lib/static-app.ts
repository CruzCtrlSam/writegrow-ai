import { createClient } from "@/lib/supabase/client";
import { appPath } from "@/lib/paths";
import { fallbackPrompt, countWords, type GeneratedPrompt } from "@/lib/prompts";
import {
  AI_MONTHLY_CHECKS_PER_STUDENT,
  getPlan,
  maxStudentsFor,
  type PlanId,
  promptsPerWeekFor,
} from "@/lib/plans";
import { currentCalendarMonthRange, daysUntilRollingReset } from "@/lib/usage";
import {
  CHARACTER_TRAITS,
  type PromptCategory,
  type Student,
  type SubmissionStatus,
  type WritingLevel,
} from "@/lib/types";

export const CATEGORIES: PromptCategory[] = [
  "narrative",
  "opinion",
  "informative",
  "creative",
  "summary",
];

export interface PromptPayload extends GeneratedPrompt {
  submissionId: string | null;
  prompt_id: string | null;
  content: string;
}

export interface PromptLimitPayload {
  limitReached: true;
  plan: string;
  resetsInDays: number;
}

function randomItem<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function parsePromptSnapshot(snapshot: string | null, category: PromptCategory): GeneratedPrompt {
  const [title, ...bodyParts] = (snapshot ?? "").split(" — ");
  return {
    title: title || "Today's Prompt",
    body: bodyParts.join(" — ") || "Write your best response to today's prompt.",
    category,
    character_trait: null,
  };
}

export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && typeof window !== "undefined") window.location.href = appPath("/login");
  return user;
}

export async function loadPrompt({
  studentId,
  category,
  forceNew,
}: {
  studentId: string;
  category?: PromptCategory;
  forceNew?: boolean;
}): Promise<PromptPayload | PromptLimitPayload> {
  const supabase = createClient();
  const user = await requireUser();
  if (!user) throw new Error("Please log in again.");

  const chosenCategory = CATEGORIES.includes(category as PromptCategory)
    ? (category as PromptCategory)
    : randomItem(CATEGORIES);

  const { data: student } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .maybeSingle();
  if (!student) throw new Error("Student not found.");

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  if (!forceNew) {
    const { data: existingToday } = await supabase
      .from("writing_submissions")
      .select("id, content, prompt_id, prompt_snapshot, category")
      .eq("student_id", studentId)
      .eq("status", "draft")
      .not("prompt_snapshot", "is", null)
      .gte("created_at", todayStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingToday?.prompt_snapshot) {
      const prompt = parsePromptSnapshot(
        existingToday.prompt_snapshot,
        (existingToday.category as PromptCategory | null) ?? chosenCategory,
      );
      return {
        submissionId: existingToday.id,
        prompt_id: existingToday.prompt_id ?? null,
        content: existingToday.content ?? "",
        ...prompt,
      };
    }
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("parent_id", user.id)
    .maybeSingle();

  const weeklyLimit = promptsPerWeekFor(sub?.plan);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (weeklyLimit !== null) {
    const { count } = await supabase
      .from("writing_submissions")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .not("prompt_snapshot", "is", null)
      .gte("created_at", sevenDaysAgo.toISOString());

    if ((count ?? 0) >= weeklyLimit) {
      const { data: oldest } = await supabase
        .from("writing_submissions")
        .select("created_at")
        .eq("student_id", studentId)
        .not("prompt_snapshot", "is", null)
        .gte("created_at", sevenDaysAgo.toISOString())
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      return {
        limitReached: true,
        plan: sub?.plan ?? "free",
        resetsInDays: daysUntilRollingReset(oldest?.created_at ?? null, now),
      };
    }
  }

  const { data: profile } = await supabase
    .from("users")
    .select("character_prompts_enabled")
    .eq("id", user.id)
    .maybeSingle();

  const trait =
    profile?.character_prompts_enabled && Math.random() < 0.5
      ? randomItem(CHARACTER_TRAITS)
      : null;

  const generated = fallbackPrompt(chosenCategory, trait);
  const promptSnapshot = `${generated.title} — ${generated.body}`;
  const { data: submission, error } = await supabase
    .from("writing_submissions")
    .insert({
      student_id: studentId,
      prompt_id: null,
      prompt_snapshot: promptSnapshot,
      category: generated.category,
      content: "",
      word_count: 0,
      status: "draft",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  return {
    submissionId: submission?.id ?? null,
    prompt_id: null,
    content: "",
    ...generated,
  };
}

export async function saveSubmission({
  submissionId,
  studentId,
  promptId,
  promptSnapshot,
  category,
  content,
  status,
}: {
  submissionId?: string | null;
  studentId: string;
  promptId?: string | null;
  promptSnapshot?: string;
  category?: PromptCategory;
  content: string;
  status: SubmissionStatus;
}) {
  const supabase = createClient();
  const word_count = countWords(content ?? "");
  const payload = {
    student_id: studentId,
    prompt_id: promptId ?? null,
    prompt_snapshot: promptSnapshot ?? null,
    category: category ?? null,
    content: content ?? "",
    word_count,
    status,
    updated_at: new Date().toISOString(),
  };

  if (submissionId) {
    const { data, error } = await supabase
      .from("writing_submissions")
      .update(payload)
      .eq("id", submissionId)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { submissionId: data.id, word_count };
  }

  const { data, error } = await supabase
    .from("writing_submissions")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { submissionId: data.id, word_count };
}

export async function createOfflineFeedback(submissionId: string): Promise<{
  feedbackId: string | null;
  aiStatus: "active" | "disabled" | "cap_reached" | "rate_limited";
  remainingMonthlyChecks: number;
  [key: string]: unknown;
}> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("feedback", {
    body: { submissionId },
  });
  if (error) {
    throw new Error(
      "The static site is ready, but the Supabase feedback Edge Function needs to be deployed before coaching can run.",
    );
  }
  return {
    feedbackId: null,
    aiStatus: "disabled",
    remainingMonthlyChecks: AI_MONTHLY_CHECKS_PER_STUDENT,
    ...(data ?? {}),
  };
}

export async function addStudentFromBrowser(input: {
  name: string;
  grade: number;
  level: WritingLevel;
}) {
  const supabase = createClient();
  const user = await requireUser();
  if (!user) throw new Error("Please log in again.");

  if (!input.name.trim() || input.grade < 3 || input.grade > 8) {
    throw new Error("Please enter a name and choose a grade between 3 and 8.");
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("parent_id", user.id)
    .maybeSingle();
  const { count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("parent_id", user.id);

  if ((count ?? 0) >= maxStudentsFor(sub?.plan)) {
    throw new Error("You've reached your plan's student limit. Upgrade to add more.");
  }

  const { error } = await supabase.from("students").insert({
    parent_id: user.id,
    name: input.name.trim(),
    grade: input.grade,
    level: input.level,
  });
  if (error) throw new Error(error.message);
}

export async function updateSettingsFromBrowser(input: {
  characterPromptsEnabled?: boolean;
  aiEnabled?: boolean;
  plan?: PlanId;
}) {
  const supabase = createClient();
  const user = await requireUser();
  if (!user) throw new Error("Please log in again.");

  if (typeof input.characterPromptsEnabled === "boolean") {
    const { error } = await supabase
      .from("users")
      .update({ character_prompts_enabled: input.characterPromptsEnabled })
      .eq("id", user.id);
    if (error) throw new Error(error.message);
  }

  if (input.plan) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan, ai_enabled")
      .eq("parent_id", user.id)
      .maybeSingle();
    const nextPlan = getPlan(input.plan);
    const { error } = await supabase
      .from("subscriptions")
      .update({
        plan: nextPlan.id,
        ai_enabled: nextPlan.aiAddOnAvailable ? (input.aiEnabled ?? sub?.ai_enabled === true) : false,
      })
      .eq("parent_id", user.id);
    if (error) throw new Error(error.message);
  }

  if (typeof input.aiEnabled === "boolean" && !input.plan) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("parent_id", user.id)
      .maybeSingle();
    const canUseAddOn = getPlan(sub?.plan).aiAddOnAvailable;
    const { error } = await supabase
      .from("subscriptions")
      .update({ ai_enabled: canUseAddOn ? input.aiEnabled : false })
      .eq("parent_id", user.id);
    if (error) throw new Error(error.message);
  }
}

export function monthRangeForSettings(now = new Date()) {
  return currentCalendarMonthRange(now);
}
