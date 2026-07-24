export const PLAN_IDS = ["free", "basic", "pro", "family"] as const;

export type PlanId = (typeof PLAN_IDS)[number];
export type LegacyPlanId = "premium";
export type SubscriptionPlanId = PlanId | LegacyPlanId;

export interface PlanConfig {
  id: PlanId;
  label: string;
  priceMonthly: number;
  maxStudents: number;
  promptsPerWeek: number | null;
  aiAddOnAvailable: boolean;
}

export const AI_ADDON_PRICE = 4;
export const AI_MONTHLY_CHECKS_PER_STUDENT = 180;
export const AI_RATE_MAX_PER_HOUR = 20;
export const AI_RATE_MIN_SECONDS = 3;

export const PLANS: readonly PlanConfig[] = [
  {
    id: "free",
    label: "Free",
    priceMonthly: 0,
    maxStudents: 1,
    promptsPerWeek: 1,
    aiAddOnAvailable: false,
  },
  {
    id: "basic",
    label: "Basic",
    priceMonthly: 2.99,
    maxStudents: 1,
    promptsPerWeek: 3,
    aiAddOnAvailable: false,
  },
  {
    id: "pro",
    label: "Pro",
    priceMonthly: 7.99,
    maxStudents: 1,
    promptsPerWeek: null,
    aiAddOnAvailable: true,
  },
  {
    id: "family",
    label: "Family",
    priceMonthly: 19.99,
    maxStudents: 5,
    promptsPerWeek: null,
    aiAddOnAvailable: true,
  },
] as const;

const PLAN_BY_ID = Object.fromEntries(PLANS.map((plan) => [plan.id, plan])) as Record<
  PlanId,
  PlanConfig
>;

function normalizePlanId(id: SubscriptionPlanId | string | null | undefined): PlanId {
  if (id === "premium") return "pro";
  return PLAN_IDS.includes(id as PlanId) ? (id as PlanId) : "free";
}

export function getPlan(id: SubscriptionPlanId | string | null | undefined): PlanConfig {
  return PLAN_BY_ID[normalizePlanId(id)];
}

export function maxStudentsFor(planId: SubscriptionPlanId | string | null | undefined): number {
  return getPlan(planId).maxStudents;
}

export function promptsPerWeekFor(
  planId: SubscriptionPlanId | string | null | undefined,
): number | null {
  return getPlan(planId).promptsPerWeek;
}
