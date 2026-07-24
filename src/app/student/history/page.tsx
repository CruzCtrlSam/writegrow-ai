"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CATEGORY_LABELS, type PromptCategory } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

type HistoryRow = {
  id: string;
  status: string;
  created_at: string;
  category: PromptCategory | null;
  word_count: number;
  prompt_snapshot: string | null;
  content: string;
  ai_feedback?: {
    did_well: string;
    improve: string;
    raw: {
      all_issues?: {
        type: string;
        original: string;
        suggestion: string;
        options?: string[];
      }[];
    } | null;
  }[];
};

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="card p-6 text-ink/60">Loading history...</div>}>
      <HistoryPageInner />
    </Suspense>
  );
}

function HistoryPageInner() {
  const studentId = useSearchParams().get("studentId");
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!studentId) return setLoading(false);
      const supabase = createClient();
      const { data } = await supabase
        .from("writing_submissions")
        .select("*, ai_feedback(did_well, improve, encouragement, raw, created_at)")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      setRows((data as HistoryRow[] | null) ?? []);
      setLoading(false);
    }
    load();
  }, [studentId]);

  if (loading) return <div className="card p-6 text-ink/60">Loading history...</div>;

  return (
    <div>
      <p className="eyebrow">Writing History</p>
      <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">Writing history</h1>
      <p className="mt-1 text-ink/60">Every draft and submission, with the coach's notes attached.</p>

      {rows.length === 0 ? (
        <div className="card mt-6 p-10 text-center text-ink/55">
          No writing yet. Head to <span className="font-semibold">Write Today</span> to start.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((s) => {
            const fb = Array.isArray(s.ai_feedback) ? s.ai_feedback[0] : null;
            return (
              <div key={s.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-3">
                  {s.category && (
                    <span className="rounded-full bg-sprout-100 px-2.5 py-0.5 text-xs font-semibold text-sprout-700">
                      {CATEGORY_LABELS[s.category]}
                    </span>
                  )}
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    s.status === "submitted" ? "bg-honey-100 text-honey-500" : "bg-black/5 text-ink/60"
                  }`}>
                    {s.status}
                  </span>
                  <span className="text-xs text-ink/50">
                    {new Date(s.created_at).toLocaleString()} · {s.word_count} words
                  </span>
                </div>

                {s.prompt_snapshot && <p className="mt-2 text-sm font-medium text-ink/70">{s.prompt_snapshot}</p>}
                <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm text-ink/80">
                  {s.content || "(empty)"}
                </p>

                {fb && (
                  <div className="mt-3 rounded-xl bg-sprout-50/70 p-3 text-sm">
                    <p className="text-ink/80">
                      <span className="font-semibold text-sprout-700">Did well: </span>
                      {fb.did_well}
                    </p>
                    <p className="mt-1 text-ink/80">
                      <span className="font-semibold text-sprout-700">To grow: </span>
                      {fb.improve}
                    </p>
                    {Array.isArray(fb.raw?.all_issues) && fb.raw.all_issues.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-clay">
                          {fb.raw.all_issues.length} growth spot{fb.raw.all_issues.length === 1 ? "" : "s"}:
                        </p>
                        <ul className="mt-1 space-y-1">
                          {fb.raw.all_issues.slice(0, 6).map((ex, i) => (
                            <li key={i} className="text-xs text-ink/70">
                              <span className="text-ink/40">[{ex.type}] </span>
                              <span className="break-words text-clay line-through decoration-clay/40">{ex.original}</span>{" "}
                              → <span className="break-words font-semibold text-sprout-700">
                                {ex.options?.length ? ex.options.join(" or ") : ex.suggestion}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
