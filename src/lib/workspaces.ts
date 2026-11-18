"use client";
import { createClient } from "./supabase/client";
const queues = new Map<string, Promise<void>>();
export async function loadWorkspace(studentId: string | undefined, kind: "planner" | "grammar", key: string) {
  const local = localStorage.getItem(key);
  if (!studentId) return { raw: local, cloud: false };
  // A failed cloud save must never be replaced by an older server copy on reload.
  if (local && localStorage.getItem(`${key}:pending`)) {
    try { await saveWorkspace(studentId, kind, key, JSON.parse(local)); return { raw: local, cloud: true }; }
    catch { return { raw: local, cloud: false }; }
  }
  const { data, error } = await createClient().from("student_workspaces").select("data").eq("student_id", studentId).eq("kind", kind).eq("workspace_key", kind === "grammar" ? "default" : key).maybeSingle();
  if (error) return { raw: local, cloud: false };
  if (data) { const raw = JSON.stringify(data.data); try { localStorage.setItem(key, raw); } catch {} return { raw, cloud: true }; }
  if (local) { try { await saveWorkspace(studentId, kind, key, JSON.parse(local)); } catch { return { raw: local, cloud: false }; } }
  return { raw: local, cloud: true };
}
export function saveWorkspace(studentId: string | undefined, kind: "planner" | "grammar", key: string, data: unknown) {
  let localSaved = true;
  const revision = `${Date.now()}:${Math.random()}`;
  try { localStorage.setItem(key, JSON.stringify(data)); if (studentId) localStorage.setItem(`${key}:pending`, revision); } catch { localSaved = false; }
  if (!studentId) return localSaved ? Promise.resolve() : Promise.reject(new Error("Could not save on this device."));
  const queueKey = `${studentId}:${key}`;
  const next = (queues.get(queueKey) ?? Promise.resolve()).catch(() => {}).then(async () => {
    const { error } = await createClient().from("student_workspaces").upsert({ student_id: studentId, kind, workspace_key: kind === "grammar" ? "default" : key, data, updated_at: new Date().toISOString() });
    if (error) throw new Error(localSaved ? "Saved on this device; cloud saving is temporarily unavailable." : "Could not save. Keep this page open.");
    try { if (localStorage.getItem(`${key}:pending`) === revision) localStorage.removeItem(`${key}:pending`); } catch {}
  });
  queues.set(queueKey, next);
  void next.finally(() => { if (queues.get(queueKey) === next) queues.delete(queueKey); }).catch(() => {});
  return next;
}
