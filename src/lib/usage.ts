import {
  AI_MONTHLY_CHECKS_PER_STUDENT,
  AI_RATE_MAX_PER_HOUR,
  AI_RATE_MIN_SECONDS,
} from "./plans";

export type AIStatus = "active" | "disabled" | "cap_reached" | "rate_limited";

export interface AIDecisionInput {
  aiEnabled: boolean;
  hasApiKey: boolean;
  monthlyCount: number;
  hourlyCount: number;
  lastFeedbackAt: Date | string | null;
  now: Date;
}

export interface AIDecision {
  allowAI: boolean;
  aiStatus: AIStatus;
  remainingMonthlyChecks: number;
}

export function remainingMonthlyChecks(
  monthlyCount: number,
  monthlyLimit = AI_MONTHLY_CHECKS_PER_STUDENT,
): number {
  return Math.max(0, monthlyLimit - monthlyCount);
}

export function decideAIUsage(input: AIDecisionInput): AIDecision {
  const remaining = remainingMonthlyChecks(input.monthlyCount);

  if (!input.aiEnabled || !input.hasApiKey) {
    return { allowAI: false, aiStatus: "disabled", remainingMonthlyChecks: remaining };
  }

  if (remaining <= 0) {
    return { allowAI: false, aiStatus: "cap_reached", remainingMonthlyChecks: 0 };
  }

  const lastAt =
    input.lastFeedbackAt === null ? null : new Date(input.lastFeedbackAt).getTime();
  const secondsSinceLast =
    lastAt === null ? Number.POSITIVE_INFINITY : (input.now.getTime() - lastAt) / 1000;

  if (
    input.hourlyCount >= AI_RATE_MAX_PER_HOUR ||
    secondsSinceLast <= AI_RATE_MIN_SECONDS
  ) {
    return {
      allowAI: false,
      aiStatus: "rate_limited",
      remainingMonthlyChecks: remaining,
    };
  }

  return { allowAI: true, aiStatus: "active", remainingMonthlyChecks: remaining };
}

export function currentCalendarMonthRange(now: Date): { start: Date; end: Date } {
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
  };
}

export function daysUntilRollingReset(oldestCreatedAt: Date | string | null, now: Date): number {
  if (!oldestCreatedAt) return 7;
  const resetAt = new Date(oldestCreatedAt).getTime() + 7 * 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((resetAt - now.getTime()) / (24 * 60 * 60 * 1000)));
}
