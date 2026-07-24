import {
  AI_MONTHLY_CHECKS_PER_STUDENT,
  AI_RATE_MAX_PER_HOUR,
  AI_RATE_MIN_SECONDS,
} from "./plans";
import { decideAIUsage, remainingMonthlyChecks } from "./usage";

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "  ✓" : "  ✗ FAIL"}  ${label}`);
  if (!ok) failures++;
}

const now = new Date("2026-07-15T18:00:00.000Z");

console.log("\nAI usage:");
const active = decideAIUsage({
  aiEnabled: true,
  hasApiKey: true,
  monthlyCount: 12,
  hourlyCount: 3,
  lastFeedbackAt: new Date(now.getTime() - 10_000),
  now,
});
check("active when enabled, keyed, under cap, and outside rate window", active.allowAI);
check("remaining monthly checks are computed", active.remainingMonthlyChecks === 168);

const capped = decideAIUsage({
  aiEnabled: true,
  hasApiKey: true,
  monthlyCount: AI_MONTHLY_CHECKS_PER_STUDENT,
  hourlyCount: 0,
  lastFeedbackAt: null,
  now,
});
check("cap boundary blocks at 180", !capped.allowAI && capped.aiStatus === "cap_reached");

const hourlyLimited = decideAIUsage({
  aiEnabled: true,
  hasApiKey: true,
  monthlyCount: 0,
  hourlyCount: AI_RATE_MAX_PER_HOUR,
  lastFeedbackAt: null,
  now,
});
check("hourly boundary rate limits", hourlyLimited.aiStatus === "rate_limited");

const secondsLimited = decideAIUsage({
  aiEnabled: true,
  hasApiKey: true,
  monthlyCount: 0,
  hourlyCount: 0,
  lastFeedbackAt: new Date(now.getTime() - AI_RATE_MIN_SECONDS * 1000),
  now,
});
check("minimum seconds boundary rate limits", secondsLimited.aiStatus === "rate_limited");

const disabled = decideAIUsage({
  aiEnabled: false,
  hasApiKey: true,
  monthlyCount: 4,
  hourlyCount: 0,
  lastFeedbackAt: null,
  now,
});
check("disabled account uses offline coach", !disabled.allowAI && disabled.aiStatus === "disabled");

const missingKey = decideAIUsage({
  aiEnabled: true,
  hasApiKey: false,
  monthlyCount: 4,
  hourlyCount: 0,
  lastFeedbackAt: null,
  now,
});
check("missing API key uses offline coach", !missingKey.allowAI && missingKey.aiStatus === "disabled");
check("remaining checks never go below zero", remainingMonthlyChecks(181) === 0);

if (failures > 0) {
  console.error(`\n❌ ${failures} usage check(s) failed.`);
  process.exit(1);
}

console.log("\n✅ Usage checks passed.");
