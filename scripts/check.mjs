#!/usr/bin/env node
// Consistency checks for the site. No dependencies; run with `./dev check`.
// Parses with regexes on purpose: the files are small, hand-written and have a
// known shape, so a real HTML/TOML parser would only add an install step.
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const errors = [];
const warnings = [];

const html = read("public/index.html");
const worker = read("src/worker.js");
const wrangler = read("wrangler.toml");
const deployYml = read(".github/workflows/deploy.yml");

// --- syntax: every hand-written script must parse ---
for (const f of ["public/theme.js", "public/i18n.js", "public/main.js", "public/flask.js", "src/worker.js"]) {
  try {
    execFileSync(process.execPath, ["--check", join(ROOT, f)], { stdio: "pipe" });
  } catch (e) {
    const detail = e.stderr.toString().split("\n").filter((l) => l.trim() && !/^\s+at |^Node\.js /.test(l));
    errors.push(`syntax: ${f}\n${detail.join("\n")}`);
  }
}

// --- i18n: keys in index.html exist in both languages, and en/th agree ---
const sandbox = {}; // i18n.js assigns globalThis.YUMM_I18N, which is the sandbox itself
vm.runInNewContext(read("public/i18n.js"), sandbox);
const dict = sandbox.YUMM_I18N ?? {};
const langs = ["en", "th"];
for (const lang of langs) if (!dict[lang]) errors.push(`i18n: missing language "${lang}" in public/i18n.js`);

const htmlKeys = new Set([...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]));
for (const key of htmlKeys) {
  for (const lang of langs) {
    if (dict[lang] && !(key in dict[lang])) errors.push(`i18n: "${key}" used in index.html, missing in ${lang}`);
  }
}
if (dict.en && dict.th) {
  for (const key of Object.keys(dict.en)) if (!(key in dict.th)) errors.push(`i18n: "${key}" in en, missing in th`);
  for (const key of Object.keys(dict.th)) if (!(key in dict.en)) errors.push(`i18n: "${key}" in th, missing in en`);
  // keys may also be read from JS, e.g. t(lang, "meta.title")
  const js = read("public/main.js") + read("public/flask.js") + worker;
  for (const key of Object.keys(dict.en)) {
    if (!htmlKeys.has(key) && !js.includes(`"${key}"`)) warnings.push(`i18n: "${key}" is never used`);
  }
}

// --- members: wrangler.toml [[services]] <-> MEMBER_PAGES <-> index.html <-> CI smoke check ---
const tomlBindings = new Set([...wrangler.matchAll(/^\s*binding\s*=\s*"([^"]+)"/gm)].map((m) => m[1]));
tomlBindings.delete("ASSETS"); // [assets] binding, not a member
const pagesBlock = worker.match(/const MEMBER_PAGES = \{([\s\S]*?)\};/);
if (!pagesBlock) errors.push("members: MEMBER_PAGES not found in src/worker.js");
const members = [...(pagesBlock?.[1] ?? "").matchAll(/"([^"]+)"\s*:\s*"([^"]+)"/g)].map((m) => ({ prefix: m[1], binding: m[2] }));
const workerBindings = new Set(members.map((m) => m.binding));
for (const b of tomlBindings) if (!workerBindings.has(b)) errors.push(`members: binding ${b} in wrangler.toml, not in MEMBER_PAGES (src/worker.js)`);
for (const { prefix, binding } of members) {
  if (!tomlBindings.has(binding)) errors.push(`members: ${binding} in MEMBER_PAGES, no [[services]] binding in wrangler.toml`);
  if (!html.includes(`href="${prefix}/"`)) errors.push(`members: no link href="${prefix}/" in public/index.html`);
  if (!deployYml.includes(`yummlab.site${prefix}/`)) errors.push(`members: no smoke check for ${prefix}/ in .github/workflows/deploy.yml`);
}

// --- local refs: every root-relative src/href in index.html points at a real file ---
const memberPrefixes = members.map((m) => m.prefix);
for (const [, ref] of html.matchAll(/(?:src|href)="(\/[^"#?]*)"/g)) {
  if (memberPrefixes.some((p) => ref === p || ref.startsWith(`${p}/`))) continue;
  const file = ref.endsWith("/") ? `${ref}index.html` : ref;
  if (!existsSync(join(ROOT, "public", file))) errors.push(`refs: ${ref} in index.html, no file public${file}`);
}

for (const w of warnings) console.log(`warn  ${w}`);
for (const e of errors) console.log(`FAIL  ${e}`);
if (errors.length) {
  console.log(`\ncheck: ${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`check: ok (${htmlKeys.size} i18n keys, ${members.length} member page(s)${warnings.length ? `, ${warnings.length} warning(s)` : ""})`);
