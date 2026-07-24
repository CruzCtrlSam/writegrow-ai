"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SkillSprout } from "@/components/SkillSprout";
import { createClient } from "@/lib/supabase/client";
import { LEVEL_LABELS, SKILLS, type Student, type WritingLevel } from "@/lib/types";
import { brandVoice } from "@/services/brandVoice";

interface Overview {
  student: Student;
  avg: number;
  submitted: number;
}

export default function ParentDashboard() {
  const [firstName, setFirstName] = useState("there");
  const [plan, setPlan] = useState("free");
  const [overviews, setOverviews] = useState<Overview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profile }, { data: students }, { data: sub }] = await Promise.all([
        supabase.from("users").select("full_name").eq("id", user.id).maybeSingle(),
        supabase.from("students").select("*").order("created_at", { ascending: true }),
        supabase.from("subscriptions").select("plan").eq("parent_id", user.id).maybeSingle(),
      ]);

      const studentList = (students ?? []) as Student[];
      const rows = await Promise.all(
        studentList.map(async (student) => {
          const [{ data: scores }, { count }] = await Promise.all([
            supabase
              .from("skill_scores")
              .select("score")
              .eq("student_id", student.id)
              .order("created_at", { ascending: false })
              .limit(SKILLS.length * 2),
            supabase
              .from("writing_submissions")
              .select("id", { count: "exact", head: true })
              .eq("student_id", student.id)
              .eq("status", "submitted"),
          ]);
          const avg = scores?.length
            ? Math.round(scores.reduce((sum, row) => sum + (row.score as number), 0) / scores.length)
            : 0;
          return { student, avg, submitted: count ?? 0 };
        }),
      );

      setFirstName(profile?.full_name?.split(" ")[0] ?? "there");
      setPlan(sub?.plan ?? "free");
      setOverviews(rows);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="card p-6 text-ink/60">Loading dashboard...</div>;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Parent Dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
            Hi {firstName}
          </h1>
          <p className="mt-1 text-sm font-medium text-sprout-700">
            {brandVoice.getBrandPromise()}
          </p>
          <p className="mt-1 text-ink/60">
            Plan: <span className="font-semibold capitalize">{plan}</span>
            {" · "}
            {overviews.length} student{overviews.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/parent/students/new" className="btn-primary">
          + Add student
        </Link>
      </div>

      <div className="card mt-6 bg-sprout-50/60 p-4">
        <p className="eyebrow">{brandVoice.labels.coachNote}</p>
        <p className="mt-1 text-sm text-ink/75">{brandVoice.getCoachNote()}</p>
      </div>

      {overviews.length === 0 ? (
        <div className="card mt-8 flex flex-col items-center p-6 text-center sm:p-12">
          <SkillSprout score={8} size={96} />
          <h2 className="mt-4 font-display text-xl font-semibold">Plant your first writer</h2>
          <p className="mt-1 max-w-sm text-sm text-ink/60">
            Add a student profile to unlock daily prompts, coaching, and progress tracking.
          </p>
          <Link href="/parent/students/new" className="btn-primary mt-5">
            Add your first student
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {overviews.map(({ student, avg, submitted }) => {
            const base = `/student`;
            const query = `studentId=${student.id}`;
            return (
              <div key={student.id} className="card flex flex-col p-5 sm:p-6">
                <div className="flex min-w-0 items-center gap-4">
                  <SkillSprout score={avg} size={64} />
                  <div className="min-w-0">
                    <h3 className="font-display text-xl font-semibold">{student.name}</h3>
                    <p className="text-sm text-ink/60">
                      Grade {student.grade} · {LEVEL_LABELS[student.level as WritingLevel]}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-lg bg-sprout-50 px-2.5 py-1 font-medium text-sprout-700">
                    {avg ? `${avg} growth marker` : "Growth journey starting"}
                  </span>
                  <span className="rounded-lg bg-honey-100 px-2.5 py-1 font-medium text-honey-500">
                    {submitted} submitted
                  </span>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`${base}/dashboard?${query}`} className="btn-primary flex-1">
                    Open
                  </Link>
                  <Link href={`${base}/progress?${query}`} className="btn-ghost">
                    Progress
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
