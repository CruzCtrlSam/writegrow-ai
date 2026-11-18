"use client";
import { useEffect, useState } from "react";
import { createClient } from "./supabase/client";
export interface StudentAccess { full_access: boolean; pilot_status: "active" | "expired" | "none"; expires_at: string | null; order_id: string | null; welcome_completed: boolean; weekly_prompt_limit: number | null; server_now: string }
export async function studentAccess(studentId: string): Promise<StudentAccess> {
  const { data, error } = await createClient().rpc("get_student_access", { p_student: studentId });
  if (error) throw new Error("We couldn't verify access. Please refresh and try again.");
  return data as StudentAccess;
}
export function useStudentAccess(studentId: string) {
  const [access, setAccess] = useState<StudentAccess | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setAccess(null);
    async function refresh() { try { const next = await studentAccess(studentId); if (active) { setAccess(next); setError(""); } } catch (e) { if (active) { setAccess(null); setError(e instanceof Error ? e.message : "Access unavailable"); } } }
    refresh();
    const timer = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [studentId]);
  return { access, error };
}
export async function pilotRequest(name: "pilot-status" | "pilot-checkout", body?: unknown) {
  const { data, error } = await createClient().functions.invoke(name, body ? { body } : { method: "GET" });
  if (error) {
    const context = error.context;
    const detail = context instanceof Response ? await context.json().catch(() => null) : null;
    throw new Error(detail?.error ?? "The pilot is temporarily unavailable. Please try again.");
  }
  return data;
}
export function formatPilotDate(date: string) { return new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
