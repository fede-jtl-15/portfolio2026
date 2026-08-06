import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * One media item on a project page.
 *
 *   kind: vimeo      -> src is the numeric ID, e.g. "76979871"
 *   kind: youtube    -> src is the 11-char ID, e.g. "dQw4w9WgXcQ"
 *   kind: soundcloud -> src is the full track/set URL
 *   kind: bandcamp   -> src is the album/track ID from Bandcamp's embed code
 *   kind: audio      -> src is a path under /public, e.g. "/audio/baladi.mp3"
 *   kind: image      -> src is a path under /public, e.g. "/images/vistas-01.jpg"
 */
const media = z.object({
  kind: z.enum(['vimeo', 'youtube', 'soundcloud', 'bandcamp', 'audio', 'image']),
  src: z.string(),
  title: z.string().optional(),
  caption: z.string().optional(),
  alt: z.string().optional(),
  // Bandcamp only: the /track=123 part, when embedding a single track from an album
  track: z.string().optional(),
});

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string(),
    section: z.enum(['performance', 'sound', 'interactive', 'av']),
    // Shown in the index. Leave out and nothing renders.
    year: z.string().optional(),
    // Short noun phrase: "live set", "radio", "installation", "music video"
    format: z.string().optional(),
    // Collaborators, artists, venues
    credits: z.array(z.string()).default([]),
    // One or two sentences. Shown on the project page under the title.
    blurb: z.string().optional(),
    // Lower numbers sort first within a section. Ties fall back to title.
    order: z.number().default(100),
    // Marks a piece as in progress; renders a "WIP" tag.
    wip: z.boolean().default(false),
    // Hides the entry entirely from the built site.
    draft: z.boolean().default(false),
    media: z.array(media).default([]),
  }),
});

export const collections = { work };
