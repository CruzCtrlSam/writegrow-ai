"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LEVEL_LABELS, type WritingLevel } from "@/lib/types";
import { addStudentFromBrowser } from "@/lib/static-app";

export default function NewStudentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [grade, setGrade] = useState(4);
  const [level, setLevel] = useState<WritingLevel>("on_grade");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await addStudentFromBrowser({ name, grade, level });
      router.push("/parent/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't save that student. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/parent/dashboard" className="text-sm text-ink/60 hover:text-ink">
        ← Back to dashboard
      </Link>
      <div className="card mt-4 p-5 sm:p-7">
        <p className="eyebrow">New student</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">Add a student</h1>
        <p className="mt-1 text-sm text-ink/60">
          Each student gets prompts and coaching matched to their grade and level.
        </p>

        {error && (
          <p className="mt-4 rounded-lg bg-clay/10 px-3 py-2 text-sm text-clay">
            {error}
          </p>
        )}

        <form onSubmit={submit} className="mt-6 space-y-5">
          <div>
            <label className="label" htmlFor="name">Student's name</label>
            <input
              id="name"
              className="field"
              placeholder="Maya"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="grade">Grade level</label>
            <select
              id="grade"
              className="field"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
              required
            >
              {[3, 4, 5, 6, 7, 8].map((g) => (
                <option key={g} value={g}>Grade {g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Writing level</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {(["below_grade", "on_grade", "advanced"] as const).map((lvl) => (
                <label
                  key={lvl}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm has-[:checked]:border-sprout-400 has-[:checked]:bg-sprout-50"
                >
                  <input
                    type="radio"
                    name="level"
                    value={lvl}
                    checked={level === lvl}
                    onChange={() => setLevel(lvl)}
                    className="accent-sprout-500"
                  />
                  {LEVEL_LABELS[lvl]}
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? "Saving..." : "Add student"}
          </button>
        </form>
      </div>
    </div>
  );
}
