export const CCE_CHANNEL = "writegrow:cce:v1";
export const CCE_GAMES = ["us", "maps", "tx", "h5", "w6", "t7", "h8", "hunt", "math", "science", "lang", "bible"];
export interface CceRun { g: string; l: "easy" | "challenge"; n: string; d: number; s: [string, number, number][] }
export interface CceState { grade: number; progress: CceRun[] }
export function validCceState(value: unknown): value is CceState {
  if (!value || typeof value !== "object") return false;
  const v = value as CceState;
  return Number.isInteger(v.grade) && v.grade >= 3 && v.grade <= 8 && Array.isArray(v.progress) && v.progress.length <= 80
    && v.progress.every((r) => r && CCE_GAMES.includes(r.g) && ["easy", "challenge"].includes(r.l) && typeof r.n === "string" && r.n.length <= 100 && Number.isFinite(r.d) && r.d > 0
      && Array.isArray(r.s) && r.s.length === 5 && r.s.every((s) => Array.isArray(s) && s.length === 3 && typeof s[0] === "string" && s[0].length <= 200 && s.slice(1).every((n) => Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 10000)));
}
export function cceCacheKey(studentId: string) { return `writegrow:cce:${studentId}`; }
export function validCceMessage(event: { origin: string; source: unknown; data: unknown }, origin: string, source: unknown, token: string) {
  const msg = event.data as { channel?: string; token?: string } | null;
  return Boolean(source && event.source === source && event.origin === origin && msg?.channel === CCE_CHANNEL && msg.token === token);
}
