# yummlab.site

Landing page for [yumm lab](https://github.com/yumm-lab), a small kitchen for side projects.

Static site, no build step. English and Thai.

## Run locally

```sh
./dev init     # once per clone: git hooks, tool check, consistency check
./dev serve    # http://localhost:8765 (add ?debug to expose the flask layout hook)
./dev          # every other command
```

Needs Node.js (checks, wrangler) and Python 3 (`./dev serve`).

File map, rules and how-tos (add copy, add a crew avatar, add a member page): [AGENTS.md](AGENTS.md).

## Deploy

Cloudflare Workers static assets, Worker `yummlab-site` (see `wrangler.toml`), served at https://yummlab.site.
Push to `main` deploys through GitHub Actions and smoke-checks the live site. Manual: `npx wrangler login`, then `./dev deploy`.

### Member pages

A member's page lives in its own repo and its own Worker, which has no routes.
This Worker forwards the path to it through a service binding, URL unchanged:

| Path | Repo | Worker | Binding |
| --- | --- | --- | --- |
| `/de-faults/` | [yumm-lab/de-faults](https://github.com/yumm-lab/de-faults) | `yummlab-de-faults` | `DE_FAULTS` |

Run both locally with the member repo checked out next to this one: `./dev worker --member`.

## Security

- No secrets belong in this repo. The site needs none: it is static and talks to no API.
- Deploy credentials stay in Cloudflare / your local `wrangler login`, never in files here.
- `.gitignore` blocks `.env*`, `.dev.vars`, keys and certificates.
- A pre-commit hook in `.githooks/` rejects staged changes that look like credentials (`./dev init` enables it).
- GitHub secret scanning and push protection are on for this repository.
- The page sends a strict Content-Security-Policy (`public/_headers`): scripts only from this origin (plus the Cloudflare Web Analytics beacon Cloudflare injects), fonts only from Google Fonts.
