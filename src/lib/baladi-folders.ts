// Real per-episode image folders under assets/sound/baladi/ are named
// b1..b17 (no zero-padding), while every other convention on this
// site (content ids, the b001_TEXT.txt.. files) uses the padded
// baladi-b001..baladi-b017 — this maps one to the other for Hub's
// folderOverrides prop, shared across every baladi-*.astro page so the
// mapping only needs to change in one place if an episode's folder is ever
// renamed.
export const BALADI_EPISODE_COUNT = 17;

export const BALADI_FOLDERS: Record<string, string> = Object.fromEntries(
  Array.from({ length: BALADI_EPISODE_COUNT }, (_, i) => {
    const n = i + 1;
    return [`baladi-b${String(n).padStart(3, '0')}`, `b${n}`];
  }),
);
