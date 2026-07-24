export function shouldShowAnswers({
  teacherMode,
  reviewMode,
  attempted,
}: {
  teacherMode: boolean;
  reviewMode: "guided" | "direct";
  attempted: boolean;
}): boolean {
  return teacherMode || reviewMode === "direct" || attempted;
}
