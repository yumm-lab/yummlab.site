---
title: i18n key hero.est is defined but never used
status: open
severity: low
next: 
blocked_on:
created: 2026-11-21
updated: 2026-11-21
---

# i18n key hero.est is defined but never used

## Goal

`./dev check` reports no warnings: `hero.est` is either shown on the page or removed.

## Context

- `public/i18n.js` defines `hero.est` in both languages ("Est. 2026" / "ตั้งครัว 2026"), but no
  `data-i18n="hero.est"` exists in `public/index.html` and no JS reads it.
- Needs an owner decision: show it in the hero (which spot?) or delete it. Ask before choosing.

## Next steps

- [ ] Ask the owner: use it or drop it.
- [ ] Apply: add `data-i18n="hero.est"` in the hero section (`./dev map` for lines), or delete
      the key from both `en` and `th`.

## Verify

`./dev check` → `check: ok` with no `warn` line.

## Log

- 2026-11-21 claude-dfff8cbc: created
