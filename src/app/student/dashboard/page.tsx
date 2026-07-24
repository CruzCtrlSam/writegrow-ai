"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SkillSprout } from "@/components/SkillSprout";
import {
  CATEGORY_LABELS,
  LEVEL_LABELS,
  type PromptCategory,
  type Student,
  type WritingLevel,
} from "@/lib/types";
import { minWordsFor } from "@/lib/prompts";
import { createClient } from "@/lib/supabase/client";
import { brandVoice } from "@/services/brandVoice";

const CATEGORY_BLURB: Record<PromptCategory, string> = {
  narrative: "Tell a story with a beginning, middle, and end.",
  opinion: "Share what you think and back it up with reasons.",
  informative: "Teach your reader about something clearly.",
  creative: "Imagine, invent, and have fun with words.",
  summary: "Retell the most important parts in your own words.",
};

export default function StudentDashboard() {
  return (
    <Suspense fallback={<div className="card p-6 text-ink/60">Loading student...</div>}>
      <StudentDashboardInner />
    </Suspense>
  );
}

function StudentDashboardInner() {
  const studentId = useSearchParams().get("studentId");
  const [student, setStudent] = useState<Student | null>(null);
  const [recent, setRecent] = useState<{ created_at: string; status: string; category: PromptCategory | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!studentId) return setLoading(false);
      const supabase = createClient();
      const [{ data: studentData }, { data: recentRows }] = await Promise.all([
        supabase.from("students").select("*").eq("id", studentId).maybeSingle(),
        supabase
          .from("writing_submissions")
          .select("id, status, created_at, category")
          .eq("student_id", studentId)
          .order("created_at", { ascending: false })
          .limit(1),
      ]);
      setStudent((studentData as Student | null) ?? null);
      setRecent((recentRows?.[0] as typeof recent) ?? null);
      setLoading(false);
    }
    load();
  }, [studentId]);

  if (loading) return <div className="card p-6 text-ink/60">Loading student...</div>;
  if (!studentId || !student) return <div className="card p-6 text-ink/60">Choose a student from the parent dashboard.</div>;

  const target = minWordsFor(student.grade, student.level as WritingLevel);
  const query = `studentId=${student.id}`;
  const recentCategory = recent?.category;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <SkillSprout score={45} size={64} />
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Hi {student.name}!</h1>
            <p className="text-ink/60">
              Grade {student.grade} · {LEVEL_LABELS[student.level as WritingLevel]} · aim for ~{target} words
            </p>
            <p className="mt-1 text-sm font-medium text-sprout-700">
              {brandVoice.getBrandPromise()}
            </p>
          </div>
        </div>
        <Link href={`/student/write?${query}`} className="btn-primary w-full px-6 py-3 text-base sm:w-auto">
          Write today
        </Link>
      </div>

      <div className="card mt-6 flex flex-col gap-3 bg-sprout-50/60 p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
        <span className="text-2xl">🌱</span>
        <div>
          <p className="eyebrow">{brandVoice.labels.coachNote}</p>
          <p className="mt-1 text-sm text-ink/75">
            {brandVoice.getCoachNote({ category: recentCategory, seed: student.id })}
          </p>
        </div>
      </div>

      <h2 className="mt-8 font-display text-xl font-semibold">Choose today's growth path</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(CATEGORY_LABELS) as PromptCategory[]).map((cat) => (
          <Link
            key={cat}
            href={`/student/write?${query}&category=${cat}`}
            className="card group min-h-32 p-5 transition hover:shadow-lift"
          >
            <h3 className="font-display text-lg font-semibold text-sprout-700">
              {CATEGORY_LABELS[cat]}
            </h3>
            <p className="mt-1 text-sm text-ink/60">{CATEGORY_BLURB[cat]}</p>
            <span className="mt-3 inline-block text-sm font-semibold text-sprout-600 group-hover:underline">
              Start growing →
            </span>
          </Link>
        ))}
      </div>

      {recent && (
        <p className="mt-6 text-sm text-ink/55">
          Last growth session: {new Date(recent.created_at).toLocaleDateString()} ({recent.status})
        </p>
      )}
    </div>
  );
}
