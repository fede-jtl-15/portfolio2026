export const SITE = {
  name: 'federico torres',
  // Properly-cased form for places search engines read as a name rather
  // than a stylized wordmark — the <title> tag, meta/JSON-LD structured
  // data (see Base.astro) — kept separate from `name` above since that one
  // stays lowercase everywhere it's actually rendered on the page.
  fullName: 'Federico Torres',
  // Other forms this person is known by — the stylized handle and the full
  // legal name — for JSON-LD Person.alternateName, so a knowledge panel can
  // disambiguate from other people who share the plain "Federico Torres" name.
  alternateNames: ['co_de_sus', 'Federico de Jesús Torres López'],
  jobTitle: 'New Media Artist',
  address: { locality: 'Berlin', country: 'DE' },
  role: 'sound, performance, audiovisual',
  description:
    'time-based media to explore abstraction focusing on the ephemeral and ever-changing nature of time and memory.',
  // A plain factual sentence for JSON-LD/search consumption — the poetic
  // tagline above (`description`) reads well as on-page copy but doesn't
  // work as a structured-data bio.
  personDescription:
    'New media artist and designer working in sound, interactive installations & performance, audiovisual & experimental film, and art direction.',
  email: 'fede.jtl.torres.3@gmail.com',
  url: 'https://federico-torres.com',
};

export const SOCIALS = [
  { label: 'soundcloud', href: 'https://soundcloud.com/co_de_sus' },
  { label: 'youtube', href: 'https://www.youtube.com/watch?v=bj_bUWxEYCw' },
  { label: 'vimeo', href: 'https://vimeo.com/user127961587' },
  { label: 'instagram', href: 'https://www.instagram.com/elfedete/' },
  { label: 'mixcloud', href: 'https://www.mixcloud.com/elfedete/' },
  { label: 'bandcamp', href: 'https://codesus.bandcamp.com/music' },
];

export type SectionId = 'performance' | 'sound' | 'interactive' | 'av';

/**
 * Each section owns a two-stop gradient. It shows up as the chip beside every
 * entry, as the wipe on hover, and as the field behind section titles.
 * These four pairs are the only saturated colour on the site.
 */
export const SECTIONS: {
  id: SectionId;
  n: string;
  label: string;
  aside: string;
  note: string;
  from: string;
  to: string;
}[] = [
  {
    id: 'performance',
    n: '01',
    label: 'performance',
    aside: '(live)',
    note: 'sets, radio broadcasts and durational work.',
    from: '#e2379b',
    to: '#ff7a5c',
  },
  {
    id: 'sound',
    n: '02',
    label: 'sound',
    aside: '(recorded)',
    note: 'composed and recorded pieces.',
    from: '#1b3bd4',
    to: '#00c2b2',
  },
  {
    id: 'interactive',
    n: '03',
    label: 'interactive / instalación',
    aside: '(in the room)',
    note: 'work that responds to the space and the people in it.',
    from: '#2fc46a',
    to: '#00b8d4',
  },
  {
    id: 'av',
    n: '04',
    label: 'audiovisual',
    aside: '(av)',
    note: 'video made with and for other artists.',
    from: '#7b3fd4',
    to: '#e2379b',
  },
];

export const sectionById = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;
