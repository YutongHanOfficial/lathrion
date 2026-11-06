#!/usr/bin/env node
// Writes a copy of index.html for each section address, so lathrion.com/holdings, /doctrine, /name and
// /contact load the homepage (GitHub Pages serves /x from x.html). site.js then scrolls to the section.
//
//   node tools/routes.mjs      run after every change to index.html (tools/brand.mjs runs it too)

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SECTIONS = { holdings: 'Holdings', doctrine: 'Doctrine', name: 'The name', contact: 'Contact' };

export function writeRoutes() {
  const index = readFileSync(join(ROOT, 'index.html'), 'utf8');
  if (!index.includes('<title>Lathrion</title>')) throw new Error('index.html: expected <title>Lathrion</title>');
  for (const [id, title] of Object.entries(SECTIONS)) {
    const page = index
      .replace('<!doctype html>', `<!doctype html>\n<!-- Generated from index.html by tools/routes.mjs. Edit index.html, then run it again. -->`)
      .replace('<title>Lathrion</title>', `<title>${title} · Lathrion</title>`);
    writeFileSync(join(ROOT, `${id}.html`), page);
  }
  console.log(`  wrote ${Object.keys(SECTIONS).map((id) => `${id}.html`).join(', ')}`);
}

if (import.meta.url === `file://${process.argv[1]}`) writeRoutes();
