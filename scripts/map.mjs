#!/usr/bin/env node
// Prints a line-numbered table of contents for the hand-written site files, built
// from the section comments already in them, so an agent can read one section
// (offset/limit) instead of a whole file. Generated each run, so it never goes stale.
// Sections: `/* ---------- name ---------- */` in CSS/JS, `<!-- Name: ... -->` in HTML.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = [
  "public/index.html",
  "public/styles.css",
  "public/tokens.css",
  "public/main.js",
  "public/flask.js",
  "public/i18n.js",
  "public/theme.js",
  "src/worker.js",
];

const CSS_JS_SECTION = /^\s*\/\*\s*-{3,}\s*(.+?)\s*-{3,}\s*\*\/\s*$/;
const HTML_SECTION = /^\s*<!--\s*(.+?)\s*-->\s*$/;
const I18N_LANG = /^\s{2}(\w+): \{/;
const I18N_KEY = /^\s+"([^".]+)[."]/;

for (const file of FILES) {
  const text = readFileSync(join(ROOT, file), "utf8");
  const lines = text.split("\n");
  const sections = [];

  if (file.endsWith("i18n.js")) {
    // one entry per key prefix ("nav", "hero", ...) inside each language block
    let lang = null, prefix = null;
    lines.forEach((line, i) => {
      const l = line.match(I18N_LANG);
      if (l) { lang = l[1]; prefix = null; sections.push(`${i + 1} [${lang}]`); return; }
      const k = lang && line.match(I18N_KEY);
      if (k && k[1] !== prefix) { prefix = k[1]; sections.push(`${i + 1} ${prefix}`); }
    });
  } else {
    const re = file.endsWith(".html") ? HTML_SECTION : CSS_JS_SECTION;
    lines.forEach((line, i) => {
      const m = line.match(re);
      if (m) sections.push(`${i + 1} ${m[1].split(/[.:]/)[0].trim()}`);
    });
  }

  const lineCount = lines.length - (text.endsWith("\n") ? 1 : 0);
  const tokens = Math.round(Buffer.byteLength(text) / 400) / 10; // ~4 bytes per token
  console.log(`${file}  ${lineCount}L ~${tokens}k tok`);
  if (sections.length) console.log(`  ${sections.join(" · ")}`);
}
