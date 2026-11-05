# Lathrion

The website of **Lathrion**, a holding company that builds and runs software that finds things out.

**Live:** https://lathrion.com

It is a static site with no build step and no dependencies: plain HTML, CSS and a small script, served by
GitHub Pages from the root of `main`.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The homepage: hero, holdings, doctrine, the name, contact |
| `privacy.html` | Privacy policy (the site collects nothing) |
| `404.html` | Not-found page. GitHub Pages serves it for any missing address |
| `assets/css/site.css` | All styles. Colours and type are tokens at the top |
| `assets/js/site.js` | Clock, menu, scroll reveals, doctrine focus and the rotating pyramid in the hero |
| `assets/fonts/` | Self-hosted fonts and their licences |
| `assets/brand/` | Logo files: mark, wordmark and lockup, light and dark |
| `tools/brand.mjs` | Draws the logo and writes every icon from it |
| `tools/og.html` | The 1200 x 630 social card, rendered into `og.png` |

## Run it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Changing things

**Add a product.** Copy one `<li>` in the holdings section of `index.html` into the right sector and change
the name, link, description and the tag under "Live". Then update the counts: "Seven products are public"
in the hero and the `07` in the strip below it.

**Change the logo.** The mark and the wordmark are drawn from numbers in `tools/brand.mjs` (stroke weights,
letter widths, spacing). After editing, run:

```bash
node tools/brand.mjs --png
```

That rewrites the SVGs in `assets/brand/`, `favicon.svg`, the inline copies in the pages, and, with
`--png`, renders `favicon.ico`, the PNG icons and `og.png` using Google Chrome.

## Domain

The site is served at **lathrion.com** through the `CNAME` file. The DNS lives at Namecheap
(Domain List → lathrion.com → Advanced DNS):

| Type | Host | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `yutonghanofficial.github.io.` |

www.lathrion.com and the old github.io address both redirect to https://lathrion.com, and HTTPS is
enforced in Settings → Pages. `404.html` picks its base path from the hostname, so it works at either address.

## Privacy

The pages load nothing from other servers: no analytics, no cookies, no font CDNs. If you add a third-party
script, font or embed, update `privacy.html` in the same change.

## Fonts

All under the SIL Open Font License 1.1; the licence texts are in `assets/fonts/`.

- [Archivo](https://github.com/Omnibus-Type/Archivo) by Omnibus-Type (variable width and weight)
- [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono) by JetBrains
- [Noto Serif Display](https://github.com/notofonts/latin-greek-cyrillic) by Google

© 2026 Lathrion. All rights reserved.
