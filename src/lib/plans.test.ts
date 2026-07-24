import {
  AI_ADDON_PRICE,
  AI_MONTHLY_CHECKS_PER_STUDENT,
  getPlan,
  maxStudentsFor,
  promptsPerWeekFor,
} from "./plans";

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "  ✓" : "  ✗ FAIL"}  ${label}`);
  if (!ok) failures++;
}

console.log("\nPlan config:");
const basic = getPlan("basic");
check("basic tier has requested price", basic.priceMonthly === 2.99);
check("basic tier allows 3 prompts/week", basic.promptsPerWeek === 3);
check("free tier allows 1 student", maxStudentsFor("free") === 1);
check("family tier allows 5 students", maxStudentsFor("family") === 5);
check("pro tier has unlimited prompts", promptsPerWeekFor("pro") === null);
check("legacy premium maps to pro behavior", getPlan("premium").id === "pro");
check("AI add-on price is exported", AI_ADDON_PRICE === 4);
check("monthly AI checks cap is exported", AI_MONTHLY_CHECKS_PER_STUDENT === 180);

if (failures > 0) {
  console.error(`\n❌ ${failures} plan check(s) failed.`);
  process.exit(1);
}

console.log("\n✅ Plan checks passed.");
