// Regression tests for evidence-based, context-aware feedback.
// Run with:  npm test
// Fails (exit 1) unless every expected error is detected, the coach avoids
// false praise, and the contextual-correction merge behaves correctly.

import { diagnose } from "./diagnostics";
import { coachWriting, validateAndMerge } from "./coaching";
import { challengeItems, evaluateRevision } from "./revision";
import { shouldShowAnswers } from "./revision-ui";

let failures = 0;
function check(label: string, ok: boolean) {
  console.log(`${ok ? "  ✓" : "  ✗ FAIL"}  ${label}`);
  if (!ok) failures++;
}
const hasIn = (d: ReturnType<typeof diagnose>, cat: string, frag: string) =>
  d.issues.some(
    (i) => i.category === cat && i.original.toLowerCase().includes(frag.toLowerCase()),
  );

async function run() {
  // ── 1. The 9 intentional errors in the sample story ──────────────
  const SAMPLE = `Last Saturday I heard a loud knock on my door I opened it and saw my old babysiter from Texas. She was holding a box of cookes and a tiny puppy. I was suprised because she moved away years ago. My sister and I was jumping with joy. The puppy were wagging its tail and it lick my shoe. Then my mom came outside and smiled. We sat in the kitchen and she told us she was back to live nearby. It was the strangist and happiest visit ever`;
  const d = diagnose(SAMPLE);

  console.log("\nSpelling (4 expected):");
  check("babysiter", hasIn(d, "spelling", "babysiter"));
  check("cookes", hasIn(d, "spelling", "cookes"));
  check("suprised", hasIn(d, "spelling", "suprised"));
  check("strangist", hasIn(d, "spelling", "strangist"));

  console.log("\nGrammar (3 expected):");
  check("sister and I was", hasIn(d, "subject_verb", "and i was"));
  check("puppy were", hasIn(d, "subject_verb", "puppy were"));
  check("it lick", hasIn(d, "subject_verb", "it lick"));

  console.log("\nPunctuation (2 expected):");
  check("missing punctuation after 'door'", hasIn(d, "end_punctuation", "door"));
  check(
    "missing end punctuation after 'ever'",
    !/[.!?]"?$/.test(SAMPLE.trim()) && d.byCategory.end_punctuation.length >= 1,
  );

  // ── 2. No false praise; scores reflect errors (offline) ──────────
  console.log("\nCoach output reflects errors:");
  const fb = await coachWriting({
    grade: 4, level: "on_grade", category: "narrative",
    prompt: "The Unexpected Visitor", text: SAMPLE,
  }, { allowAI: false });
  check("grammar_notes does NOT say 'solid'", !/solid/i.test(fb.grammar_notes ?? ""));
  check("grammar score < 60", fb.skill_scores.grammar < 60);
  check("punctuation score < 85", fb.skill_scores.punctuation < 85);
  check("growth note is specific", /spell|verb/i.test(fb.improve));
  check("reports all mistakes (>=9)", fb.all_issues.length >= 9);

  // ── 3. Commonly-confused words (offline rules) ───────────────────
  console.log("\nConfusable words (offline):");
  check("your welcome -> you're", hasIn(diagnose("Thanks, your welcome."), "contraction", "your welcome"));
  check("their is -> there is", hasIn(diagnose("their is a dog outside."), "context_word", "their is"));
  check("to much -> too much", hasIn(diagnose("I have to much homework."), "context_word", "to much"));
  check("bigger then -> bigger than", hasIn(diagnose("My dog is bigger then yours."), "context_word", "bigger then"));
  check("its a -> it's a", hasIn(diagnose("its a sunny day."), "contraction", "its a"));

  // ── 4. Contextual-correction merge (proves the LLM pipeline) ─────
  // Simulate an LLM returning the in-context correction "cookies" for the
  // word the dictionary flagged as "cooked", plus a homophone the dictionary
  // can't catch, plus a hallucinated error that must be dropped.
  console.log("\nContextual merge (simulated LLM):");
  const ctxText = "She gave me a box of cookes. Their going to the park.";
  const ctxDiag = diagnose(ctxText);
  const merged = validateAndMerge(ctxText, ctxDiag, [
    { original: "cookes", suggestion: "cookies", type: "spelling", note: "In this sentence it means cookies." },
    { original: "Their going", suggestion: "They're going", type: "grammar", note: "They're = they are." },
    { original: "dragons", suggestion: "dinosaurs", type: "spelling", note: "hallucinated — not in text" },
  ]);
  const find = (frag: string) =>
    merged.find((i) => i.original.toLowerCase().includes(frag.toLowerCase()));
  check("contextual 'cookes' -> 'cookies' (not 'cooked')", find("cookes")?.suggestion === "cookies");
  check("homophone 'Their going' -> 'They're going' added", !!find("their going"));
  check("hallucinated 'dragons' dropped", !merged.some((i) => i.original.toLowerCase() === "dragons"));

  // Coverage guarantee: if the LLM returns nothing, dictionary words survive.
  const mergedEmpty = validateAndMerge(ctxText, ctxDiag, []);
  check("dictionary word survives empty LLM response", mergedEmpty.some((i) => i.original.toLowerCase() === "cookes"));

  // ── 5. "Did you mean X or Y?" options for spelling ───────────────
  console.log("\nDid-you-mean options:");
  const cookDiag = diagnose("She gave me a box of cookes.");
  const cookIssue = cookDiag.issues.find((i) => i.original.toLowerCase() === "cookes");
  check("cookes offers >=2 options (offline)", (cookIssue?.options?.length ?? 0) >= 2);
  check(
    "offline options are sensible (share 'co' prefix, no junk)",
    !!cookIssue?.options?.every((o) => o.toLowerCase().startsWith("co")),
  );
  check("cookes note is a question", /did you mean/i.test(cookIssue?.note ?? ""));
  // Unambiguous misspellings still resolve to a single clear answer.
  const babyIssue = diagnose("my babysiter came over.").issues.find(
    (i) => i.original.toLowerCase() === "babysiter",
  );
  check("babysiter -> single option 'babysitter'", babyIssue?.options?.length === 1 && babyIssue.options[0].toLowerCase() === "babysitter");

  // CONTEXT (LLM): the contextually-right word is surfaced and ordered first.
  const optMerge = validateAndMerge("a box of cookes", diagnose("a box of cookes"), [
    { original: "cookes", suggestion: "cookies", type: "spelling", note: "context", options: ["cookies", "cooked"] },
  ]);
  const optIssue = optMerge.find((i) => i.original.toLowerCase() === "cookes");
  check(
    "with LLM, options become [cookies, cooked] (context-ordered)",
    optIssue?.options?.[0] === "cookies" && !!optIssue?.options?.includes("cooked"),
  );

  // ── 6. Complete pass on an opinion paragraph ─────────────────────
  console.log("\nOpinion paragraph regression:");
  const OPINION = `I think fall is the best season. First, the weather is cool but not to cold, so you can play outside without getting really hot. Second, the leaves turn red, orange, and yellow, and it looks beutiful everywhere. Third, fall has fun holidays like Halloween and Thanksgiving, where you can dress up, eat good food, and spend time with your family. I also like wearing hoodies because there comfy and cozy. Some people think summer is better, but I dissagree because it gets way to hot and bugs are everywhere. Thats why I think fall is the best season of all.`;
  const opinion = diagnose(OPINION);
  const hasFix = (original: string, suggestion: string) =>
    opinion.issues.some(
      (i) =>
        i.original.toLowerCase() === original.toLowerCase() &&
        i.suggestion.toLowerCase() === suggestion.toLowerCase(),
    );
  check("to cold -> too cold", hasFix("to cold", "too cold"));
  check("beutiful -> beautiful", hasFix("beutiful", "beautiful"));
  check("there comfy -> they're comfy", hasFix("there comfy", "they're comfy"));
  check("dissagree -> disagree", hasFix("dissagree", "disagree"));
  check("to hot -> too hot", hasFix("to hot", "too hot"));
  check("Thats -> That's", hasFix("Thats", "That's"));
  check(
    "does not invent a period before 'I think'",
    !opinion.issues.some(
      (i) =>
        i.category === "end_punctuation" &&
        /I think/i.test(i.original) &&
        /\\. I think/i.test(i.suggestion),
    ),
  );

  // ── 6b. Offline false-positive reduction ───────────────────────
  console.log("\nOffline conservative coach regression:");
  const CONSERVATIVE = `I think science is intresting because we learn how things work. I didnt know plants make food from sunlight. Thats why I like learning about there world.`;
  const conservativeDiag = diagnose(CONSERVATIVE);
  const conservativeCoach = await coachWriting({
    grade: 4,
    level: "on_grade",
    category: "informative",
    prompt: "Write about something you like learning.",
    text: CONSERVATIVE,
  }, { allowAI: false });
  const conservativeHasFix = (category: string, original: string, suggestion: string) =>
    conservativeDiag.issues.some(
      (i) =>
        i.category === category &&
        i.original.toLowerCase() === original.toLowerCase() &&
        i.suggestion.toLowerCase() === suggestion.toLowerCase(),
    );
  check("intresting -> interesting as spelling", conservativeHasFix("spelling", "intresting", "interesting"));
  check("didnt -> didn't as apostrophe", conservativeHasFix("contraction", "didnt", "didn't"));
  check("Thats -> That's as apostrophe", conservativeHasFix("contraction", "Thats", "That's"));
  check("there world -> their world as context word", conservativeHasFix("context_word", "there world", "their world"));
  check("no complete sentence issues", conservativeDiag.byCategory.fragment.length === 0);
  check("no generic end punctuation issues", conservativeDiag.byCategory.end_punctuation.length === 0);
  const categoryCounts = conservativeCoach.challenge?.items.reduce<Record<string, number>>((acc, item) => {
    acc[item.label] = (acc[item.label] ?? 0) + 1;
    return acc;
  }, {}) ?? {};
  check("challenge has Spelling (1)", categoryCounts.Spelling === 1);
  check("challenge has Apostrophe (2)", categoryCounts.Apostrophe === 2);
  check("challenge has Context Word (1)", categoryCounts["Context Word"] === 1);
  check("challenge has no Complete sentence", !categoryCounts["Complete sentence"]);
  check("challenge has no generic Punctuation", !categoryCounts.Punctuation);
  check("growth focus avoids complete sentences", !/complete sentence|complete thought/i.test(conservativeCoach.improve));
  check("sentence fluency stays high", (conservativeCoach.scorecard.find((r) => r.category === "Sentence Fluency")?.score ?? 0) >= 4);

  // ── 7. Informative microwave feedback regression ────────────────
  console.log("\nInformative microwave regression:");
  const MICROWAVE = `A microwave works by using electricity to heat food very quickly. First, you put the food in a microwave-safe container and place it inside. Then, you close the door and choose how many seconds or minutes you want it to cook. When you press start, the microwave sends invisible waves into the food. These waves make the water molecules move around really fast, which creates heat. The heat spreads through the food, but sometimes it dont heat everything evenly. That is why you should stir the food in the middle of cooking. You also have to be carefull because the container can become very hot. Microwaves are usefull because they save time and are easy to use, but you should never put metal inside because it could cause sparks.`;
  const microwaveDiag = diagnose(MICROWAVE);
  const microwaveHasFix = (original: string, suggestion: string) =>
    microwaveDiag.issues.some(
      (i) =>
        i.original.toLowerCase() === original.toLowerCase() &&
        i.suggestion.toLowerCase() === suggestion.toLowerCase(),
    );
  check("dont -> don't", microwaveHasFix("dont", "don't"));
  check("carefull -> careful", microwaveHasFix("carefull", "careful"));
  check("usefull -> useful", microwaveHasFix("usefull", "useful"));
  check(
    "does not suggest carefully",
    !microwaveDiag.issues.some((i) => i.original.toLowerCase() === "carefull" && /carefully/i.test(i.options?.join(" ") ?? i.suggestion)),
  );
  check(
    "does not suggest usefully",
    !microwaveDiag.issues.some((i) => i.original.toLowerCase() === "usefull" && /usefully/i.test(i.options?.join(" ") ?? i.suggestion)),
  );
  const microwaveCoach = await coachWriting({
    grade: 5,
    level: "on_grade",
    category: "informative",
    prompt: "Explain how a microwave works.",
    text: MICROWAVE,
  }, { allowAI: false });
  check("praise names clear step-by-step explanation", /explain|process|clear order|details/i.test(microwaveCoach.did_well));
  check("does not use narrative praise", !/story|beginning, middle, and end/i.test(microwaveCoach.did_well));
  check("main growth area is spelling/contractions", /spelling|apostrophes|contractions/i.test(microwaveCoach.improve));
  check("no advice about replacing very", !microwaveCoach.vocabulary_suggestions.some((v) => /replace|swap|try.+very/i.test(v)));
  check("suggests actual phrase really fast", microwaveCoach.vocabulary_suggestions.some((v) => /really fast/i.test(v)));
  check("scorecard has 5 rubric rows", microwaveCoach.scorecard.length === 5);
  check("conventions score is affected by errors", (microwaveCoach.scorecard.find((r) => r.category === "Conventions")?.score ?? 5) < 5);
  check("ideas score stays strong despite spelling", (microwaveCoach.scorecard.find((r) => r.category === "Ideas / Content")?.score ?? 0) >= 4);
  check("challenge is created", microwaveCoach.challenge?.totalCorrections === microwaveCoach.all_issues.length);
  check("challenge prompt does not reveal count", !/\b\d+\b/.test(microwaveCoach.challenge?.prompt ?? ""));
  check("scorecard language is teacher-like", /ideas|careful|editing|clear|punctuation|spelling/i.test(microwaveCoach.scorecard.find((r) => r.category === "Conventions")?.explanation ?? ""));
  check("skill snapshot has demonstrated strengths", microwaveCoach.skill_snapshot.strengths.length > 0);
  check("reflection prompt is present", microwaveCoach.reflection_prompt.length > 10);

  // ── 8. Guided editing teacher-behavior regression ───────────────
  console.log("\nGuided editing regression:");
  const FORWARD = "I walked foward because its a good path.";
  const forwardDiag = diagnose(FORWARD);
  const forwardIssue = forwardDiag.issues.find((i) => i.original.toLowerCase() === "foward");
  check("foward -> forward", forwardIssue?.suggestion === "forward");
  check("coward is never suggested", !forwardIssue?.options?.some((o) => o.toLowerCase() === "coward"));
  check("foward has one likely correction", forwardIssue?.options?.length === 1);

  const forwardCoach = await coachWriting({
    grade: 4,
    level: "on_grade",
    category: "opinion",
    prompt: "Write about a choice.",
    text: FORWARD,
  }, { allowAI: false });
  const forwardClues = challengeItems(forwardCoach.all_issues);
  check("clues are generated from actual mistakes", forwardClues.some((c) => /moving ahead|apostrophe/i.test(c.clue)));
  check("clues do not quote foward", !forwardClues.some((c) => /foward/i.test(c.clue)));
  check("praise is personalized", /opinion|idea|support/i.test(forwardCoach.did_well));
  check("no duplicate grammar card for main growth", forwardCoach.grammar_notes === null || !/foward|forward/i.test(forwardCoach.grammar_notes));

  const expected = forwardCoach.all_issues;
  const firstTry = evaluateRevision("I walked forward because its a good path.", expected, 1);
  check("progress updates after one fixed mistake", firstTry.progress.some((p) => p.label === "Spelling" && p.fixed));
  check("apostrophe still remaining as clue", firstTry.remaining.some((r) => /apostrophe/i.test(r.clue)));
  check("celebrates partial improvement", /improvement|thinking|edit|easier|found/i.test(firstTry.celebration));
  check("attempt feedback reveals count only after trying", /\d+ of \d+|all \d+/i.test(firstTry.celebration));
  const secondTry = evaluateRevision("I walked forward because it's a good path.", expected, 2);
  check("progress complete after all fixes", secondTry.progress.every((p) => p.fixed));
  check("celebrates complete improvement", /Excellent|Fantastic|strong writers|found all/i.test(secondTry.celebration));
  check(
    "answers remain hidden before attempt in Clues",
    !shouldShowAnswers({ teacherMode: false, reviewMode: "guided", attempted: false }),
  );
  check(
    "answers show after attempt",
    shouldShowAnswers({ teacherMode: false, reviewMode: "guided", attempted: true }),
  );
  check(
    "answers show in Teacher Mode",
    shouldShowAnswers({ teacherMode: true, reviewMode: "guided", attempted: false }),
  );

  console.log(`\nDetected ${d.issues.length} issues in the sample (need >= 9).`);
  if (failures > 0) {
    console.error(`\n❌ ${failures} check(s) failed.`);
    process.exit(1);
  } else {
    console.log("\n✅ All checks passed.");
  }
}

run();
