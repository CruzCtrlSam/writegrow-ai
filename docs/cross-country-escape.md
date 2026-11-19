# Cross-Country Escape integration

## Structure

Cross-Country Escape is a separate **Adventures** workspace at `/student/escape/?studentId=...`. It is available from student navigation and the student dashboard. It does not contribute to writing scores, writing streaks, lesson completion, paid-pilot capacity, or AI usage. No payment settings were changed.

The uploaded game remains a static HTML game in `public/games/cross-country-escape`, with its original illustrations, fonts, sounds, questions, rules, difficulty options, hints, certificates, and twelve games. An iframe isolates its original CSS from WriteGrow's navigation and typography. All resources are self-hosted and resolve relative to the game, including under GitHub Pages' `/writegrow-ai` prefix. No new runtime package is required.

Only explicit integration hooks were added to the original `index.html`: an account-storage adapter, delayed initialization with the selected student's saved grade, frame scrolling, and links to the bridge and narrow-screen CSS. `npm run test:cce` reverses those hooks in memory and compares the result to the uploaded source's SHA-256. It also verifies all 190 original art/font/license files against the uploaded asset fingerprint.

## Existing Supabase project

Reuses WriteGrow project `pcfujcthbpxnecvellnv`, the current public configuration, parent login, and student ownership. No second project, new service subscription, API key, or secret is needed. Normal existing-project usage limits still apply.

A new, independently named table, `public.cross_country_escape_progress`, stores each student's selected grade and up to 80 completed game reports. Owner-only SELECT/INSERT/UPDATE policies enforce family isolation; anonymous access and reassignment to another family's student are denied. The migration is applied and recorded in the existing project's migration history. The preexisting `learning` schema was not changed.

The iframe receives no Supabase keys or authentication tokens. A source/origin/channel/per-mount-token checked message bridge passes game snapshots to the authenticated parent page. It does not read or overwrite the old global `cce_grade` / `cce_progress` browser keys. Local backups use per-student keys, and failed saves retain a pending marker. The page visibly reports account save failures and offers retry.

Like the uploaded game, completed reports are saved, not unfinished puzzle sessions. Refreshing mid-game returns to the subject menu. Old anonymous/device-wide history is not automatically assigned to a student. The directly hosted standalone game retains its original device-local behavior.

## Checks

- `npm run test:cce`: original game/asset integrity; progress validation; separate student cache keys; origin/source/token rejection; initialization; save events; stale initialization cannot overwrite play.
- `supabase/tests/cross_country_escape.sql`: transactional fixtures, owner save/read, other-family read/write denial, ownership reassignment protection, malformed-data rejection, anonymous denial. All test fixtures roll back.
- Existing `npm test` writing, coaching, planning, grammar, prompt, and achievement regressions.
- `npm run test:pilot` remains passing; payment behavior is unchanged.
- `NEXT_PUBLIC_BASE_PATH=/writegrow-ai npm run build` passed, including type checking and all 15 static routes. The built output was served locally at its actual `/writegrow-ai/` prefix and checked in Chrome, including authenticated account storage, images, and navigation URLs.
- Browser checks: authenticated student navigation, correct starting grade, math puzzle feedback, account save after grade change, restoration after reload, loaded illustrations, and responsive dimensions. Tablet navigation switches to the existing compact horizontal navigation below 1024px.
- Checked 320px, 375px, 768px, and 1024px layouts. After the tablet navigation fix, the production page had no horizontal document overflow at 768px; phone views and the game remained correctly sized. A second student opened at their own grade, without inheriting the first student's selection.

The package's original content/TEKS review caveats remain in its README. These checks preserve the supplied gameplay; they do not certify every curriculum claim. No new end-to-end completion of every game is claimed by this integration.
