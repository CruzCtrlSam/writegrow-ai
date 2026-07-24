import { brandVoice } from "./brandVoice";

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "  ✓" : "  ✗ FAIL"}  ${label}`);
  if (!ok) failures++;
}

console.log("\nBrand voice system:");
check(
  "permanent brand promise is stable",
  brandVoice.getBrandPromise() === "Strong writers aren't born. They're built.",
);
check(
  "coach note can use writing context",
  brandVoice.getCoachNote({ category: "narrative", seed: "story" }).length > 10,
);
check(
  "reflection prompt is genre-aware",
  /fact|teach|step|explain/i.test(brandVoice.getReflectionPrompt("informative", 5, "microwave")),
);
check(
  "scorecard wording is teacher-like",
  /ideas|reader|clear|stronger|editing/i.test(brandVoice.getScorecardExplanation("Conventions", 3)),
);
check(
  "growth labels are centralized",
  brandVoice.labels.todaysGrowth === "Today's Growth",
);

if (failures > 0) {
  console.error(`\n❌ ${failures} brand voice check(s) failed.`);
  process.exit(1);
}

console.log("\n✅ Brand voice checks passed.");
