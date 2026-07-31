import { buildAchievementSnapshot, type AchievementSubmission } from "@/lib/achievements";

function WritingSpark({ streak }: { streak: number }) {
  const level = Math.min(1, streak / 7);
  const glow = 12 + level * 20;
  return (
    <div className="writing-spark" aria-hidden="true">
      <span className="writing-spark__ring" style={{ width: glow, height: glow }} />
      <span className="writing-spark__seed" />
      <span className="writing-spark__beam writing-spark__beam--one" />
      <span className="writing-spark__beam writing-spark__beam--two" />
      <span className="writing-spark__beam writing-spark__beam--three" />
    </div>
  );
}

function BadgeMark({ tone, unlocked }: { tone: "sprout" | "honey" | "clay"; unlocked: boolean }) {
  return (
    <div className={`badge-mark badge-mark--${tone} ${unlocked ? "badge-mark--unlocked" : ""}`} aria-hidden="true">
      <span className="badge-mark__fold" />
      <span className="badge-mark__line badge-mark__line--one" />
      <span className="badge-mark__line badge-mark__line--two" />
    </div>
  );
}

export function AchievementPanel({
  submissions,
  compact = false,
}: {
  submissions: AchievementSubmission[];
  compact?: boolean;
}) {
  const { stats, badges } = buildAchievementSnapshot(submissions);
  const unlocked = badges.filter((badge) => badge.unlocked);
  const featured = compact ? badges.slice(0, 4) : badges;

  return (
    <section className="card overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.5fr)]">
        <div className="achievement-streak p-5 sm:p-6">
          <p className="eyebrow">Writing streak</p>
          <div className="mt-4 flex items-center gap-4">
            <WritingSpark streak={stats.currentStreak} />
            <div>
              <p className="font-display text-4xl font-semibold text-sprout-800">
                {stats.currentStreak}
              </p>
              <p className="text-sm font-medium text-ink/65">
                {stats.currentStreak === 1 ? "day in a row" : "days in a row"}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-ink/70">
            {stats.currentStreak > 0
              ? "A steady writing habit is growing."
              : "Submit writing today to start a streak."}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="font-display text-2xl font-semibold text-sprout-700">{stats.totalSubmitted}</p>
              <p className="text-ink/55">pieces</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold text-sprout-700">{stats.totalWords}</p>
              <p className="text-ink/55">words</p>
            </div>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Achievements</p>
              <h2 className="mt-1 font-display text-xl font-semibold">Badges earned</h2>
            </div>
            <p className="text-sm font-semibold text-sprout-700">
              {unlocked.length} / {badges.length}
            </p>
          </div>
          <div className={`mt-4 grid gap-3 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
            {featured.map((badge) => (
              <div
                key={badge.id}
                className={`achievement-badge rounded-xl border p-3 ${
                  badge.unlocked
                    ? "border-sprout-200 bg-sprout-50/70"
                    : "border-black/5 bg-ink/[0.025]"
                }`}
              >
                <BadgeMark tone={badge.tone} unlocked={badge.unlocked} />
                <p className="mt-2 text-sm font-semibold text-ink">{badge.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink/60">{badge.description}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-sprout-500 transition-all duration-700"
                    style={{ width: `${Math.round((badge.progress / badge.target) * 100)}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] font-medium text-ink/45">
                  {badge.progress} / {badge.target}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
