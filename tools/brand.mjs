#!/usr/bin/env node
// Lathrion brand assets, drawn as plain geometry so every size comes from one source.
//
//   node tools/brand.mjs          writes assets/brand/*.svg and favicon.svg, refreshes the inline copies
//                                 in the HTML pages (between <!--brand:NAME--> markers) and the section pages
//   node tools/brand.mjs --png    also renders the PNG icons, favicon.ico and og.png with headless Chrome
//
// The mark is a pyramid whose capstone has been lifted off. The wordmark is drawn letter by letter;
// its A is a Λ (no crossbar) cut at the same slope as the sides of the mark.

import { mkdirSync, readFileSync, writeFileSync, rmSync, existsSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeRoutes } from './routes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BONE = '#ece8e1';
const INK = '#08090b';

// ---------------------------------------------------------------------------------------------
// Geometry helpers. Outer contours run clockwise and counters anticlockwise, so the default
// nonzero fill rule unions overlapping strokes and still punches the holes.

const CAP = 100; // cap height
const V = 13; // vertical stem
const HS = 12; // horizontal stroke (slightly lighter, the usual optical correction)
const OV = 2; // overshoot for points and rounds
const SLOPE = 1.92; // rise over run of every diagonal: Λ legs, R leg, sides of the mark (62.5°)
const TRACK = 30; // space between letters

const f = (n) => String(Math.round(n * 100) / 100);
const rect = (x, y, w, h) => `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}Z`;
const poly = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';

function rrect(x, y, w, h, [tl, tr, br, bl], hole = false) {
  const arc = (r, x2, y2) => (r ? `A${f(r)} ${f(r)} 0 0 ${hole ? 0 : 1} ${f(x2)} ${f(y2)}` : '');
  if (!hole) {
    return (
      `M${f(x + tl)} ${f(y)}H${f(x + w - tr)}${arc(tr, x + w, y + tr)}` +
      `V${f(y + h - br)}${arc(br, x + w - br, y + h)}` +
      `H${f(x + bl)}${arc(bl, x, y + h - bl)}` +
      `V${f(y + tl)}${arc(tl, x + tl, y)}Z`
    );
  }
  return (
    `M${f(x + tl)} ${f(y)}${arc(tl, x, y + tl)}` +
    `V${f(y + h - bl)}${arc(bl, x + bl, y + h)}` +
    `H${f(x + w - br)}${arc(br, x + w, y + h - br)}` +
    `V${f(y + tr)}${arc(tr, x + w - tr, y)}Z`
  );
}

// Horizontal thickness of a diagonal stroke of perpendicular weight `weight` at slope rise/run.
const diagWidth = (weight, rise, run) => (weight * Math.hypot(run, rise)) / rise;

// ---------------------------------------------------------------------------------------------
// Letters. Each returns { w, d } with the origin at the top-left of the cap height.

function L() {
  const w = 70;
  return { w, d: rect(0, 0, V, CAP) + rect(0, CAP - HS, w, HS) };
}

function Lambda() {
  const rise = CAP + OV;
  const run = rise / SLOPE;
  const w = 2 * run;
  const D = diagWidth(V, rise, run);
  const innerApex = CAP - (w / 2 - D) * SLOPE;
  return { w, d: poly([[0, CAP], [w / 2, -OV], [w, CAP], [w - D, CAP], [w / 2, innerApex], [D, CAP]]) };
}

function T() {
  const w = 84;
  return { w, d: rect(0, 0, w, HS) + rect(w / 2 - V / 2, HS, V, CAP - HS) };
}

function H() {
  const w = 86;
  return { w, d: rect(0, 0, V, CAP) + rect(w - V, 0, V, CAP) + rect(V, 50 - HS / 2, w - 2 * V, HS) };
}

function R() {
  const w = 86;
  const bowl = 58; // bottom of the bowl
  const r = 25;
  const ri = r - (V + HS) / 2;
  const legTop = bowl - HS;
  const rise = CAP - legTop;
  const run = rise / SLOPE;
  const D = diagWidth(V, rise, run);
  const a = w - D - run; // where the leg leaves the bowl
  return {
    w,
    d:
      rect(0, 0, V, CAP) +
      rrect(V - 0.01, 0, w - V, bowl, [0, r, r, 0]) +
      rrect(V, HS, w - 2 * V, bowl - 2 * HS, [0, ri, ri, 0], true) +
      poly([[a, legTop], [a + D, legTop], [w, CAP], [w - D, CAP]]),
  };
}

function I() {
  return { w: V, d: rect(0, 0, V, CAP) };
}

