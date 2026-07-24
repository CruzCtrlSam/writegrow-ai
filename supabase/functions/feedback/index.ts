import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SKILLS = [
  "complete_sentences",
  "capitalization",
  "punctuation",
  "paragraph_structure",
  "supporting_details",
  "transitions",
  "vocabulary",
  "organization",
  "grammar",
  "writing_stamina",
] as const;

function wordCount(text: string) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function basicCoach(text: string) {
  const words = wordCount(text);
  const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
  const hasTransitions = /\b(first|second|third|next|then|because|also|finally)\b/i.test(text);
  const missingEnd = text.trim().length > 0 && !/[.!?]"?$/.test(text.trim());
  const issues = missingEnd
    ? [{
        category: "end_punctuation",
        type: "End punctuation",
        original: text.trim().slice(-40),
        corrected: `${text.trim()}.`,
        suggestion: `${text.trim()}.`,
        note: "End the sentence with a period.",
      }]
    : [];

  const baseScore = Math.max(35, Math.min(95, 45 + Math.round(words / 2)));
  const skillScores = Object.fromEntries(SKILLS.map((skill) => [skill, baseScore]));
  if (!missingEnd) skillScores.punctuation = Math.max(skillScores.punctuation, 88);
  if (sentences.length >= 3) skillScores.complete_sentences = 90;
  if (hasTransitions) skillScores.transitions = 84;

  const scorecard = [
    { category: "Ideas / Content", score: Math.min(5, Math.max(2, Math.round(words / 35) + 2)), explanation: "Your writing includes a clear idea to build on." },
    { category: "Organization", score: hasTransitions ? 4 : 3, explanation: hasTransitions ? "Your linking words help the writing flow." : "Try adding words like first, next, because, or finally." },
    { category: "Word Choice", score: 4, explanation: "Your words are clear for the reader." },
    { category: "Sentence Fluency", score: sentences.length >= 3 ? 4 : 3, explanation: "Your sentences read like complete thoughts." },
    { category: "Conventions", score: missingEnd ? 3 : 4, explanation: missingEnd ? "One ending mark needs a check." : "Your punctuation looks steady." },
  ];

  return {
    did_well: words >= 40
      ? "You stayed with your idea and gave the reader helpful detail."
      : "You got a clear idea onto the page.",
    improve: missingEnd
      ? "Let's check the ending punctuation."
      : "Next, try adding one more detail that helps the reader picture your idea.",
    guiding_questions: [
      "What is the most important idea you want your reader to remember?",
      "Where could you add one more helpful detail?",
    ],
    grammar_notes: missingEnd ? "One sentence needs an ending mark." : null,
    vocabulary_suggestions: [],
    encouragement: "Nice work getting your thoughts down. A careful reread will make it stronger.",
    examples: issues.map((issue) => ({
      original: issue.original,
      suggestion: issue.suggestion,
      note: issue.note,
    })),
    all_issues: issues,
    scorecard,
    challenge: issues.length
      ? {
          mode: "guided_practice",
          prompt: "Can you make your writing even stronger?",
          totalCorrections: issues.length,
          clues: ["One sentence needs a clearer stopping place."],
          items: [{
            id: "end_punctuation:final",
            category: "end_punctuation",
            label: "End punctuation",
            clue: "One sentence needs a clearer stopping place.",
            strongerClue: "Add the missing ending mark.",
          }],
        }
      : null,
    skill_snapshot: {
      strengths: sentences.length >= 3 ? ["Complete sentences"] : ["Clear idea"],
      growing: missingEnd ? ["End punctuation"] : ["More supporting details"],
    },
    reflection_prompt: "What did you improve as you edited your writing today?",
    progress_note: null,
    skill_scores: skillScores,
    skill_evidence: Object.fromEntries(SKILLS.map((skill) => [skill, "Checked from this submission."])),
    focus_skills: missingEnd ? ["punctuation"] : ["supporting_details"],
    source: "offline",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { submissionId } = await req.json();
    if (!submissionId) throw new Error("Missing submissionId.");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: submission, error } = await supabase
      .from("writing_submissions")
      .select("*, students(*)")
      .eq("id", submissionId)
      .maybeSingle();
    if (error) throw error;
    if (!submission) throw new Error("Submission not found.");

    const student = submission.students;
    if (!student) throw new Error("Student not found.");

    const text = submission.content ?? "";
    if (text.trim().length < 5) throw new Error("Write a little more before asking for coaching.");

    const result = basicCoach(text);

    const { data: fb } = await supabase
      .from("ai_feedback")
      .insert({
        submission_id: submissionId,
        student_id: student.id,
        did_well: result.did_well,
        improve: result.improve,
        guiding_questions: result.guiding_questions,
        grammar_notes: result.grammar_notes,
        vocabulary_suggestions: result.vocabulary_suggestions,
        encouragement: result.encouragement,
        raw: {
          source: result.source,
          examples: result.examples,
          all_issues: result.all_issues,
          skill_evidence: result.skill_evidence,
          focus_skills: result.focus_skills,
          scorecard: result.scorecard,
          challenge: result.challenge,
          skill_snapshot: result.skill_snapshot,
          reflection_prompt: result.reflection_prompt,
          progress_note: result.progress_note,
          aiStatus: "disabled",
          remainingMonthlyChecks: 180,
        },
      })
      .select("id")
      .single();

    await supabase.from("skill_scores").insert(
      SKILLS.map((skill) => ({
        student_id: student.id,
        submission_id: submissionId,
        skill,
        score: result.skill_scores[skill] ?? 70,
      })),
    );

    await supabase.from("writing_scorecards").insert(
      result.scorecard.map((row) => ({
        student_id: student.id,
        submission_id: submissionId,
        feedback_id: fb?.id ?? null,
        category: row.category,
        score: row.score,
        explanation: row.explanation,
      })),
    );

    return new Response(JSON.stringify({
      feedbackId: fb?.id ?? null,
      aiStatus: "disabled",
      remainingMonthlyChecks: 180,
      ...result,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Coaching failed.",
    }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
