// Signature element: a skill shown as a sprout that grows with the score.
// 0 = a seed in soil; 100 = a full leafy plant. Quiet and disciplined,
// it does the one memorable thing in the product's visual language.

export function SkillSprout({
  score,
  size = 84,
}: {
  score: number;
  size?: number;
}) {
  const s = Math.max(0, Math.min(100, score));
  // Growth stages drive how much of the plant is drawn.
  const stemTop = 78 - (s / 100) * 46; // higher score -> taller stem
  const leafScale = 0.4 + (s / 100) * 0.8;
  const showLeaves = s > 12;
  const showTopLeaf = s > 55;
  const showFlower = s > 88;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`Skill growth ${s} out of 100`}
    >
      {/* soil mound */}
      <path d="M14 84 Q50 74 86 84 L86 92 Q50 86 14 92 Z" fill="#C2654A" opacity="0.25" />
      <ellipse cx="50" cy="84" rx="30" ry="6" fill="#7a4a38" opacity="0.18" />

      {/* seed (always) */}
      <circle cx="50" cy="82" r="3.2" fill="#E5AC2E" />

      {/* stem */}
      {s > 6 && (
        <path
          d={`M50 82 C 48 ${82 - (82 - stemTop) * 0.5}, 52 ${
            82 - (82 - stemTop) * 0.5
          }, 50 ${stemTop}`}
          stroke="#256A37"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* lower leaves */}
      {showLeaves && (
        <g transform={`translate(50 ${stemTop + 18}) scale(${leafScale})`}>
          <path d="M0 0 C -22 -2 -30 -14 -28 -26 C -10 -22 -2 -12 0 0 Z" fill="#53A45F" />
          <path d="M0 0 C 22 -2 30 -14 28 -26 C 10 -22 2 -12 0 0 Z" fill="#318545" />
        </g>
      )}

      {/* top leaf pair */}
      {showTopLeaf && (
        <g transform={`translate(50 ${stemTop}) scale(${leafScale * 0.8})`}>
          <path d="M0 0 C -16 -4 -20 -16 -16 -26 C -4 -18 0 -10 0 0 Z" fill="#7FBF86" />
          <path d="M0 0 C 16 -4 20 -16 16 -26 C 4 -18 0 -10 0 0 Z" fill="#53A45F" />
        </g>
      )}

      {/* flower at mastery */}
      {showFlower && (
        <g transform={`translate(50 ${stemTop - 6})`}>
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cx="0"
              cy="-7"
              rx="3.4"
              ry="6"
              fill="#EFC560"
              transform={`rotate(${deg})`}
            />
          ))}
          <circle r="3.4" fill="#C98A12" />
        </g>
      )}
    </svg>
  );
}
