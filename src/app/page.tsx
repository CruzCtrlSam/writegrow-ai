import Link from "next/link";
import { Logo, SproutMark } from "@/components/Logo";
import { SkillSprout } from "@/components/SkillSprout";
import { AI_ADDON_PRICE, PLANS } from "@/lib/plans";
import { brandVoice } from "@/services/brandVoice";

export default function HomePage() {
  const promise = brandVoice.getBrandPromise();
  return (
    <main className="bg-grain min-h-screen">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-5">
        <Logo />
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/login" className="btn-ghost">Log in</Link>
          <Link href="/signup" className="btn-primary">Start free</Link>
        </div>
      </header>

      {/* Hero: the thesis is the coach that guides instead of writing for you */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:px-5 md:grid-cols-2 md:pt-16">
        <div className="min-w-0">
          <p className="eyebrow">Writing practice for grades 3–8</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-ink md:text-6xl">
            {promise}
          </h1>
          <p className="mt-5 max-w-md text-lg text-ink/70">
            Daily prompts by grade level. A writing coach that asks good questions
            instead of doing the work. Growth parents can actually see.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              Create a parent account
            </Link>
            <Link href="/login" className="btn-ghost px-6 py-3 text-base">
              I already have one
            </Link>
          </div>
          <p className="mt-4 text-sm text-ink/50">
            Free plan included — 1 prompt per week, no card needed.
          </p>
        </div>

        {/* Signature growth panel */}
        <div className="card overflow-hidden p-5 sm:p-7">
          <p className="eyebrow">{brandVoice.labels.growthJourney}</p>
          <div className="mt-4 grid grid-cols-1 gap-2 text-center min-[420px]:grid-cols-3">
            {[
              { label: "Organization", score: 38 },
              { label: "Vocabulary", score: 64 },
              { label: "Punctuation", score: 92 },
            ].map((s) => (
              <div key={s.label} className="rounded-xl2 bg-sprout-50/60 p-3">
                <SkillSprout score={s.score} size={72} />
                <p className="mt-1 text-xs font-medium text-ink/70">{s.label}</p>
                <p className="text-sm font-semibold text-sprout-700">{s.score}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm text-ink/60">
            Each skill is a seed. The more your child writes, the more confidence grows.
          </p>
        </div>
      </section>

      {/* How the coach behaves — the product's real promise */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-5">
        <div className="card grid gap-6 p-5 sm:p-7 md:grid-cols-3">
          {[
            ["Notices a strength", "Every piece of feedback starts with one real thing your child did well."],
            ["Asks, doesn't answer", "2–3 guiding questions help them revise in their own words."],
            ["Never writes it for them", "The coach gives notes and nudges — it won't hand over an essay to copy."],
          ].map(([title, body]) => (
            <div key={title}>
              <SproutMark className="h-6 w-6" />
              <h3 className="mt-3 font-display text-xl font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-ink/65">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="mx-auto max-w-6xl px-4 pb-24 sm:px-5">
        <h2 className="font-display text-3xl font-semibold tracking-tight">Plans</h2>
        <p className="mt-1 text-ink/60">Start free. Grow when you're ready.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={`card p-6 ${p.id === "pro" ? "ring-2 ring-sprout-300" : ""}`}
            >
              {p.id === "pro" && (
                <span className="mb-2 inline-block rounded-full bg-sprout-100 px-2.5 py-0.5 text-xs font-semibold text-sprout-700">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-2xl font-semibold">{p.label}</h3>
              <p className="mt-1 text-3xl font-bold text-ink">
                ${p.priceMonthly}
                <span className="text-base font-normal text-ink/50">/mo</span>
              </p>
              <div className="mt-3 space-y-1.5 text-sm text-ink/65">
                <p>{p.maxStudents} student{p.maxStudents === 1 ? "" : "s"}</p>
                <p>
                  {p.promptsPerWeek === null
                    ? "Unlimited prompts"
                    : `${p.promptsPerWeek} prompt${p.promptsPerWeek === 1 ? "" : "s"} / week`}
                </p>
                <p>
                  {p.aiAddOnAvailable
                    ? `+ AI Coach add-on (+$${AI_ADDON_PRICE}/mo)`
                    : brandVoice.messages.plans.freeCoachIncluded}
                </p>
              </div>
              <Link
                href="/signup"
                className={`mt-5 w-full ${p.id === "pro" ? "btn-primary" : "btn-ghost"}`}
              >
                {p.id === "free" ? "Start free" : `Choose ${p.label}`}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink/45">
          Billing is a placeholder in this build — Stripe is wired with stubs only.
        </p>
      </section>

      <footer className="border-t border-black/5 py-8 text-center text-sm text-ink/50">
        WriteGrow AI — built to grow young writers.
      </footer>
    </main>
  );
}
