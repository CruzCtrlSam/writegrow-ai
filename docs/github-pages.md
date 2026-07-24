# GitHub Pages Deployment

This app now builds as a static site for GitHub Pages.

## What Runs Where

- GitHub Pages hosts the static frontend from `out/`.
- Supabase still handles Auth, Database, and Row Level Security.
- Coaching runs through a Supabase Edge Function named `feedback`.

The frontend cannot contain:

- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- Supabase secret/service-role keys

## GitHub Secrets

Add these repository secrets before the Pages workflow runs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The workflow sets `NEXT_PUBLIC_BASE_PATH` automatically to `/<repo-name>` for project pages.

## Pages Settings

In GitHub:

1. Open the repository.
2. Go to Settings -> Pages.
3. Set Source to GitHub Actions.
4. Push to `main`.

## Local Static Preview

```bash
npm run build
python3 -m http.server 3000 --directory out
```

Then open:

```text
http://127.0.0.1:3000/login/
```

## Supabase Edge Function

Deploy the feedback function before using Submit & get coaching on GitHub Pages:

```bash
supabase functions deploy feedback
```

The included function is conservative and rule-based. It does not send student writing to OpenAI or any other third party.
