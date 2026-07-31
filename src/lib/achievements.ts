import type { PromptCategory } from "./types";

export interface AchievementSubmission {
  created_at: string;
  word_count: number | null;
  category: PromptCategory | null;
  status?: string | null;
}

export interface AchievementStats {
  currentStreak: number;
  totalSubmitted: number;
  totalWords: number;
  wordsThisWeek: number;
  writingDays: number;
  categoriesTried: number;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  target: number;
  tone: "sprout" | "honey" | "clay";
}

export function buildAchievementSnapshot(
  submissions: AchievementSubmission[],
  now = new Date(),
): { stats: AchievementStats; badges: AchievementBadge[] } {
  const submitted = submissions.filter((submission) => submission.status !== "draft");
  const dateKeys = uniqueDateKeys(submitted.map((submission) => submission.created_at));
  const weekStart = new Date(now.getTime() - 7 * 864e5);
  const totalWords = submitted.reduce((sum, row) => sum + Math.max(0, row.word_count ?? 0), 0);
  const wordsThisWeek = submitted
    .filter((row) => new Date(row.created_at) >= weekStart)
    .reduce((sum, row) => sum + Math.max(0, row.word_count ?? 0), 0);
  const categoriesTried = new Set(submitted.map((row) => row.category).filter(Boolean)).size;

  const stats: AchievementStats = {
    currentStreak: calculateCurrentStreak(dateKeys, now),
    totalSubmitted: submitted.length,
    totalWords,
    wordsThisWeek,
    writingDays: dateKeys.length,
    categoriesTried,
  };

  return {
    stats,
    badges: [
      badge("first-draft", "First Draft", "Submit your first piece of writing.", stats.totalSubmitted, 1, "sprout"),
      badge("steady-three", "Three-Day Trail", "Write on three days in a row.", stats.currentStreak, 3, "honey"),
      badge("steady-seven", "Seven-Day Trail", "Write on seven days in a row.", stats.currentStreak, 7, "honey"),
      badge("word-builder", "Word Builder", "Write 100 total words.", stats.totalWords, 100, "sprout"),
      badge("word-garden", "Word Garden", "Write 500 total words.", stats.totalWords, 500, "clay"),
      badge("path-finder", "Path Finder", "Try three kinds of writing.", stats.categoriesTried, 3, "sprout"),
      badge("week-grower", "Weekly Grower", "Submit three pieces in one week.", submitted.filter((row) => new Date(row.created_at) >= weekStart).length, 3, "honey"),
      badge("five-days", "Five Writing Days", "Write on five different days.", stats.writingDays, 5, "clay"),
    ],
  };
}

export function calculateCurrentStreak(dateKeys: string[], now = new Date()): number {
  const days = new Set(dateKeys);
  const today = dateKey(now);
  const yesterday = dateKey(addDays(now, -1));
  let cursor = days.has(today) ? new Date(now) : days.has(yesterday) ? addDays(now, -1) : null;
  if (!cursor) return 0;

  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

function badge(
  id: string,
  title: string,
  description: string,
  value: number,
  target: number,
  tone: AchievementBadge["tone"],
): AchievementBadge {
  return {
    id,
    title,
    description,
    unlocked: value >= target,
    progress: Math.min(value, target),
    target,
    tone,
  };
}

function uniqueDateKeys(dates: string[]): string[] {
  return Array.from(new Set(dates.map((date) => dateKey(new Date(date))))).sort();
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
