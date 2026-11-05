"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GrammarPractice } from "@/components/GrammarPractice";
import { createClient } from "@/lib/supabase/client";

export default function LearnPage() {
  return <Suspense fallback={<p className="py-6 text-ink/60">Loading lessons...</p>}><LearningSpace /></Suspense>;
}
function LearningSpace() {
  const studentId = useSearchParams().get("studentId");
  const [student, setStudent] = useState<{ id: string; grade: number } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setStudent(null);
    async function load() {
      if (!studentId) { if (active) setLoading(false); return; }
      try {
        const { data, error } = await createClient().from("students").select("id, grade").eq("id", studentId).maybeSingle();
        if (error) throw error;
        if (active) setStudent(data);
      } catch { if (active) setError("Lessons could not load. Please refresh and try again."); }
      finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [studentId]);
  if (loading) return <p className="py-6 text-ink/60">Loading lessons...</p>;
  if (error) return <p className="py-6" role="alert">{error}</p>;
  if (!student) return <p className="py-6 text-ink/60">Choose a student from the parent dashboard.</p>;
  return <div><p className="eyebrow">Learn a little. Grow a little.</p><h1 className="mt-1 font-display text-3xl font-semibold">Grammar studio</h1><GrammarPractice key={student.id} studentId={student.id} grade={student.grade} /></div>;
}
