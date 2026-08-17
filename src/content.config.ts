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
    // Legacy — unused since the old per-section template was replaced by
    // Hub.astro/src/pages/work/[id].astro, kept optional rather than
    // removed so it isn't a required field new entries have to bother with.
    section: z.enum(['performance', 'sound', 'interactive', 'av']).optional(),
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
    // Set on a piece to make it one of a hub's sub-projects — the value is
    // the hub's own entry id (e.g. "co-de-sus"). src/pages/work/[id].astro
    // gathers every entry sharing its id here into the hub's submenu,
    // ordered by `order`. A hub's own folder/includeHubAsPiece (below) are
    // read from the HUB entry, not from its sub-pieces.
    hub: z.string().optional(),
    // Path under assets/ (not public/) to this entry's images/videos — see
    // the long note at the top of src/lib/hub-assets.ts for why sources
    // live outside public/. Required on a standalone piece or a hub's own
    // root entry. On a sub-piece (one with `hub` set above), only needed
    // when its real folder name doesn't match the default convention (its
    // id with the "<hub>-" prefix stripped and dashes turned to
    // underscores) — e.g. a folder with a literal space or a name that
    // otherwise doesn't line up with the id.
    folder: z.string().optional(),
    // Hub-root-only: also show the hub's own folder (not a sub-piece's) as
    // an extra "home" entry in its piece list, with the kicker itself
    // clickable to reach it — see includeHubAsPiece in src/components/Hub.astro.
    includeHubAsPiece: z.boolean().default(false),
    // Short override for how this entry's name appears in its category
    // listing, when that should differ from the full `title` shown on the
    // piece's own page (e.g. title "alondra máynez: ventus" but listed as
    // just "alondra máynez"). Falls back to `title` when unset.
    label: z.string().optional(),
    // Short labelled tag groups shown under the body copy, e.g.
    // { label: "sound", items: ["granular synthesis", "field recordings"] }.
    techniques: z.array(z.object({ label: z.string(), items: z.array(z.string()) })).default([]),
    // Plain outbound links — full URLs, not embed IDs (see `media` above for
    // that) — rendered on the .hub__social-nav row, each opening in a new
    // tab. `label` should be copied verbatim from public/text/_links/LINKS.txt
    // (e.g. "youtube", "soundcloud", "48nk", "research"), not invented —
    // whatever's written there is what's shown, no fixed set of platforms.
    links: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    // Path under public/text/ to this piece's plain-text source (see
    // src/lib/piece-text.ts) — when set, the page's body copy (and link
    // labels, once a piece has a *LINKS* section) come live from that file
    // instead of this entry's own markdown body below, which then only
    // matters as a fallback for pieces that don't have a real source file
    // yet.
    textFile: z.string().optional(),
  }),
});

export const collections = { work };
