// One-off generator for the initial content files. Run once, then delete.
import { writeFileSync, mkdirSync } from 'node:fs';

const DIR = './src/content/work';
mkdirSync(DIR, { recursive: true });

const EMBED_HINT = `# media:
#   - kind: vimeo        # vimeo | youtube | soundcloud | bandcamp | audio | image
#     src: "123456789"   # see _embeds.md for the exact format of each kind
#     title: Full set`;

const works = [
  // ---- 1. performance -------------------------------------------------
  {
    id: 'reflected-radio',
    title: 'Reflected Radio',
    section: 'performance',
    format: 'radio series',
    order: 1,
    blurb: 'A six-part radio series.',
    body:
      'Six episodes. Say what the series is, how it was broadcast, and what ' +
      'holds the six together.\n\nAdd each episode as its own item under ' +
      '`media:` with a title, so the page reads as a run of six players.',
  },
  {
    id: 'techno-para-dos-warp',
    title: 'Techno para dos: Warp',
    section: 'performance',
    format: 'live set',
    order: 2,
    credits: ['Techno para dos'],
  },
  {
    id: 'hologramas',
    title: 'Hologramas',
    section: 'performance',
    format: 'live set',
    order: 3,
    credits: ['dj hiccup', 'co de sus'],
  },
  {
    id: 'aire-libre',
    title: 'Aire Libre',
    section: 'performance',
    format: 'live set',
    order: 4,
    blurb: 'Late-night ambient, outdoors.',
  },
  {
    id: 'scenes-from-a-memory',
    title: 'Scenes from a Memory',
    section: 'performance',
    format: 'live set',
    order: 5,
  },
  {
    id: 'transit-cadence',
    title: 'Transit Cadence',
    section: 'performance',
    format: 'live set',
    order: 6,
  },

  // ---- 2. sound -------------------------------------------------------
  { id: 'baladi', title: 'Baladí', section: 'sound', format: 'recording', order: 1 },
  { id: 'arp-68', title: 'arp:68', section: 'sound', format: 'recording', order: 2 },
  {
    id: 'el-cielo-es-azul',
    title: 'El cielo es azul',
    section: 'sound',
    format: 'recording',
    order: 3,
  },
  {
    id: 'gracias-a-la-vida',
    title: 'Gracias a la vida',
    section: 'sound',
    format: 'recording',
    order: 4,
  },
  {
    id: 'noise-poems',
    title: 'Noise Poems',
    section: 'sound',
    format: 'recording',
    order: 5,
    wip: true,
  },

  // ---- 3. interactive / instalación -----------------------------------
  {
    id: 'incidental',
    title: 'Incidental',
    section: 'interactive',
    format: 'installation',
    order: 1,
  },
  {
    id: 'frente-a-un-espejo-roto',
    title: 'Frente a un espejo roto',
    section: 'interactive',
    format: 'installation',
    order: 2,
    credits: ['Fauer'],
  },
  { id: 'vistas', title: 'Vistas', section: 'interactive', format: 'installation', order: 3 },

  // ---- 4. audiovisual --------------------------------------------------
  {
    id: 'co-de-sus',
    title: 'co de sus',
    section: 'av',
    format: 'video',
    order: 1,
    credits: ['co de sus'],
    pieces: ['Cuadros', 'Fluye', 'Estancias'],
  },
  {
    id: 'belmar',
    title: 'belmar',
    section: 'av',
    format: 'video',
    order: 2,
    credits: ['belmar'],
    pieces: ['Luz de neón', 'Seasons', 'Tormenta espacios', 'Nights without coffee'],
  },
  {
    id: 'techno-para-dos',
    title: 'Techno para dos',
    section: 'av',
    format: 'video',
    order: 3,
    credits: ['Techno para dos'],
    pieces: ['Hardrama', 'Drum n Bass', 'Sin tiempo'],
  },
  {
    id: 'alondra-maynez-ventus',
    title: 'Alondra Maynez: Ventus',
    section: 'av',
    format: 'video',
    order: 4,
    credits: ['Alondra Maynez'],
  },
  {
    id: 'eliangel',
    title: 'eliangel',
    section: 'av',
    format: 'video',
    order: 5,
    credits: ['eliangel'],
    pieces: ['on1y', 'mi vibe'],
  },
  { id: 'tres-islas', title: 'Tres islas', section: 'av', format: 'video', order: 6 },
];

const yamlStr = (s) => (/[:#'"\[\]{}&*?|>%@`]|^\s|\s$/.test(s) ? JSON.stringify(s) : s);

for (const w of works) {
  const lines = ['---'];
  lines.push(`title: ${yamlStr(w.title)}`);
  lines.push(`section: ${w.section}`);
  lines.push(`order: ${w.order}`);
  lines.push('# year: "2024"');
  if (w.format) lines.push(`format: ${yamlStr(w.format)}`);
  if (w.credits?.length) {
    lines.push('credits:');
    for (const c of w.credits) lines.push(`  - ${yamlStr(c)}`);
  }
  if (w.blurb) lines.push(`blurb: ${yamlStr(w.blurb)}`);
  if (w.wip) lines.push('wip: true');

  if (w.pieces) {
    lines.push('media: []');
    lines.push('# Each piece below gets its own embed. Fill in src and delete the #:');
    for (const p of w.pieces) {
      lines.push(`#   - kind: vimeo`);
      lines.push(`#     src: "PASTE_VIMEO_ID"`);
      lines.push(`#     title: ${yamlStr(p)}`);
    }
  } else {
    lines.push('media: []');
    lines.push(EMBED_HINT);
  }

  lines.push('---', '');
  lines.push(
    w.body ??
      'Write a short paragraph here — what it is, where it happened, who it was ' +
        'with. Two or three sentences is usually enough.',
  );
  if (w.pieces) {
    lines.push('', `Pieces: ${w.pieces.join(', ')}.`);
  }
  lines.push('');

  writeFileSync(`${DIR}/${w.id}.md`, lines.join('\n'), 'utf8');
}

console.log(`Wrote ${works.length} files to ${DIR}`);