function O() {
  const w = 108;
  const r = 38;
  const ri = r - (V + HS) / 2;
  return {
    w,
    d: rrect(0, -1, w, CAP + 2, [r, r, r, r]) + rrect(V, HS - 1, w - 2 * V, CAP + 2 - 2 * HS, [ri, ri, ri, ri], true),
  };
}

function N() {
  const w = 90;
  let D = V;
  for (let i = 0; i < 6; i++) D = diagWidth(V * 0.96, CAP, w - D);
  return { w, d: rect(0, 0, V, CAP) + rect(w - V, 0, V, CAP) + poly([[0, 0], [D, 0], [w, CAP], [w - D, CAP]]) };
}

// Pair kerning on top of TRACK, judged by eye at nav and footer sizes.
const KERN = { LΛ: -14, ΛT: -24, TH: -8, HR: 0, RI: -2, IO: -3, ON: -3 };

function wordmark() {
  const letters = [['L', L()], ['Λ', Lambda()], ['T', T()], ['H', H()], ['R', R()], ['I', I()], ['O', O()], ['N', N()]];
  let x = 0;
  const parts = [];
  letters.forEach(([ch, g], i) => {
    if (i > 0) x += TRACK + (KERN[letters[i - 1][0] + ch] || 0);
    parts.push(`<path transform="translate(${f(x)} 0)" d="${g.d}"/>`);
    x += g.w;
  });
  return { width: x, top: -OV, height: CAP + 2 * OV, body: parts.join('') };
}

// The mark: apex at (50, 2), base on y = 98 from x = 0 to 100, cut by a horizontal gap.
function mark({ gapTop = 33, gapBottom = 42 } = {}) {
  const apex = 2;
  const base = 98;
  const half = (y) => (y - apex) / SLOPE;
  const cap = poly([[50, apex], [50 + half(gapTop), gapTop], [50 - half(gapTop), gapTop]]);
  const body = poly([[50 - half(gapBottom), gapBottom], [50 + half(gapBottom), gapBottom], [50 + half(base), base], [50 - half(base), base]]);
  return { cap, body };
}

// ---------------------------------------------------------------------------------------------
// SVG documents

const WM = wordmark();
const MARK = mark();
const ICON_MARK = mark({ gapTop: 31, gapBottom: 44 }); // wider gap so it survives 16 px

const markGroup = (m, fill, capFill = fill) => `<path fill="${capFill}" d="${m.cap}"/><path fill="${fill}" d="${m.body}"/>`;

function svgMark(fill, { cls = '', title = 'Lathrion' } = {}) {
  const t = title ? `<title>${title}</title>` : '';
  const a = title ? 'role="img"' : 'aria-hidden="true" focusable="false"';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"${cls ? ` class="${cls}"` : ''} ${a}>${t}${markGroup(MARK, fill)}</svg>`;
}

function svgWordmark(fill, { cls = '', title = 'Lathrion', pad = 0 } = {}) {
  const t = title ? `<title>${title}</title>` : '';
  const a = title ? 'role="img"' : 'aria-hidden="true" focusable="false"';
  const vb = `${f(-pad)} ${f(WM.top - pad)} ${f(WM.width + 2 * pad)} ${f(WM.height + 2 * pad)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${cls ? ` class="${cls}"` : ''} ${a}>${t}<g fill="${fill}">${WM.body}</g></svg>`;
}

// Mark beside the wordmark: the mark is 1.32 cap heights tall and centred on the caps.
function svgLockup(fill, { cls = '', title = 'Lathrion' } = {}) {
  const mh = 132;
  const s = mh / 100;
  const my = 50 - mh / 2;
  const gap = 46;
  const wx = mh + gap;
  const width = wx + WM.width;
  const t = title ? `<title>${title}</title>` : '';
  const a = title ? 'role="img"' : 'aria-hidden="true" focusable="false"';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${f(my)} ${f(width)} ${f(mh)}"${cls ? ` class="${cls}"` : ''} ${a}>${t}` +
    `<g fill="${fill}"><g transform="translate(0 ${f(my)}) scale(${s})">${markGroup(MARK, fill)}</g>` +
    `<g transform="translate(${f(wx)} 0)">${WM.body}</g></g></svg>`
  );
}

function svgFavicon() {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${INK}"/>` +
    `<g transform="translate(13 12.5) scale(0.38)">${markGroup(ICON_MARK, BONE)}</g></svg>`
  );
}

// ---------------------------------------------------------------------------------------------
// Inline copies in the pages, between <!--brand:NAME--> and <!--/brand:NAME-->.

