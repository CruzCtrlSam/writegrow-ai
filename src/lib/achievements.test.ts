import { buildAchievementSnapshot, calculateCurrentStreak } from "./achievements";

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "  ✓" : "  ✗ FAIL"}  ${label}`);
  if (!ok) failures++;
}

const now = new Date("2026-07-31T15:00:00");

console.log("\nAchievements:");
check(
  "counts a streak through today",
  calculateCurrentStreak(["2026-07-29", "2026-07-30", "2026-07-31"], now) === 3,
);
check(
  "keeps yesterday's streak alive before today's writing",
  calculateCurrentStreak(["2026-07-28", "2026-07-29", "2026-07-30"], now) === 3,
);
check(
  "does not keep an old streak alive",
  calculateCurrentStreak(["2026-07-25", "2026-07-26"], now) === 0,
);

const snapshot = buildAchievementSnapshot(
  [
    { created_at: "2026-07-29T10:00:00", word_count: 90, category: "narrative", status: "submitted" },
    { created_at: "2026-07-30T10:00:00", word_count: 110, category: "opinion", status: "submitted" },
    { created_at: "2026-07-31T10:00:00", word_count: 120, category: "summary", status: "submitted" },
    { created_at: "2026-07-31T11:00:00", word_count: 0, category: "creative", status: "draft" },
  ],
  now,
);

check("drafts do not count toward achievements", snapshot.stats.totalSubmitted === 3);
check("current streak is calculated from unique writing days", snapshot.stats.currentStreak === 3);
check("total words are summed from submitted writing", snapshot.stats.totalWords === 320);
check("first draft badge unlocks", snapshot.badges.some((badge) => badge.id === "first-draft" && badge.unlocked));
check("three-day badge unlocks", snapshot.badges.some((badge) => badge.id === "steady-three" && badge.unlocked));
check("category badge unlocks after three categories", snapshot.badges.some((badge) => badge.id === "path-finder" && badge.unlocked));

if (failures > 0) {
  console.error(`\n❌ ${failures} achievement check(s) failed.`);
  process.exit(1);
}

console.log("\n✅ Achievement checks passed.");
