export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <SproutMark className="h-7 w-7" />
      <span className="font-display text-xl font-semibold tracking-tight text-ink">
        WriteGrow<span className="text-sprout-500"> AI</span>
      </span>
    </span>
  );
}

export function SproutMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      {/* stem */}
      <path
        d="M16 30 V16"
        stroke="#256A37"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* left leaf */}
      <path
        d="M16 19 C10 19 6 15 6 10 C12 10 16 13 16 19 Z"
        fill="#53A45F"
      />
      {/* right leaf */}
      <path
        d="M16 16 C22 16 26 12 26 7 C20 7 16 10 16 16 Z"
        fill="#318545"
      />
      {/* seed dot */}
      <circle cx="16" cy="29" r="2" fill="#E5AC2E" />
    </svg>
  );
}
