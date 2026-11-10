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
| `public/main.js` | Language switch, smooth scroll, reveals, recipe loop, nav. |
| `public/flask.js` | The 3D particle flask mascot (plain WebGL, no library). |
| `public/vendor/` | GSAP 3.15.0, ScrollTrigger, Lenis 1.3.27, pinned copies. |
| `public/_headers` | Cloudflare Pages security and cache headers (CSP and friends). |

## Deploy

Cloudflare Pages, project `yummlab-site` (see `wrangler.toml`):

```sh
npx wrangler login
npx wrangler pages deploy
```

## Security

- No secrets belong in this repo. The site needs none: it is static and talks to no API.
- Deploy credentials stay in Cloudflare / your local `wrangler login`, never in files here.
- `.gitignore` blocks `.env*`, `.dev.vars`, keys and certificates.
- A pre-commit hook in `.githooks/` rejects staged changes that look like credentials.
  Enable it once per clone: `git config core.hooksPath .githooks`
- GitHub secret scanning and push protection are on for this repository.
- The page sends a strict Content-Security-Policy (`public/_headers`): scripts only from this origin, fonts only from Google Fonts.
