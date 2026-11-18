"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BASE_PATH } from "@/lib/paths";
import { createClient } from "@/lib/supabase/client";
import { formatPilotDate, pilotRequest, studentAccess, type StudentAccess } from "@/lib/pilot";

export function PilotDashboard({ students }: { students: { id: string; name: string }[] }) {
  const [accesses, setAccesses] = useState<Record<string, StudentAccess>>({});
  const [availability, setAvailability] = useState<{ ready: boolean; available: number; mode: "test" | "live" } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [welcomeStudent, setWelcomeStudent] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const ids = students.map((student) => student.id).join(",");
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const entries = await Promise.all(ids.split(",").filter(Boolean).map(async (id) => [id, await studentAccess(id)] as const));
        if (active) { const map = Object.fromEntries(entries); setAccesses(map); setWelcomeStudent(entries.find(([, access]) => access.pilot_status === "active" && !access.welcome_completed)?.[0] ?? null); }
        const spots = await pilotRequest("pilot-status");
        if (active) setAvailability(spots);
      } catch (e) { if (active) setMessage(e instanceof Error ? e.message : "Please refresh."); }
    }
    load();
    return () => { active = false; };
  }, [ids, retry]);
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("checkout_session_id");
    const query = new URLSearchParams(window.location.search);
    if (query.get("checkout") === "cancelled" && query.get("studentId")) {
      pilotRequest("pilot-checkout", { action: "cancel", studentId: query.get("studentId") }).then((result) => { setMessage(result.active ? "Your payment completed and access is active." : result.released ? "Checkout cancelled. No payment was taken; the reserved spot is available again." : "No pending checkout was found. Your access is shown below."); setRetry((value) => value + 1); window.history.replaceState({}, "", window.location.pathname); }).catch((error) => setMessage(error.message));
      return;
    }
    if (!sessionId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function verify() {
      setMessage("Verifying your payment. Your student will be ready shortly...");
      try {
        const result = await pilotRequest("pilot-status", { sessionId });
        if (!active) return;
        if (result.active) { setMessage("Payment confirmed. Your student's four weeks start now."); setRetry((value) => value + 1); window.history.replaceState({}, "", window.location.pathname); return; }
        if (++attempts < 15) timer = setTimeout(verify, 2000);
        else setMessage("Payment is still being verified. Refresh access in a moment; please don't pay again.");
      } catch (e) { if (active) setMessage(e instanceof Error ? e.message : "Please refresh access."); }
    }
    verify();
    return () => { active = false; clearTimeout(timer); };
  }, []);
  async function checkout(studentId: string) {
    setBusy(studentId); setMessage("");
    try {
      const result = await pilotRequest("pilot-checkout", { studentId, returnUrl: `${window.location.origin}${BASE_PATH}` });
      if (result.active) { setRetry((value) => value + 1); return; }
      const url = new URL(result.url);
      if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") throw new Error("Checkout could not open safely.");
      window.location.assign(url.href);
    } catch (e) { setMessage(e instanceof Error ? e.message : "Checkout couldn't open."); }
    finally { setBusy(null); }
  }
  const welcome = welcomeStudent ? accesses[welcomeStudent] : null;
  return <section className="my-6 border-y border-sprout-200 py-6" aria-labelledby="pilot-title">
    <h2 id="pilot-title" className="font-display text-2xl font-semibold">Four-week homeschool pilot</h2>
    <p className="mt-2 text-ink/75">$14.99 per student, paid once. Five total paid spots. No automatic renewal.</p>
    <p className="mt-2 text-sm text-ink/65">Grammar Studio, planning, drafting, in-app coaching, and parent progress tracking.</p>
    {availability?.mode !== "live" && <p className="mt-2 text-sm font-semibold text-sprout-700">Test mode only. No real payments are being accepted.</p>}
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}
    {availability && <p className="mt-2 text-sm text-ink/60">{!availability.ready ? "The pilot is not open for checkout yet." : availability.available === 0 ? "All five spots are currently purchased or reserved." : `${availability.available} of 5 ${availability.mode === "test" ? "test " : ""}spots available.`}</p>}
    <button type="button" className="mt-3 min-h-11 text-sm font-semibold underline" onClick={() => setRetry((value) => value + 1)}>Refresh access and availability</button>
    {!students.length && <p className="mt-3"><Link href="/parent/students/new" className="btn-primary">Add your first student</Link></p>}
    <div className="mt-4 divide-y divide-sprout-100">
      {students.map((student) => { const access = accesses[student.id]; return <div key={student.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div><h3 className="font-semibold">{student.name}</h3><p className="mt-1 text-sm text-ink/65">{access?.pilot_status === "active" && access.expires_at ? `Pilot access through ${formatPilotDate(access.expires_at)}. No renewal.` : access?.pilot_status === "expired" ? "Your pilot has ended. Free access continues; your work is saved." : access?.full_access ? "Your existing access is preserved." : "Free access: one prompt per week and a first grammar lesson."}</p></div>
        {access?.pilot_status === "active" ? <button type="button" className="btn-primary" onClick={() => setWelcomeStudent(student.id)}>Open welcome guide</button> : access && !access.full_access && access.pilot_status !== "expired" ? <button type="button" className="btn-primary" disabled={busy !== null || !availability?.ready || availability.available === 0} onClick={() => checkout(student.id)}>{busy === student.id ? "Opening checkout..." : `${availability?.mode === "live" ? "Checkout" : "Test checkout"} · $14.99`}</button> : null}
      </div>; })}
    </div>
    {welcome && welcomeStudent && <div className="mt-5 border-t border-sprout-200 pt-5">
      <p className="eyebrow">Welcome to your four weeks</p>
      <p className="mt-2 text-sm">Your selected student has the full learning and writing workspace until {welcome.expires_at && formatPilotDate(welcome.expires_at)}. Coaching happens inside WriteGrow.</p>
      <ol className="mt-4 grid gap-4 sm:grid-cols-3">
        <li><p className="font-semibold">1. Learn one skill</p><Link className="mt-2 inline-block min-h-11 text-sprout-700 underline" href={`/student/learn?studentId=${welcomeStudent}`}>Start the first lesson</Link></li>
        <li><p className="font-semibold">2. Plan and draft</p><Link className="mt-2 inline-block min-h-11 text-sprout-700 underline" href={`/student/write?studentId=${welcomeStudent}&planner=1`}>Open Write Today and its planner</Link></li>
        <li><p className="font-semibold">3. See growth</p><Link className="mt-2 inline-block min-h-11 text-sprout-700 underline" href={`/student/progress?studentId=${welcomeStudent}`}>Open parent progress</Link></li>
      </ol>
      <button className="btn-ghost mt-3" type="button" onClick={async () => { const { error } = await createClient().rpc("complete_pilot_welcome", { p_order: welcome.order_id }); if (error) setMessage("Your guide couldn't close. Please try again."); else setWelcomeStudent(null); }}>I'm ready</button>
    </div>}
  </section>;
}
