---
title: Agent-friendly repo: ./dev task script, check, map, AGENTS.md
status: open
severity: low
next: 
blocked_on: 
created: 2026-11-21
updated: 2026-11-21
---

# Agent-friendly repo: ./dev task script, check, map, AGENTS.md

## Goal

Any agent can set up a clone and run every task with one script, and edit the site by reading
sections instead of whole files. No behaviour change to the site.

## Context

- `dev` (repo root): `init | serve | worker [--member] | map | check | deploy`. Wrangler pinned to
  4.153.0, same as `.github/workflows/deploy.yml`.
- `scripts/check.mjs`: i18n keys (index.html vs en/th), local refs, member wiring
  (wrangler.toml `[[services]]` = `MEMBER_PAGES` = index.html link = CI smoke check), JS syntax.
  Runs in CI before deploy.
- `scripts/map.mjs`: section index from `/* ---------- x ---------- */` and `<!-- X -->` comments.
- `AGENTS.md` is the agent doc; `CLAUDE.md` is only `@AGENTS.md`. README slimmed for humans.
- `public/flask.js`: 10 section comments added, nothing else.
- Decided against splitting JS/CSS: no build step + strict CSP + shared `window` globals +
  CI smoke check compares `main.js`/`styles.css` by name; responsive CSS sits in one section,
  so a split would still mean two files per edit. `./dev map` gets the token saving without risk.
- `./dev worker` always uses `--local-protocol https`: wrangler dev hands the Worker the route
  host, so plain http is 301-redirected.

## Next steps

- [x] dev, check.mjs, map.mjs, AGENTS.md, CLAUDE.md, README, CI step
- [ ] Watch the first CI run after push: the new "Check" step must pass before "Deploy".

## Verify

`./dev check` → `check: ok`; `./dev map` prints a section index for every file;
`git diff public/flask.js` shows only added `/* ---------- */` lines.

## Log

- 2026-11-21 claude-dfff8cbc: created
- 2026-11-21 claude-dfff8cbc: open — All local work done and verified (./dev check ok, ./dev map ok, flask.js diff comments only). Left open only for the first CI run after push: confirm the new Check step passes, then release done.
