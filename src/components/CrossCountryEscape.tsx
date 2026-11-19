"use client";
import { useEffect, useRef, useState } from "react";
import { appPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/client";
import { CCE_CHANNEL, cceCacheKey, validCceMessage, validCceState, type CceState } from "@/lib/cce-state";

export function CrossCountryEscape({ student }: { student: { id: string; name: string; grade: number } }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [token] = useState(() => crypto.randomUUID());
  const [ready, setReady] = useState(false);
  const [height, setHeight] = useState(900);
  const [status, setStatus] = useState("Loading game progress...");
  const retry = useRef<() => void>(() => {});
  useEffect(() => {
    let active = true, latest: CceState = { grade: student.grade, progress: [] }, revision = 0;
    let queue = Promise.resolve();
    const key = cceCacheKey(student.id), db = createClient();
    function backup(state: CceState, pending: boolean) {
      try { localStorage.setItem(key, JSON.stringify(state)); if (pending) localStorage.setItem(`${key}:pending`, "1"); else localStorage.removeItem(`${key}:pending`); } catch {}
    }
    function save(state: CceState) {
      latest = state; const current = ++revision;
      backup(state, true); setStatus("Saving game progress...");
      queue = queue.catch(() => {}).then(async () => {
        const { error } = await db.from("cross_country_escape_progress").upsert({ student_id: student.id, grade: state.grade, progress: state.progress, updated_at: new Date().toISOString() });
        if (error) throw error;
        if (current === revision) { backup(state, false); if (active) setStatus("Game progress saved to your account."); }
      }).catch(() => { if (active && current === revision) setStatus("Account saving is unavailable. Keep playing here and retry saving when connected."); });
    }
    retry.current = () => save(latest);
    function message(event: MessageEvent) {
      if (!active || !validCceMessage(event, window.location.origin, frame.current?.contentWindow, token)) return;
      const msg = event.data;
      if (msg.type === "ready") frame.current?.contentWindow?.postMessage({ channel: CCE_CHANNEL, token, type: "init", state: latest }, window.location.origin);
      if (msg.type === "change" && validCceState(msg.state)) save(msg.state);
      if (msg.type === "height" && Number.isFinite(msg.height)) setHeight(Math.max(640, Math.min(20000, msg.height)));
      if (msg.type === "scroll") frame.current?.scrollIntoView({ block: "start", behavior: "instant" });
    }
    async function load() {
      let cached: unknown, pending = false;
      try { cached = JSON.parse(localStorage.getItem(key) ?? "null"); pending = localStorage.getItem(`${key}:pending`) === "1"; } catch {}
      if (validCceState(cached)) latest = cached;
      const { data, error } = await db.from("cross_country_escape_progress").select("grade,progress").eq("student_id", student.id).maybeSingle();
      if (!active) return;
      if (error) setStatus("Account saving is unavailable. Keep playing here and retry saving when connected.");
      else if (pending && validCceState(cached)) save(cached);
      else if (validCceState(data)) { latest = data; backup(latest, false); setStatus("Game progress saved to your account."); }
      else if (validCceState(cached)) save(cached);
      else setStatus("Game progress will save to your account.");
      setReady(true);
    }
    window.addEventListener("message", message);
    load();
    return () => { active = false; window.removeEventListener("message", message); };
  }, [student.id, student.grade, token]);
  return <section aria-label="Cross-Country Escape">
    <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
      <div><p className="eyebrow">Separate adventures</p><h1 className="mt-1 font-display text-2xl font-semibold">Cross-Country Escape</h1><p className="mt-1 text-sm text-ink/65">{student.name}&apos;s game workspace</p></div>
      <div className="max-w-sm text-sm"><p role="status" className="text-ink/60">{status}</p>{status.includes("unavailable") && <button type="button" className="min-h-11 font-semibold text-sprout-700 underline" onClick={() => retry.current()}>Retry saving</button>}</div>
    </div>
    {ready && <iframe ref={frame} title="Cross-Country Escape adventure game" src={appPath(`/games/cross-country-escape/index.html?embedded=1&bridge=${token}`)} className="cce-frame" style={{ height, scrollMarginTop: "10rem" }} sandbox="allow-scripts allow-same-origin" />}
  </section>;
}
