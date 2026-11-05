import assert from "node:assert/strict";
import { applyProofreadingMark, isProofreadingKind } from "./proofreading";
import { GRAMMAR_LESSONS, checkGrammarLesson, emptyGrammarProgress, grammarStorageKey, lessonFixes, lessonsForGrade, restoreGrammarProgress } from "./grammar-lessons";

const ids = new Set<string>();
for (let grade = 3; grade <= 8; grade++) {
  const lessons = lessonsForGrade(grade);
  assert.equal(lessons.length, 4, `Grade ${grade} needs four steps`);
  assert.equal(lessons[0].format, "Sentence");
  assert.ok(["Paragraph", "Short story"].includes(lessons[2].format));
}
for (const lesson of GRAMMAR_LESSONS) {
  assert.ok(!ids.has(lesson.id)); ids.add(lesson.id);
  const fixes = lessonFixes(lesson);
  assert.ok(fixes.length >= 1 && fixes.length <= 4);
  assert.equal(new Set(fixes.map((fix) => fix.id)).size, fixes.length);
  assert.ok(checkGrammarLesson(lesson, {}).every((result) => !result.correct), `${lesson.id}: every marked original must need a fix`);
  const answers = Object.fromEntries(fixes.map((fix) => [fix.id, fix.answers[0]]));
  assert.ok(checkGrammarLesson(lesson, answers).every((result) => result.correct), `${lesson.id}: intended answers pass`);
  for (const fix of fixes) for (const answer of fix.answers) {
    assert.ok(checkGrammarLesson(lesson, { [fix.id]: answer }).find((result) => result.id === fix.id)?.correct);
  }
  assert.ok(fixes.every((fix) => fix.hint && fix.explanation));
}
const first = GRAMMAR_LESSONS[0];
assert.equal(checkGrammarLesson(first, { start: "my" })[0].correct, false, "Capitalization must be checked");
assert.equal(checkGrammarLesson(first, { start: "  My  " })[0].correct, true);
const contractions = lessonsForGrade(3)[2];
assert.ok(checkGrammarLesson(contractions, { could: "couldn\u2019t", it: "It\u2019s" }).every((result) => result.correct));
const splice = lessonsForGrade(6)[1];
for (const join of ["; we", ". We", ", and we", ", so we"]) assert.ok(checkGrammarLesson(splice, { join })[0].correct);
assert.equal(checkGrammarLesson(splice, { join: ", we" })[0].correct, false);
const story = lessonsForGrade(8)[2];
assert.equal(story.format, "Short story");
assert.ok(story.parts.map((part) => typeof part === "string" ? part : part.answers[0]).join("").split(/\s+/).length > 120);
assert.notEqual(grammarStorageKey("student-a"), grammarStorageKey("student-b"));
assert.deepEqual(restoreGrammarProgress("broken", 4), emptyGrammarProgress(4));
const saved = { selected: first.id, drafts: { [first.id]: { start: "My", name: "Eli" } }, completed: [first.id], assisted: [first.id] };
assert.deepEqual(restoreGrammarProgress(JSON.stringify(saved), 3), saved);
assert.equal(restoreGrammarProgress(JSON.stringify(saved), 8).selected, "g8-1");
assert.deepEqual(restoreGrammarProgress(JSON.stringify({ ...saved, completed: ["unknown"] }), 3).completed, []);
assert.deepEqual(restoreGrammarProgress("null", 3), emptyGrammarProgress(3));
console.log("Grammar checks passed: grade progression, all lesson corrections, punctuation alternatives, case, apostrophes, and saved progress.");

assert.equal(applyProofreadingMark("dont", "insert", 3, 3, "'"), "don't");
assert.equal(applyProofreadingMark("can", "delete", 0, 3), "");
assert.equal(applyProofreadingMark("the the", "delete", 3, 7), "the");
assert.equal(applyProofreadingMark("is", "replace", 0, 2, "are"), "are");
assert.equal(applyProofreadingMark("eli", "capitalize", 0, 1), "Eli");
assert.equal(applyProofreadingMark("Bird", "lowercase", 0, 1), "bird");
assert.equal(applyProofreadingMark("cat", "delete", -5, 99), "");
assert.equal(applyProofreadingMark("cat", "replace", 1, 1, ""), "cat");
assert.equal(isProofreadingKind("external-data"), false);
for (let grade = 3; grade <= 8; grade++) {
  const practice = lessonsForGrade(grade)[3];
  assert.ok(lessonFixes(practice).some((fix) => fix.answers.includes("")), `Grade ${grade} needs deletion practice`);
}
const marked = { ...saved, proofreading: { [first.id]: [{ fixId: "start", kind: "capitalize" as const, before: "my", after: "My" }] } };
assert.deepEqual(restoreGrammarProgress(JSON.stringify(marked), 3), marked);
assert.deepEqual(restoreGrammarProgress(JSON.stringify({ ...saved, proofreading: { [first.id]: [{ kind: "unknown" }] } }), 3).proofreading?.[first.id], []);
const removalLesson = lessonsForGrade(3)[3];
assert.ok(checkGrammarLesson(removalLesson, { extra: "", apostrophe: "don't" }).every((result) => result.correct));
console.log("Proofreading checks passed: insertion, deletion, replacement, capitalization, lowercase, safe ranges, and saved marks.");
