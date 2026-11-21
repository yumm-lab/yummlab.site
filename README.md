# yummlab.site

Landing page for [yumm lab](https://github.com/yumm-lab), a small kitchen for side projects.

Static site, no build step. English and Thai.

## Run locally

```sh
cd public
python3 -m http.server 8765
# open http://localhost:8765  (add ?debug to expose the flask layout hook)
```

## What's inside

| Path | What |
| --- | --- |
| `public/index.html` | Page markup. Text is keyed with `data-i18n`. |
| `public/i18n.js` | EN / TH copy. Applied with `textContent` only. |
| `public/styles.css`, `public/tokens.css` | Styles and design tokens (OKLCH). |
| `public/theme.js` | Sets light/dark before first paint (saved choice, else system). |
| `public/main.js` | Language and theme switches, smooth scroll, reveals, recipe loop, nav. |
| `public/flask.js` | The 3D particle flask mascot (plain WebGL, no library). |
| `public/vendor/` | GSAP 3.15.0, ScrollTrigger, Lenis 1.3.27, pinned copies. |
| `public/_headers` | Cloudflare security and cache headers (CSP and friends). |
| `src/worker.js` | Redirects `www` and `http` to `https://yummlab.site`; forwards member pages. |

## Deploy

Cloudflare Workers static assets, Worker `yummlab-site` (see `wrangler.toml`),
served at https://yummlab.site. `src/worker.js` redirects `www` and plain
`http` to `https://yummlab.site` and forwards member pages (below); every other
request is served from `public/`.

```sh
npx wrangler login
npx wrangler deploy
```

### Member pages

A member's page lives in its own repo and its own Worker, which has no routes.
This Worker forwards the path to it through a service binding, URL unchanged:

| Path | Repo | Worker | Binding |
| --- | --- | --- | --- |
| `/de-faults/` | [yumm-lab/de-faults](https://github.com/yumm-lab/de-faults) | `yummlab-de-faults` | `DE_FAULTS` |

To add one: deploy the member's Worker first, then add a `[[services]]` entry in
`wrangler.toml`, a line in `MEMBER_PAGES` in `src/worker.js`, and a link around
the avatar in `public/index.html`. Deploying this Worker with a binding to a
Worker that does not exist yet fails.

Run both locally (with the member repo checked out next to this one):

```sh
npx wrangler dev -c wrangler.toml -c ../de-faults/wrangler.toml --local-protocol https
# https because the worker redirects plain http (wrangler dev reports the route host)
```

## Security

- No secrets belong in this repo. The site needs none: it is static and talks to no API.
- Deploy credentials stay in Cloudflare / your local `wrangler login`, never in files here.
- `.gitignore` blocks `.env*`, `.dev.vars`, keys and certificates.
- A pre-commit hook in `.githooks/` rejects staged changes that look like credentials.
  Enable it once per clone: `git config core.hooksPath .githooks`
- GitHub secret scanning and push protection are on for this repository.
- The page sends a strict Content-Security-Policy (`public/_headers`): scripts only from this origin, fonts only from Google Fonts.
