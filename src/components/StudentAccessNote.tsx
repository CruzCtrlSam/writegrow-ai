"use client";
import Link from "next/link";
import { formatPilotDate, useStudentAccess } from "@/lib/pilot";
export function StudentAccessNote({ studentId }: { studentId: string }) {
  const { access, error } = useStudentAccess(studentId);
  if (error) return <p role="alert" className="my-3 text-sm">{error}</p>;
  if (!access) return null;
  if (access.pilot_status === "active" && access.expires_at) return <p className="my-3 text-sm text-sprout-700">Four-week pilot · access ends {formatPilotDate(access.expires_at)} · no automatic renewal.</p>;
  if (access.full_access) return null;
  return <div className="my-4 border-y border-sprout-100 py-3 text-sm"><p>{access.pilot_status === "expired" ? "Your pilot has ended. Your drafts, plans, and progress are still saved." : "Free access includes one writing prompt each week and the first grammar lesson."}</p><Link className="inline-block min-h-11 pt-2 font-semibold text-sprout-700 underline" href="/parent/dashboard">Parent access and pilot details</Link></div>;
}
