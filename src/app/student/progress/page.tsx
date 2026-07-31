"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AchievementPanel } from "@/components/AchievementPanel";
import { SkillSprout } from "@/components/SkillSprout";
import type { AchievementSubmission } from "@/lib/achievements";
import { SKILL_LABELS, SKILLS, type Skill } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { brandVoice } from "@/services/brandVoice";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-3xl font-semibold text-sprout-700">{value}</p>
      <p className="text-sm text-ink/60">{label}</p>
    </div>
  );
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<div className="card p-6 text-ink/60">Loading progress...</div>}>
      <ProgressPageInner />
    </Suspense>
  );
}

function ProgressPageInner() {
  const studentId = useSearchParams().get("studentId");
  const [latest, setLatest] = useState<Record<Skill, number>>(() => {
    const initial = {} as Record<Skill, number>;
    for (const skill of SKILLS) initial[skill] = 0;
    return initial;
  });
  const [weekSubs, setWeekSubs] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [achievementRows, setAchievementRows] = useState<AchievementSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!studentId) return setLoading(false);
      const supabase = createClient();
      const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
      const [{ data: scores }, { count }, { data: weekWords }, { data: submissions }] = await Promise.all([
        supabase
          .from("skill_scores")
          .select("skill, score, created_at")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(SKILLS.length * 6),
        supabase
          .from("writing_submissions")
          .select("id", { count: "exact", head: true })
          .eq("student_id", studentId)
          .eq("status", "submitted")
          .gte("created_at", weekAgo),
        supabase
          .from("writing_submissions")
          .select("word_count")
          .eq("student_id", studentId)
          .gte("created_at", weekAgo),
        supabase
          .from("writing_submissions")
          .select("created_at, word_count, category, status")
          .eq("student_id", studentId)
          .eq("status", "submitted")
          .order("created_at", { ascending: false })
          .limit(160),
      ]);

      const bySkill: Record<string, number[]> = {};
      for (const row of scores ?? []) (bySkill[row.skill] ??= []).push(row.score as number);
      const next = {} as Record<Skill, number>;
      for (const skill of SKILLS) {
        const vals = (bySkill[skill] ?? []).slice(0, 3);
        next[skill] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      }
      setLatest(next);
      setWeekSubs(count ?? 0);
      setTotalWords((weekWords ?? []).reduce((sum, row) => sum + (row.word_count as number), 0));
      setAchievementRows((submissions as AchievementSubmission[] | null) ?? []);
      setLoading(false);
    }
    load();
  }, [studentId]);

  if (loading) return <div className="card p-6 text-ink/60">Loading progress...</div>;

  const ranked = (Object.entries(latest) as [Skill, number][])
    .filter(([, value]) => value > 0)
    .sort((a, b) => a[1] - b[1]);
  const suggested = ranked.slice(0, 3);
  const hasData = ranked.length > 0;

  return (
    <div>
      <p className="eyebrow">{brandVoice.labels.growthJourney}</p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
        {brandVoice.labels.writingProgress}
      </h1>
      <p className="mt-1 text-ink/60">Each sprout grows as writing habits get stronger across submissions.</p>

      <div className="card mt-6 grid gap-4 p-6 sm:grid-cols-3">
        <Stat label="Submitted this week" value={String(weekSubs)} />
        <Stat label="Words written this week" value={String(totalWords)} />
        <Stat label="Growing skills with history" value={`${ranked.length} / ${SKILLS.length}`} />
      </div>

      <div className="mt-6">
        <AchievementPanel submissions={achievementRows} />
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold">Growth garden</h2>
      {!hasData ? (
        <div className="card mt-4 p-6 text-center text-ink/55 sm:p-10">
          No growth history yet. Submit a piece in{" "}
          <span className="font-semibold">{brandVoice.labels.todaysGrowth}</span> to start growing.
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {SKILLS.map((skill) => (
            <div key={skill} className="card flex min-h-36 flex-col items-center p-3 text-center sm:p-4">
              <SkillSprout score={latest[skill]} size={76} />
              <p className="mt-1 text-xs font-medium leading-tight text-ink/70">{SKILL_LABELS[skill]}</p>
              <p className="text-sm font-semibold text-sprout-700">{latest[skill] || "—"}</p>
            </div>
          ))}
        </div>
      )}

      {suggested.length > 0 && (
        <div className="card mt-8 p-5 sm:p-6">
          <h2 className="font-display text-xl font-semibold">Suggested growth areas</h2>
          <p className="mt-1 text-sm text-ink/60">These skills are ready for the next step right now.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {suggested.map(([skill, val]) => (
              <span key={skill} className="rounded-full bg-honey-100 px-3 py-1.5 text-sm font-medium text-ink">
                {SKILL_LABELS[skill]} · {val}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
