# WriteGrow AI 🌱

Daily writing practice for students in grades 3–8. Grade-appropriate prompts, an
AI coach that **guides instead of doing the work**, skill tracking, and a parent
dashboard.

Stack: **Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase · OpenAI · Stripe (stub)**

---

## 1. Run it locally

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.local.example .env.local
#    → fill in your Supabase URL + anon key (required)
#    → OpenAI key is optional (an offline coach runs without it)

# 3. Start
npm run dev          # http://localhost:3000
```

## 2. Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Same page |
| `SUPABASE_SERVICE_ROLE_KEY` | optional | Server-only trusted ops |
| `OPENAI_API_KEY` | optional | Without it, the built-in offline coach is used |
| `OPENAI_MODEL` | optional | Defaults to `gpt-4o-mini` |
| `STRIPE_*` | placeholder | Billing is stubbed in this build |
| `NEXT_PUBLIC_SITE_URL` | optional | Defaults to `http://localhost:3000` |

## 3. Database setup

In the Supabase dashboard → **SQL Editor**:

1. Run `supabase/schema.sql` — creates all tables, row-level security, and a
   trigger that auto-creates a parent profile + free subscription on signup.
2. (Optional) Run `supabase/seed_prompts.sql` — starter prompt library so the app
   has content even without OpenAI.

**Auth note:** for the fastest local testing, turn off email confirmation in
Supabase → Authentication → Providers → Email ("Confirm email" off). Otherwise
new accounts must confirm via email before logging in.

### Tables

`users` · `students` · `writing_prompts` · `writing_submissions` ·
`ai_feedback` · `skill_scores` · `subscriptions`

## 4. How it fits together

```
Parent signs up ──► adds student (name, grade, level)
        │
        ▼
Student space ──► picks category ──► /api/prompt (OpenAI or fallback)
        │
        ▼
Writing editor ──► /api/submissions (draft / submit, word count)
        │
        ▼
"Submit & get coaching" ──► /api/feedback ──► coachWriting()
        │                         │
        │                         ├─ ai_feedback row
        │                         └─ skill_scores rows (10 skills)
        ▼
History + Progress (skill "sprouts", weekly summary, suggested practice)
```

## 5. AI safety + evidence-based coaching

The coach's behavior lives in `src/lib/coaching.ts`, backed by a diagnostics
engine in `src/lib/diagnostics.ts`. The system prompt:

- **Never** rewrites or completes the student's piece, and never hands over a full
  essay/paragraph to copy.
- Returns only structured feedback: one strength, one area to grow, 2–3 guiding
  questions, gentle grammar notes, vocabulary nudges, and encouragement.
- Adjusts language by grade (3–5 simple, 6–8 more detailed) and by writing level.
- Falls back to a deterministic **offline coach** if no OpenAI key is set.

**Feedback is evidence-based and context-aware.** Detection is deterministic so
a mistake is never missed; correction is context-aware so the fix fits the
sentence.

- **Spelling** is checked against a full English dictionary (`nspell` +
  `dictionary-en`), so *any* misspelling is caught — proper nouns like "Texas"
  are left alone.
- **Grammar/punctuation rules** cover subject–verb agreement (`hands was`→`were`,
  `the puppy were`→`was`), compound subjects (`my sister and I was`→`were`), verb
  form (`it lick`→`it licked`, `suppose to`→`supposed to`), verb tense, run-on
  sentences, capitalization, end punctuation, and the most common confusable
  words (`their/there`, `your/you're`, `to/too`, `then/than`, `its/it's`).
- **Contextual correction (needs `OPENAI_API_KEY`):** the model proofreads the
  text and supplies corrections that fit the sentence — e.g. "a box of cookes" →
  **cookies**, not "cooked" — and catches wrong-word/homophone mistakes a
  spell-checker structurally can't. Every LLM correction is **validated against
  the text** (it must appear verbatim, can't be a rewrite) so it can't
  hallucinate, and every dictionary-detected word is **guaranteed coverage** even
  if the model misses it.
- **Spelling is offered as a choice, not auto-corrected.** Instead of silently
  picking one word, the coach asks **"Did you mean *cookies* or *cooked*?"** so
  the student decides — which keeps them thinking (coach, don't do the work).
  With the API key, the options are ordered by sentence context (best fit first);
  offline, they're the closest real words by spelling. Unambiguous misspellings
  (`babysiter` → `babysitter`) show a single clear answer.
- **All praise and scores are computed deterministically** from the final merged
  error set — the model never reintroduces false praise like "punctuation looks
  solid," and scores always reflect the real errors found.

> Without `OPENAI_API_KEY`, the app runs fully offline: it still detects every
> misspelling and the common confusables, but the auto-suggested word is the
> dictionary's best guess rather than a context-aware choice. Set the key for
> sentence-aware corrections.

### Tests

```bash
npm test
```

Runs `src/lib/diagnostics.test.ts`: the 9-error sample story (must all be
detected, no false praise), the offline confusable rules, and the
contextual-merge logic (proves `cookes`→`cookies` wins over `cooked`, homophones
are added, hallucinated errors are dropped, and dictionary coverage survives an
empty model response).

## 6. What still needs improvement

- **Stripe**: real Checkout + webhook to update `subscriptions` (currently a stub).
- **Plan enforcement**: free-plan weekly prompt cap is not yet enforced server-side.
- **Skill scoring**: blends the model output with simple heuristics — a real rubric
  would be more reliable.
- **Parent "show an example" path**: a parent-gated example-essay flow.
- **Polish**: draft auto-resume, richer weekly summaries, email-verification UX.

---

Built to grow young writers.