const INLINE = {
  lockup: () => svgLockup('currentColor', { cls: 'lockup', title: '' }),
  wordmark: () => svgWordmark('currentColor', { cls: 'wordmark', title: '' }),
  mark: () => svgMark('currentColor', { cls: 'mark', title: '' }),
  'og-mark': () => svgMark(BONE, { cls: 'og-mark', title: '' }),
  'og-wordmark': () => svgWordmark(BONE, { cls: 'og-wordmark', title: '' }),
};

function inject(file) {
  const path = join(ROOT, file);
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  const after = before.replace(/<!--brand:([\w-]+)-->[\s\S]*?<!--\/brand:\1-->/g, (m, name) => {
    if (!INLINE[name]) throw new Error(`${file}: unknown brand block "${name}"`);
    return `<!--brand:${name}-->${INLINE[name]()}<!--/brand:${name}-->`;
  });
  if (after !== before) {
    writeFileSync(path, after);
    console.log(`  updated ${file}`);
  }
}

// ---------------------------------------------------------------------------------------------
// PNGs via headless Chrome

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

function shoot(html, out, w, h, profile) {
  const page = join(profile, `shot-${w}x${h}.html`);
  writeFileSync(page, html);
  execFileSync(
    CHROME,
    [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
      `--user-data-dir=${join(profile, 'chrome')}`, '--force-device-scale-factor=1', `--window-size=${w},${h}`,
      '--default-background-color=00000000', '--virtual-time-budget=4000', `--screenshot=${out}`, `file://${page}`,
    ],
    { stdio: 'ignore' },
  );
}

const iconPage = (size, { radius = 0, scale = 0.58 } = {}) => {
  const m = size * scale;
  return (
    `<!doctype html><html><body style="margin:0;background:transparent">` +
    `<div style="width:${size}px;height:${size}px;background:${INK};border-radius:${radius}px;display:grid;place-items:center">` +
    `<svg viewBox="0 0 100 100" width="${m}" height="${m}" style="display:block;margin-top:-${size * 0.02}px">${markGroup(size <= 48 ? ICON_MARK : MARK, BONE)}</svg>` +
    `</div></body></html>`
  );
};

function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const dir = Buffer.alloc(16 * pngs.length);
  let offset = 6 + dir.length;
  pngs.forEach(({ size, buf }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(buf.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += buf.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.buf)]);
}

function renderPngs() {
  if (!existsSync(CHROME)) throw new Error('Google Chrome is needed for --png');
  const profile = mkdtempSync(join(tmpdir(), 'lathrion-brand-'));
  try {
    shoot(iconPage(180), join(ROOT, 'apple-touch-icon.png'), 180, 180, profile);
    shoot(iconPage(192), join(ROOT, 'icon-192.png'), 192, 192, profile);
    shoot(iconPage(512), join(ROOT, 'icon-512.png'), 512, 512, profile);
    const small = [16, 32, 48].map((size) => {
      const out = join(profile, `fav-${size}.png`);
      shoot(iconPage(size, { radius: size * 0.22, scale: 0.66 }), out, size, size, profile);
      return { size, buf: readFileSync(out) };
    });
    writeFileSync(join(ROOT, 'favicon.ico'), ico(small));
    // The social card is a real page so it uses the site's fonts.
    execFileSync(
      CHROME,
      [
        '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
        `--user-data-dir=${join(profile, 'chrome')}`, '--force-device-scale-factor=1', '--window-size=1200,630',
        '--virtual-time-budget=4000', `--screenshot=${join(ROOT, 'og.png')}`, `file://${join(ROOT, 'tools', 'og.html')}`,
      ],
      { stdio: 'ignore' },
    );
    console.log('  rendered apple-touch-icon.png, icon-192.png, icon-512.png, favicon.ico, og.png');
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------

mkdirSync(join(ROOT, 'assets', 'brand'), { recursive: true });
const out = {
  'assets/brand/mark-light.svg': svgMark(BONE),
  'assets/brand/mark-dark.svg': svgMark(INK),
  'assets/brand/wordmark-light.svg': svgWordmark(BONE),
  'assets/brand/wordmark-dark.svg': svgWordmark(INK),
  'assets/brand/lockup-light.svg': svgLockup(BONE),
  'assets/brand/lockup-dark.svg': svgLockup(INK),
  'favicon.svg': svgFavicon(),
};
for (const [file, svg] of Object.entries(out)) writeFileSync(join(ROOT, file), svg + '\n');
console.log(`  wrote ${Object.keys(out).length} SVG files (wordmark ${f(WM.width)} x ${f(WM.height)} units)`);

for (const page of ['index.html', 'privacy.html', '404.html', 'tools/og.html']) inject(page);
writeRoutes(); // the section pages are copies of index.html
if (process.argv.includes('--png')) renderPngs();
