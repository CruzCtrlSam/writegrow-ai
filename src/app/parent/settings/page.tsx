"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getPlan } from "@/lib/plans";
import { updateSettingsFromBrowser } from "@/lib/static-app";
import { PilotDashboard } from "@/components/PilotDashboard";

export default function SettingsPage() {
  const [themes, setThemes] = useState(false);
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("free");
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    async function load() {
      try {
        const db = createClient();
        const { data: { user } } = await db.auth.getUser();
        if (!user) return;
        const [profile, sub, children] = await Promise.all([db.from("users").select("email,character_prompts_enabled").eq("id", user.id).maybeSingle(), db.from("subscriptions").select("plan").eq("parent_id", user.id).maybeSingle(), db.from("students").select("id,name").order("created_at")]);
        if (profile.error || sub.error || children.error) throw new Error("Could not load settings. Please refresh.");
        setEmail(profile.data?.email ?? user.email ?? ""); setThemes(profile.data?.character_prompts_enabled ?? false); setPlan(sub.data?.plan ?? "free"); setStudents(children.data ?? []);
      } catch (e) { setMessage(e instanceof Error ? e.message : "Please refresh."); }
      finally { setLoading(false); }
    }
    load();
  }, []);
  async function save() { try { await updateSettingsFromBrowser({ characterPromptsEnabled: themes }); setMessage("Prompt themes saved."); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not save."); } }
  if (loading) return <p>Loading settings...</p>;
  return <div><h1 className="font-display text-3xl font-semibold">Settings</h1>{message && <p role="status" className="mt-3 text-sm">{message}</p>}<section className="mt-6 border-y border-sprout-100 py-5"><h2 className="font-display text-xl font-semibold">Account</h2><p className="mt-2 text-sm">{email}</p><p className="mt-2 text-sm text-ink/65">Base access: {getPlan(plan).label}. Existing access remains unchanged. A pilot purchase adds 28 days for the selected student only.</p></section><PilotDashboard students={students} /><section className="py-5"><h2 className="font-display text-xl font-semibold">Prompt themes</h2><label className="mt-4 flex items-center gap-3"><input type="checkbox" className="h-5 w-5 accent-sprout-500" checked={themes} onChange={(event) => setThemes(event.target.checked)} />Include character-building prompts</label><p className="mt-2 text-sm text-ink/65">Optional prompts about kindness, courage, responsibility, diligence, honesty, and perseverance.</p><button type="button" className="btn-ghost mt-4" onClick={save}>Save themes</button></section></div>;
}
