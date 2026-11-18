import Link from "next/link";
import { Logo, SproutMark } from "@/components/Logo";

const steps = [
  ["Learn a skill", "Short grammar lessons grow from a sentence to a paragraph or short story. Students practice with proofreading marks."],
  ["Plan a piece", "An Idea Web, Story Planner, or Opinion Builder gives their own ideas a place to grow."],
  ["Write a draft", "Grade-level prompts and a quiet writing space help them turn their plan into a piece of writing."],
  ["Get in-app coaching", "The coach offers strengths, clues, and questions. Students revise their own work while parents follow their progress."],
];
export default function HomePage() {
  return <main className="bg-grain min-h-screen">
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-5"><Logo /><nav className="flex gap-2"><Link href="/login" className="btn-ghost">Log in</Link><Link href="/signup" className="btn-primary">Start free</Link></nav></header>
    <section className="mx-auto max-w-6xl px-5 pb-12 pt-10 sm:pt-14">
      <p className="eyebrow">Homeschool writing practice · Grades 3–8</p>
      <h1 className="mt-3 font-display text-5xl font-semibold text-ink sm:text-6xl">WriteGrow AI</h1>
      <p className="mt-5 max-w-2xl text-xl leading-relaxed text-ink/75">Learn a skill. Plan a piece. Write a draft. Grow with a coach inside the app.</p>
      <p className="mt-3 max-w-2xl text-ink/65">A self-paced writing space for homeschool families. Your child does the thinking and writing; WriteGrow offers practice, questions, and feedback.</p>
      <div className="mt-6 flex flex-wrap gap-3"><Link href="/signup" className="btn-primary">Create a parent account</Link><a href="#pilot" className="btn-ghost">See the four-week pilot</a></div>
      <p className="mt-3 text-sm text-ink/55">Free option included. No card needed to create an account.</p>
    </section>
    <section className="border-y border-sprout-200 bg-white/65">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map(([title, text], index) => <div key={title}><div className="flex items-center gap-2"><SproutMark className="h-6 w-6" /><span className="text-sm font-semibold text-sprout-700">{index + 1}</span></div><h2 className="mt-3 font-display text-xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-ink/65">{text}</p></div>)}
      </div>
    </section>
    <section id="pilot" className="mx-auto max-w-6xl px-5 py-12">
      <h2 className="font-display text-3xl font-semibold">A small pilot for growing writers</h2>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-sprout-200 bg-white p-6"><h3 className="font-display text-2xl font-semibold">Free</h3><p className="mt-2 text-3xl font-semibold">$0</p><ul className="mt-4 space-y-2 text-sm text-ink/70"><li>One student to get started</li><li>One writing prompt per week</li><li>Drafting and in-app coaching</li><li>First Grammar Studio lesson</li><li>Writing history and parent progress</li></ul><Link href="/signup" className="btn-ghost mt-6">Start free</Link></div>
        <div className="rounded-lg border-2 border-sprout-400 bg-white p-6"><p className="eyebrow">Five total paid spots</p><h3 className="mt-2 font-display text-2xl font-semibold">Four-week homeschool pilot</h3><p className="mt-2 text-3xl font-semibold">$14.99 <span className="text-sm font-normal text-ink/60">per student, once</span></p><p className="mt-2 text-sm font-semibold text-sprout-700">28 days of access. No automatic renewal.</p><ul className="mt-4 space-y-2 text-sm text-ink/70"><li>All grade-matched Grammar Studio lessons</li><li>Idea Web, Story Planner, and Opinion Builder</li><li>Unlimited writing prompts during the pilot</li><li>Drafting, in-app coaching, and revision practice</li><li>Parent progress and saved student work</li></ul><Link href="/signup" className="btn-primary mt-6">Sign up for the pilot</Link><p className="mt-3 text-xs text-ink/55">Create your parent account, add a student, then choose that student's spot. Checkout is currently in test mode; live payments are not open.</p></div>
      </div>
      <p className="mt-5 text-sm text-ink/65">Everything happens in WriteGrow. No scheduling or personal writing reviews are required. When the pilot ends, free access continues and your student's work stays saved. Existing account access is honored.</p>
    </section>
    <footer className="border-t border-black/5 px-5 py-8 text-center text-sm text-ink/55">WriteGrow AI · Strong writers are built through practice.</footer>
  </main>;
}
