"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { WritingEditor } from "@/components/WritingEditor";
import { minWordsFor } from "@/lib/prompts";
import { CATEGORIES } from "@/lib/static-app";
import { createClient } from "@/lib/supabase/client";
import type { PromptCategory, Student, WritingLevel } from "@/lib/types";
import { brandVoice } from "@/services/brandVoice";

export default function WritePage() {
  return (
    <Suspense fallback={<div className="card p-6 text-ink/60">Loading writing space...</div>}>
      <WritePageInner />
    </Suspense>
  );
}

function WritePageInner() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("studentId");
  const category = searchParams.get("category");
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!studentId) return setLoading(false);
      const supabase = createClient();
      const { data } = await supabase.from("students").select("*").eq("id", studentId).maybeSingle();
      setStudent((data as Student | null) ?? null);
      setLoading(false);
    }
    load();
  }, [studentId]);

  if (loading) return <div className="card p-6 text-ink/60">Loading writing space...</div>;
  if (!studentId || !student) return <div className="card p-6 text-ink/60">Choose a student from the parent dashboard.</div>;

  const minWords = minWordsFor(student.grade, student.level as WritingLevel);
  const initialCategory = CATEGORIES.includes(category as PromptCategory)
    ? (category as PromptCategory)
    : undefined;

  return (
    <div className="min-w-0">
      <p className="eyebrow">Write Today</p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
        {brandVoice.labels.todaysGrowth}
      </h1>
      <p className="mt-1 text-ink/60">{brandVoice.messages.writing.pageSubtitle}</p>
      <div className="mt-6">
        <WritingEditor
          studentId={student.id}
          studentName={student.name}
          minWords={minWords}
          initialCategory={initialCategory}
        />
      </div>
    </div>
  );
}
