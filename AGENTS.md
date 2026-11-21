# yummlab.site

Landing page for yumm lab. Static site, no build step, EN + TH, served by Cloudflare Workers static assets at https://yummlab.site.

## Commands

`./dev` lists them. Fresh clone: `./dev init`. Before every commit: `./dev check` (CI runs it too and blocks deploy on failure).

## Map

Start every edit with `./dev map`: it prints each file's sections with start lines (~450 tokens, generated from the section comments, always current). Read just that section's line range. Sections are `/* ---------- name ---------- */` in CSS/JS and `<!-- Name -->` in HTML; give new code a section comment in the same format.

- `public/` is the site, served as is. `index.html` markup, `i18n.js` copy, `tokens.css` design tokens (OKLCH), `styles.css`, `theme.js` (light/dark before first paint), `main.js` (lang/theme switches, scroll, reveals, nav), `flask.js` (WebGL particle mascot, no library).
- `public/vendor/` holds pinned third-party builds (GSAP 3.15.0, ScrollTrigger, Lenis 1.3.27); upgrade by replacing the file whole.
- `public/_headers` sets CSP and cache headers. `public/assets/cooks/` holds 96x96 crew avatars.
- `src/worker.js` runs before assets: redirects `www`/`http` to `https://yummlab.site`, forwards member pages to their own Workers.
- `scripts/check.mjs` is what `./dev check` runs.

## Rules

- **Copy**: every visible string is a `data-i18n="key"` (or `data-i18n-aria`) in `index.html` with the same key in both `en` and `th` of `i18n.js`. `main.js` applies it with `textContent`, so copy is plain text.
- **CSP** (`public/_headers`): scripts and styles load from this origin as files; fonts only from Google Fonts. Only outside script: the Cloudflare Web Analytics beacon Cloudflare injects (`static.cloudflareinsights.com`, reports to `cloudflareinsights.com`). Put new JS/CSS in `public/*.js` / `*.css` and link it; style dynamic values through the CSSOM (`el.style.x = ...`).
- **Script order** in `index.html`: `theme.js` loads synchronously first (prevents theme flash); everything else is `defer`, vendor before `i18n.js`, `flask.js`, `main.js`.
- **Secrets**: the site needs none. Deploy credentials live in Cloudflare and GitHub environment secrets. The pre-commit hook (enabled by `./dev init`) rejects credential-looking diffs.
- `?debug` exposes `window.__flask` for layout tests.

## Recipes

**Add a copy string**: add `data-i18n="section.name"` in `index.html`, add the key to `en` and `th` in `i18n.js`, `./dev check`.

**Add a crew avatar**: PNG at `public/assets/cooks/<github-login>.png` (96x96), new `<li>` in the crew list of `index.html` copying a sibling's attributes, `./dev check`.

**Add a member page** (path served by another repo's Worker). Order matters: a binding to a Worker that does not exist fails the deploy.
1. Deploy the member's Worker (no routes of its own).
2. `wrangler.toml`: add a `[[services]]` binding.
3. `src/worker.js`: add `"/<path>": "<BINDING>"` to `MEMBER_PAGES`.
4. `index.html`: wrap the avatar in `<a href="/<path>/">`.
5. `.github/workflows/deploy.yml`: add a smoke check for `/<path>/`.
6. `./dev check` confirms all four agree.

## Deploy

Push to `main` deploys via `.github/workflows/deploy.yml`, then a smoke check compares live files with `public/`. `./dev deploy` is the manual path.

## Local dev gotcha

`./dev worker` serves https (self-signed): wrangler dev hands the Worker the production host, so plain http would be redirected. `./dev serve` is plain static files without the Worker.
