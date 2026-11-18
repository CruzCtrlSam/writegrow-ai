import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { offlineCoach } from "./coach.generated.ts";
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Content-Type": "application/json" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) throw new Error("Please sign in.");
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: { user }, error: authError } = await db.auth.getUser(token);
    if (authError || !user) throw new Error("Please sign in again.");
    const { submissionId } = await req.json();
    const { data: submission, error } = await db.from("writing_submissions").select("*,students(*)").eq("id", submissionId).maybeSingle();
    if (error || !submission || submission.students?.parent_id !== user.id) throw new Error("Submission not found.");
    if (submission.content.trim().split(/\s+/).length < 5) throw new Error("Write a little more before asking your coach.");
    if (submission.content.length > 30000) throw new Error("Please keep this practice piece under 30,000 characters.");
    const { data: cached } = await db.from("ai_feedback").select("id,raw").eq("submission_id", submissionId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (cached?.raw?.checked_text === submission.content) return new Response(JSON.stringify({ feedbackId: cached.id, ...cached.raw }), { headers });
    const result = offlineCoach({ grade: submission.students.grade, level: submission.students.level, category: submission.category, prompt: submission.prompt_snapshot ?? "", text: submission.content });
    const raw = { ...result, checked_text: submission.content, aiStatus: "disabled", remainingMonthlyChecks: 0 };
    const { data: feedback, error: feedbackError } = await db.from("ai_feedback").insert({ submission_id: submissionId, student_id: submission.student_id, did_well: result.did_well, improve: result.improve, guiding_questions: result.guiding_questions, grammar_notes: result.grammar_notes, vocabulary_suggestions: result.vocabulary_suggestions, encouragement: result.encouragement, raw }).select("id").single();
    if (feedbackError) throw feedbackError;
    const { error: skillError } = await db.from("skill_scores").insert(Object.entries(result.skill_scores).map(([skill, score]) => ({ student_id: submission.student_id, submission_id: submissionId, skill, score })));
    if (skillError) throw skillError;
    const { error: scoreError } = await db.from("writing_scorecards").insert(result.scorecard.map((score) => ({ ...score, student_id: submission.student_id, submission_id: submissionId, feedback_id: feedback.id })));
    if (scoreError) throw scoreError;
    return new Response(JSON.stringify({ feedbackId: feedback.id, ...raw }), { headers });
  } catch (error) { return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Coaching couldn't finish. Please try again." }), { status: 400, headers }); }
});
