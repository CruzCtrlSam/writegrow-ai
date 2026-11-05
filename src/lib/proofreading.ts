export const PROOFREADING_MARKS = [
  { kind: "insert", label: "Add in" },
  { kind: "delete", label: "Take out" },
  { kind: "replace", label: "Replace" },
  { kind: "capitalize", label: "Capital" },
  { kind: "lowercase", label: "Lowercase" },
] as const;
export type ProofreadingKind = typeof PROOFREADING_MARKS[number]["kind"];
export interface ProofreadingEdit { fixId: string; kind: ProofreadingKind; before: string; after: string }
export function isProofreadingKind(value: unknown): value is ProofreadingKind {
  return PROOFREADING_MARKS.some((mark) => mark.kind === value);
}
export function applyProofreadingMark(text: string, kind: ProofreadingKind, start: number, end: number, addition = "") {
  const from = Math.max(0, Math.min(text.length, start));
  const to = Math.max(from, Math.min(text.length, end));
  const selected = text.slice(from, to);
  const replacement = kind === "insert" ? addition : kind === "delete" ? "" : kind === "replace" ? addition : kind === "capitalize" ? selected.toUpperCase() : selected.toLowerCase();
  return text.slice(0, from) + replacement + text.slice(kind === "insert" ? from : to);
}
