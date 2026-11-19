# Cross-Country Escape: Writegrow integration package

An illustrated escape-room learning game (grades 3-8, Texas TEKS-aligned) with 12 games: 8 Social Studies/Geography games, the Monthly Hunt, Math, Science, Language Arts and Bible. This is the same tested build that was published as a Claude artifact, with the Claude-only parts removed. Gameplay, content, art and styling are unchanged.

## At a glance

| | |
|---|---|
| **Framework** | None. Plain static HTML + CSS + vanilla JavaScript (no React/Vue/bundler/TypeScript). |
| **Node version** | Not needed to run or host the game. Node **18 or newer** is only needed for the optional local preview server (`serve.js`). Tested with Node 22. |
| **Build step** | None. `index.html` is the finished, ready-to-serve source. |
| **Starting file** | `index.html` (CSS and JS are inline in this one file; `fonts/fonts.css` is linked). |
| **Environment variables** | None. |
| **Backend / database / API keys** | None. Everything runs in the browser. |
| **Size** | About 54 MB, 192 files (mostly 180 illustrations in `art/`). |

## Install and build

```bash
# Hosting: no install and no build. Copy this whole folder to your site:
#   /games/cross-country-escape/   (index.html, art/, fonts/ side by side)

# Optional local preview (no npm install needed, serve.js has zero dependencies):
npm start
# or: node serve.js 8080 /games/cross-country-escape/
# then open http://localhost:8080/games/cross-country-escape/
```

`serve.js` serves the folder under the sub-path `/games/cross-country-escape/` and returns 404 for anything outside it, so it will expose any accidental absolute path. Any static host (Nginx, Apache, S3/CloudFront, Netlify, Vercel static, GitHub Pages) works the same way.

## npm dependencies

None. `package.json` lists no dependencies or devDependencies; it only provides the `npm start` shortcut.

## Files

```
cross-country-escape/
  index.html        the game (inline CSS + JS, about 600 KB, not minified)
  fonts/            self-hosted web fonts + fonts.css (+ SIL OFL licenses)
  art/              all illustrations (PNG and JPG)
    landforms/ (5)  poses/ (36)  postcards/ (5)  reactions/ (28)
    routes/ (7)     scenes/ (61) stamps/ (25)    ui/ (12, includes logo.png and certificates)
  serve.js          optional zero-dependency local preview server
  package.json      "npm start" script only
  README.md
```

Fonts (self-hosted, no Google Fonts requests): **Alfa Slab One** (400) and **Atkinson Hyperlegible** (400, 400 italic, 700), latin and latin-ext subsets as `.woff2`, from the `@fontsource` packages. Both are SIL Open Font License 1.1; license files are in `fonts/`.

Audio: there are **no audio files**. Sound effects are synthesized in the browser with the Web Audio API (oscillators) and respect the in-game mute toggle.

Data: there are **no data files**. All questions, stories and maps are inside `index.html`. Image paths are relative (`art/...`, `fonts/...`).

## External URLs and services

None at runtime. The only `http://` string in the code is the SVG namespace (`http://www.w3.org/2000/svg`), which is an identifier, not a network request. No analytics, no CDNs, no fetch/XHR calls, no cookies. (The original Google Fonts link was replaced with the local `fonts/fonts.css`.)

Browser storage used (localStorage only, wrapped in try/catch so the game still works if storage is blocked):
- `cce_grade`: the grade the child picked on the home screen
- `cce_progress`: the parent progress list (last 80 completed games)

These are per browser and per origin (the domain), so progress is shared with any other page on the same Writegrow domain that reads the same keys, and it does not follow a child to another device.

## Hosting under a sub-path

All asset URLs are **relative** to `index.html`, so the folder can live at any path, for example `/games/cross-country-escape/`. Two things to know:
1. Use the **trailing slash** (`/games/cross-country-escape/`) or link to `.../index.html`. Without the slash, a server that does not redirect will resolve `art/` against `/games/` and images will fail. Nginx, Apache, Netlify and Vercel redirect automatically; if your host does not, add a redirect.
2. Serve `.woff2` as `font/woff2` and `.png/.jpg` with normal image types (default on all common hosts).

## Putting it in a Writegrow page

**Recommended: iframe** (the game's CSS styles `html`, `body`, headings and buttons globally, so inlining it into another page's markup would clash with your site styles):

```html
<iframe src="/games/cross-country-escape/"
        title="Cross-Country Escape"
        style="width:100%;max-width:480px;height:90vh;min-height:640px;border:0"
        loading="lazy"></iframe>
```

The layout is a single column designed for phones (about 390 px wide) and scales up. A simple link or button to `/games/cross-country-escape/` also works if you prefer it to open as its own page.

If you set a Content-Security-Policy, the game needs: `default-src 'self'`; `img-src 'self' data:` (it uses small inline `data:` SVG images as a fallback when art is missing); `style-src 'self' 'unsafe-inline'`; `script-src 'self' 'unsafe-inline'` (CSS and JS are inline); `font-src 'self'`. If you host it on a different origin than the page that embeds it, your server must not send `X-Frame-Options: DENY/SAMEORIGIN` or a `frame-ancestors` rule that blocks the embedding page.

## What changed from the Claude artifact version

Only two edits, nothing else:
1. Replaced the three Google Fonts `<link>` tags with `<link rel="stylesheet" href="fonts/fonts.css">` and bundled the fonts.
2. Removed the Claude hot-reload hook (`window.claude.hot`) at the end of the script; the game now simply starts with `start({})`, which is exactly what it did outside Claude before.

Two small debugging hooks from testing remain and are harmless: `window.__game` and `window.__qcur` (read-only references to the question data and state). They are not used by the game UI and can be deleted if you want a clean global scope.

## Testing done on this package

- Served from `/games/cross-country-escape/` (and `/` returns 404, so no absolute paths are in use).
- Real Chrome (390x844) playthroughs from the home screen to the win screen: Monthly Hunt (grades 3 and 8), Map Skills, Texas, Early America, World Cultures, Texas History, U.S. History, and Math, Science, Language Arts and Bible (grades 3 and 8). 17 runs in total with **144 requests, 0 external, 0 failed (4xx/5xx) and 0 JavaScript errors**. The U.S. States game (grade 5) uses a custom state-map runner that the browser driver could not click through, so there the browser run only covered the home screen, intro and first stop.
- All 12 games, Easy and Challenge, were also played end to end in an automated DOM test (including U.S. States) with no errors, and all 142 distinct images those runs displayed exist in `art/`.

## Known limits (unchanged from the tested build)

- Question content was written for this project and is not verified line by line against TEKS or any publisher's materials; have a teacher or parent review it.
- Progress is stored per device in the browser; there are no accounts.
- Science, Language Arts and Bible use fixed question pools; Easy and Challenge are the same for those three.
