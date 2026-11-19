"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CrossCountryEscape } from "@/components/CrossCountryEscape";
import { createClient } from "@/lib/supabase/client";
export default function EscapePage() { return <Suspense fallback={<p>Loading adventure...</p>}><Escape /></Suspense>; }
function Escape() {
  const studentId = useSearchParams().get("studentId");
  const [student, setStudent] = useState<{ id: string; name: string; grade: number } | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true; setLoading(true); setStudent(null);
    async function load() {
      if (!studentId) { if (active) setLoading(false); return; }
      const { data } = await createClient().from("students").select("id,name,grade").eq("id", studentId).maybeSingle();
      if (active) { setStudent(data); setLoading(false); }
    }
    load(); return () => { active = false; };
  }, [studentId]);
  if (loading) return <p>Loading adventure...</p>;
  if (!student) return <p>Choose a student from the <Link href="/parent/dashboard" className="underline">parent dashboard</Link> to open their adventures.</p>;
  return <CrossCountryEscape key={student.id} student={student} />;
}
