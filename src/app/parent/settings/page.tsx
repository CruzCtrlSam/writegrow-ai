"use client";

import { useEffect, useState } from "react";
import {
  AI_ADDON_PRICE,
  AI_MONTHLY_CHECKS_PER_STUDENT,
  PLANS,
  getPlan,
  promptsPerWeekFor,
} from "@/lib/plans";
import { currentCalendarMonthRange } from "@/lib/usage";
import { createClient } from "@/lib/supabase/client";
import { updateSettingsFromBrowser } from "@/lib/static-app";
import type { Student } from "@/lib/types";

interface UsageRow {
  student: Student;
  aiCount: number;
  promptCount: number;
}

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [characterPrompts, setCharacterPrompts] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [plan, setPlan] = useState("free");
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: profile }, { data: sub }, { data: students }] = await Promise.all([
      supabase.from("users").select("character_prompts_enabled, email").eq("id", user.id).maybeSingle(),
      supabase.from("subscriptions").select("plan, ai_enabled").eq("parent_id", user.id).maybeSingle(),
      supabase.from("students").select("*").order("created_at", { ascending: true }),
    ]);

    const now = new Date();
    const month = currentCalendarMonthRange(now);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const rows = await Promise.all(
      ((students ?? []) as Student[]).map(async (student) => {
        const [{ count: aiCount }, { count: promptCount }] = await Promise.all([
          supabase
            .from("ai_feedback")
            .select("id", { count: "exact", head: true })
            .eq("student_id", student.id)
            .gte("created_at", month.start.toISOString())
            .lt("created_at", month.end.toISOString()),
          supabase
            .from("writing_submissions")
            .select("id", { count: "exact", head: true })
            .eq("student_id", student.id)
            .not("prompt_snapshot", "is", null)
            .gte("created_at", weekAgo.toISOString()),
        ]);
        return { student, aiCount: aiCount ?? 0, promptCount: promptCount ?? 0 };
      }),
    );

    setEmail(profile?.email ?? user.email ?? "");
    setCharacterPrompts(profile?.character_prompts_enabled ?? false);
    setAiEnabled(sub?.ai_enabled === true);
    setPlan(sub?.plan ?? "free");
    setUsage(rows);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function savePromptThemes() {
    setMessage(null);
    await updateSettingsFromBrowser({ characterPromptsEnabled: characterPrompts });
    setMessage("Saved prompt theme settings.");
  }

  async function saveAIAddOn() {
    setMessage(null);
    await updateSettingsFromBrowser({ aiEnabled });
    setMessage("Saved AI add-on setting.");
    await load();
  }

  if (loading) return <div className="card p-6 text-ink/60">Loading settings...</div>;

  const currentPlan = getPlan(plan);
  const weeklyPromptLimit = promptsPerWeekFor(plan);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="eyebrow">Settings</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Settings</h1>
      </div>

      {message && <p className="rounded-lg bg-sprout-50 px-3 py-2 text-sm text-sprout-700">{message}</p>}

      <div className="card p-6">
        <h2 className="font-display text-xl font-semibold">Prompt themes</h2>
        <p className="mt-1 text-sm text-ink/60">
          Optional character-building prompts can mix in kindness, courage, responsibility,
          diligence, honesty, and perseverance.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input
            id="enabled"
            type="checkbox"
            checked={characterPrompts}
            onChange={(e) => setCharacterPrompts(e.target.checked)}
            className="h-5 w-5 accent-sprout-500"
          />
          <label htmlFor="enabled" className="text-sm font-medium">
            Include character-building prompts
          </label>
          <button type="button" onClick={savePromptThemes} className="btn-ghost sm:ml-auto">
            Save
          </button>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl font-semibold">Subscription</h2>
        <p className="mt-1 text-sm text-ink/60">
          You're on the <span className="font-semibold">{currentPlan.label}</span> plan.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((row) => (
            <div
              key={row.id}
              className={`rounded-xl border p-4 ${
                row.id === currentPlan.id ? "border-sprout-300 bg-sprout-50/60" : "border-black/10"
              }`}
            >
              <p className="font-semibold">{row.label}</p>
              <p className="text-xs text-ink/55">${row.priceMonthly}/mo</p>
              <p className="mt-1 text-xs text-ink/55">
                {row.maxStudents} student{row.maxStudents === 1 ? "" : "s"}
              </p>
              <p className="text-xs text-ink/55">
                {row.promptsPerWeek === null
                  ? "Unlimited prompts"
                  : `${row.promptsPerWeek} prompt${row.promptsPerWeek === 1 ? "" : "s"} / week`}
              </p>
              {row.aiAddOnAvailable && (
                <p className="mt-1 text-xs font-medium text-sprout-700">
                  + AI Coach add-on (+${AI_ADDON_PRICE}/mo)
                </p>
              )}
            </div>
          ))}
        </div>

        {currentPlan.aiAddOnAvailable ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-sprout-200 bg-sprout-50/50 p-4">
            <input
              id="ai_enabled"
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => setAiEnabled(e.target.checked)}
              className="h-5 w-5 accent-sprout-500"
            />
            <label htmlFor="ai_enabled" className="text-sm font-medium">
              Enable AI Coach add-on
            </label>
            <span className="text-xs text-ink/55">
              GitHub Pages uses the offline coach unless an Edge Function is deployed.
            </span>
            <button type="button" onClick={saveAIAddOn} className="btn-ghost sm:ml-auto">
              Save
            </button>
          </div>
        ) : (
          <p className="mt-4 rounded-xl bg-honey-100 p-3 text-sm text-ink/70">
            The AI Coach add-on is available on Pro and Family. The free offline coach still works on every plan.
          </p>
        )}
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl font-semibold">Student usage</h2>
        <p className="mt-1 text-sm text-ink/60">
          AI checks reset each calendar month. Prompt counts use the last 7 days.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {usage.length === 0 ? (
            <p className="text-sm text-ink/55">No students yet.</p>
          ) : (
            usage.map(({ student, aiCount, promptCount }) => (
              <div key={student.id} className="rounded-xl border border-black/10 p-4">
                <p className="font-semibold">{student.name}</p>
                <p className="mt-1 text-sm text-ink/65">
                  {aiCount} / {AI_MONTHLY_CHECKS_PER_STUDENT} AI checks
                </p>
                <p className="text-sm text-ink/65">
                  {weeklyPromptLimit === null
                    ? `${promptCount} prompts this week`
                    : `${promptCount} / ${weeklyPromptLimit} prompts this week`}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="card p-6">
        <h2 className="font-display text-xl font-semibold">Account</h2>
        <p className="mt-1 text-sm text-ink/60">{email}</p>
      </div>
    </div>
  );
}
