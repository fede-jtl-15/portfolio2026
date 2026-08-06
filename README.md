# Portfolio site

Static site built with [Astro](https://astro.build). No page limit, no monthly
fee, no CMS to log into. Every project is one Markdown file.

---

## Running it

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install     # once
npm run dev     # http://localhost:4321
```

The dev server reloads as you save. `npm run build` produces the `dist/` folder
that gets deployed; `npm run preview` serves that build locally.

---

## Adding a project

Copy any file in `src/content/work/`, rename it, edit the frontmatter.

**The filename is the URL.** `vistas.md` becomes `/work/vistas`. Lowercase,
hyphens, no spaces or accents in the filename — accents belong in `title`.

```yaml
---
title: Vistas
section: interactive     # performance | sound | interactive | av
year: "2024"             # optional
format: installation     # short noun phrase, shown in the index
credits:                 # optional
  - Fauer
blurb: One sentence, shown under the title.
order: 3                 # position within the section, lowest first
wip: false               # true adds a WIP tag
draft: false             # true removes it from the site entirely
media: []
---

Prose goes here. Markdown works: **bold**, *italic*, [links](https://…),
## headings, and lists.
```

`section` must be one of the four listed values. Anything else fails the build
with a readable error instead of publishing a broken page.

To add a whole new section, edit `SECTIONS` in `src/lib/site.ts` and add the id
to the enum in `src/content.config.ts`. Its page is generated automatically.

---

## Adding media

Open `src/content/work/_embeds.md` — it documents every embed type with the
exact syntax. Short version:

| Kind | What goes in `src` |
| --- | --- |
| `vimeo` | the number from `vimeo.com/824804225` |
| `youtube` | the 11 characters from `youtu.be/dQw4w9WgXcQ` |
| `soundcloud` | the full public track or playlist URL |
| `bandcamp` | the number after `album=` in Bandcamp's embed code |
| `audio` | a path like `/audio/baladi.mp3` (file lives in `public/audio/`) |
| `image` | a path like `/images/vistas-01.jpg` (file lives in `public/images/`) |

**Keep video on Vimeo or YouTube.** Self-hosting video will blow past free
hosting limits and make the site slow. Audio is different — a 5 MB MP3 hosted
directly is fine, and gives you a player with no third-party branding.

Compress images before adding them (1600px wide, JPEG quality 80 is plenty).
Always write `alt` text.

---

## Deploying to Cloudflare Pages

Free, unlimited bandwidth, no page limit.

1. Push this folder to a GitHub repository.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**, and pick the repo.
3. Build command `npm run build`, output directory `dist`. Framework preset
   **Astro** fills these in for you.
4. Deploy.

Every `git push` to the main branch redeploys in about a minute. Pull requests
get their own preview URL, so you can look at a change before it goes live.

Add a custom domain under **Custom domains** in the project settings. A `.com`
runs roughly €10–15 a year; Cloudflare Registrar sells them at cost.

Netlify and Vercel work identically with the same settings if you prefer them.

---

## Before you launch

- [ ] `src/lib/site.ts` — name, role, description, email, social links
- [ ] `astro.config.mjs` — set `site` to your real domain
- [ ] `src/pages/index.astro` — replace the opening paragraph
- [ ] `src/pages/about.astro` — replace the bio
- [ ] Fill in `year`, `blurb`, and `media` for each project
- [ ] Replace `public/favicon.svg`
- [ ] Delete `scaffold-content.mjs` — it only existed to create the stubs

---

## How the design works

Everything is DM Mono, italic for titles and metadata, lowercase throughout.
Colour and spacing live in the token block at the top of
`src/styles/global.css`.

Each section owns a two-stop gradient, set in `SECTIONS` in `src/lib/site.ts`.
That one pair of colours drives the chip beside every entry, the wipe that runs
across a row on hover, the offset block behind media, and the dithered field at
the top of the section page. Change the two hex values and everything that
section touches follows.

The dither is a 2px grid of light and dark lines blended over the gradient
(`.field::after`), which is what keeps it from looking like a plain CSS
gradient.

All of it is CSS — no JavaScript ships to the browser at all, and
`prefers-reduced-motion` is respected.

Current build: **26 pages, 0 KB of JavaScript, 7.7 KB of CSS.**
