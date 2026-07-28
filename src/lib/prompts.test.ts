import {
  fallbackPrompt,
  fallbackPromptCount,
  fallbackPromptTotalCount,
} from "./prompts";
import type { PromptCategory } from "./types";

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "  ✓" : "  ✗ FAIL"}  ${label}`);
  if (!ok) failures++;
}

const categories: PromptCategory[] = [
  "narrative",
  "opinion",
  "informative",
  "creative",
  "summary",
];

console.log("\nPrompt library:");
check("every grade has access to at least 75 prompts", fallbackPromptTotalCount() >= 75);

for (const category of categories) {
  check(`${category} has a healthy prompt pool`, fallbackPromptCount(category) >= 15);
}

const avoided = fallbackPrompt("informative", null, ["How Something Works"]);
check("new prompt avoids a recently used title when possible", avoided.title !== "How Something Works");

const traitPrompt = fallbackPrompt("opinion", "kindness", ["More Recess?"]);
check("character trait is preserved", traitPrompt.character_trait === "kindness");
check("character trait is woven into the prompt", traitPrompt.body.includes("kindness"));

if (failures > 0) {
  console.error(`\n❌ ${failures} prompt check(s) failed.`);
  process.exit(1);
}

console.log("\n✅ Prompt checks passed.");
