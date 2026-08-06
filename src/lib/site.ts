export const SITE = {
  name: 'federico torres',
  role: 'sound, performance, audiovisual',
  description: 'live sets, radio, installations and audiovisual work.',
  email: 'hello@example.com',
};

export const SOCIALS = [
  { label: 'instagram', href: 'https://instagram.com/' },
  { label: 'soundcloud', href: 'https://soundcloud.com/' },
  { label: 'bandcamp', href: 'https://bandcamp.com/' },
  { label: 'vimeo', href: 'https://vimeo.com/' },
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
