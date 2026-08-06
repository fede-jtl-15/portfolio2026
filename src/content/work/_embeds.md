---
title: Embed reference
section: sound
draft: true
blurb: How to embed each kind of media. Set draft to false to preview this page, then set it back.
media:
  # Vimeo — src is the number at the end of the URL.
  #   https://vimeo.com/824804225  ->  src: "824804225"
  - kind: vimeo
    src: "PASTE_VIMEO_ID"
    title: Vimeo
    caption: 16:9, lazy loaded, Do Not Track on.

  # YouTube — src is the 11-character id.
  #   https://youtu.be/dQw4w9WgXcQ  ->  src: "dQw4w9WgXcQ"
  - kind: youtube
    src: "PASTE_YOUTUBE_ID"
    title: YouTube
    caption: Served from youtube-nocookie.com.

  # SoundCloud — src is the full public URL of the track or playlist.
  - kind: soundcloud
    src: "https://soundcloud.com/your-name/your-track"
    title: SoundCloud
    caption: Player colour follows the site's signal blue.

  # Bandcamp — from the album's Share/Embed code, copy the number after
  #   `album=`. For a single track, also copy the number after `track=`.
  - kind: bandcamp
    src: "PASTE_ALBUM_ID"
    track: "PASTE_TRACK_ID"
    title: Bandcamp

  # A file you host yourself. Put it in public/audio/ and reference it
  # from the site root. Keep these under ~10 MB.
  - kind: audio
    src: "/audio/example.mp3"
    title: Hosted audio

  # An image. Put it in public/images/ and always write alt text.
  - kind: image
    src: "/images/example.jpg"
    alt: "Description of what is in the picture."
    title: Image
---

This page never appears on the live site — `draft: true` keeps it out of the
index and out of the build. To look at it while you work, change `draft` to
`false`, run `npm run dev`, and visit `/work/_embeds`. Change it back when
you're done.

## Adding a new piece

Copy any file in `src/content/work/`, rename it, and edit the frontmatter. The
filename becomes the URL: `vistas.md` becomes `/work/vistas`. Use lowercase and
hyphens, no spaces.

The `section` field decides where it appears, and must be one of
`performance`, `sound`, `interactive`, or `av`. Anything else fails the build
with a clear error, which is the point — you can't publish a broken page by
accident.

`order` controls position within a section, lowest first.
