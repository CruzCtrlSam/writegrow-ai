# Four-week homeschool pilot

## Current status

Implemented in the current repository and verified against the existing WriteGrow Supabase project (`pcfujcthbpxnecvellnv`). The payment functions and updated in-app feedback function are deployed. Frontend changes must be committed and pushed before GitHub Pages shows this version. Live payments are disabled. Cross-Country Escape and the unrelated `learning` schema were not changed.

Offer: USD $14.99 per selected student, one payment, 28 days from confirmed payment, no subscription and no automatic renewal. Five total paid spots per campaign, not five concurrent students. An expired paid spot is not resold. Existing student access was snapshotted before adding pilot restrictions.

## Payment setup completed

- Stripe: existing OrnKross test sandbox; no live keys configured.
- Supabase secrets: `WRITEGROW_STRIPE_TEST_SECRET_KEY` and `WRITEGROW_STRIPE_TEST_WEBHOOK_SECRET`.
- Test webhook: `WriteGrow paid pilot (test only)`; `checkout.session.completed` and `checkout.session.expired` only.
- Endpoint: `https://pcfujcthbpxnecvellnv.supabase.co/functions/v1/pilot-webhook`.
- Functions: `pilot-checkout`, `pilot-status`, `pilot-webhook`. Checkout/status verify the parent's Supabase login themselves. The webhook verifies Stripe's signature over the raw body.
- Checkout uses an inline one-time price; no Stripe product or price ID is required.
- GitHub Pages needs only the existing public Supabase URL and publishable/anon key. Never place a Stripe secret or Supabase service-role key in browser variables or GitHub Pages output.

## Access and safety

Database row locks serialize reservations across the five spots. A student reuses an existing reservation; Stripe session creation uses an idempotency key. Duplicate payment events cannot restart the 28 days. Grants validate the amount, currency, payment status, mode, campaign, parent, student, order, and Checkout session.

Reservations last 35 minutes. Checkout/status requests reconcile old reservations with Stripe before releasing capacity. A still-payable session never becomes an available spot just because a local timestamp elapsed. Returning from a cancelled checkout expires that session before release. Reconciliation also recovers a Stripe session whose ID was not saved following a network failure. There is no dependency on a browser returning from a completed payment: the signed webhook activates access.

Student access is checked using server time. New prompt creation and planner/lesson workspace writes are enforced in the database, not only hidden by UI. After expiry, the free prompt allowance and first lesson remain available; previous drafts, planner content, lessons, submissions, feedback, and progress remain saved. Existing base-plan access remains unchanged.

Planner and lesson progress now sync to the parent's account with a local backup. Failed saves retain a pending marker so stale cloud data does not overwrite an unsynced local edit.

## Verification performed (2026-11-18)

A fresh parent account using a plus alias of the supplied Gmail address was created and confirmed using the actual Supabase email. The original parent account was not changed.

Verified in Chrome against the real project:

- Signup, confirmation, login, adding a grade-5 student, and free lesson restrictions.
- Stripe test card Checkout at $14.99; automatic access activation and a dated welcome guide.
- All grade-matched lessons unlocked; a completed lesson saved to Supabase.
- Welcome links to the first lesson, Write Today planner, and parent progress.
- A completed story planner, planning feedback, draft submission, in-app coaching, and parent progress.
- Coaching identified actual subject/verb, spelling, and apostrophe mistakes in the test draft; feedback and scorecards saved successfully.
- Temporarily expired only the paid test order, verified free restrictions and retained work, then restored its exact original access dates.
- An unpaid Checkout cancellation safely released its reservation. A deliberately old reservation with an open Stripe session was not released prematurely.
- Filled the remaining capacity with disposable reservation fixtures, verified sold-out checkout was disabled, then removed those fixtures. One paid test spot remains; all five live spots remain untouched.

Automated coverage: `src/lib/pilot.test.ts` (payment/redirect policy), `supabase/tests/pilot.sql` (transaction rolled back: capacity, duplicate events, reservation reuse, exact duration, expiry, service-only grants, workspace permissions), plus the existing application regression suite.

The previous deployed feedback function was a limited placeholder and silently failed to save missing scorecards. It now runs the existing conservative offline coach and persists results. Rebuild its generated module with `npm run build:feedback` after changing coach logic. No OpenAI key is required for this pilot's rule-based coaching.

## Before approving a real launch

Do not enable these steps until the owner explicitly approves launch:

1. Publish the reviewed frontend through the existing GitHub Pages workflow.
2. Configure a verified custom Supabase SMTP sender for dependable signup emails. The default Supabase sender worked for this test, but is not a production email service. Set production Site URL and allowed redirects to `https://cruzctrlsam.github.io/writegrow-ai/` and its signup/login paths as required by the existing Auth flow.
3. Review Stripe's live business details, statement descriptor, receipt settings, and the pilot's refund/privacy terms.
4. Create a separate LIVE webhook with the same two events and URL. Save its signing secret as `WRITEGROW_STRIPE_LIVE_WEBHOOK_SECRET`, and the live API key as `WRITEGROW_STRIPE_LIVE_SECRET_KEY`, in Supabase function secrets only.
5. Set `WRITEGROW_PILOT_MODE=live` and `WRITEGROW_PILOT_LIVE_ENABLED=true`, and enable only the `homeschool-pilot-live` database campaign. All gates are required. Test purchases never consume live capacity. Update the homepage's explicit test-mode notice when launch is approved.
6. Verify the published site's return paths and webhook delivery in the intended mode. Live returns are pinned to the production GitHub Pages URL.

To close checkout, disable the relevant campaign or remove the explicit live-enabled flag. This does not erase paid access or student work. Never use the old client-side base-plan selector as a payment mechanism; browser plan updates are no longer allowed.

## Maintenance notes

The three timestamped migrations in `supabase/migrations` were applied to the existing project, verified with the SQL regression tests, and recorded as applied using the Supabase CLI's migration repair command. Do not reapply them as ad-hoc SQL.

The full existing regression suite, payment-policy tests, SQL regression tests, type checks, and both normal and `/writegrow-ai` static production builds passed. The welcome guide's completed state persisted after reload. Desktop screenshots were checked. The browser's viewport override did not take effect, so mobile emulation remains an additional prelaunch check rather than a claimed result.

The existing dependency audit reports Next.js 14/PostCSS/Tailwind advisories whose automatic fixes include major upgrades. The public deployment is static (no Next.js server, image optimizer, or Server Actions), but a separately tested framework/dependency upgrade is recommended before a broader public launch. No unrelated major upgrade was attempted in this payment change.

Test account passwords and payment keys are not included in this repository or document. Use the supplied inbox's test confirmation/account recovery flow rather than sharing credentials in source control.
