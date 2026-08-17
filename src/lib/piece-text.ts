import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Reads a project's plain-text source straight from public/text/ — no
 * hand-transcribing into content/work/*.md needed. Edit the .txt file,
 * reload the page, the new copy is there.
 *
 * Convention (see the *LINKS* and *BODY* example the file's own author is
 * moving to):
 *   - A line that's just *SOMENAME* starts a new named section; everything
 *     after it belongs to that section until the next marker. A file with
 *     no markers at all is treated as one big *BODY* section, so older
 *     files written before this convention existed still work unchanged.
 *   - Anywhere else, *text like this* is an author's own note — stripped
 *     entirely, never shown on the page.
 *   - #text like this# is the one bit of real formatting the format
 *     supports — rendered a bit bolder.
 *   - Paragraphs are separated by one or more blank lines — exactly one
 *     blank line (a single gap) reads as a closer, "tight" break (a
 *     subheading-style line leading into its paragraph, say); two or more
 *     blank lines is a fuller break between paragraphs, same spacing as
 *     before this distinction existed.
 */

const TEXT_DIR = path.join(process.cwd(), 'public/text');

export interface PieceParagraph {
  html: string;
  /** True when only a single blank line separated this paragraph from the one before it — renders with a smaller gap above. */
  tight: boolean;
}

export interface PieceText {
  bodyParagraphs: PieceParagraph[];
  /** Display labels from the *LINKS* section, in the order they're written. */
  linkLabels: string[];
}

function splitSections(raw: string): Record<string, string> {
  const markerRe = /^\s*\*([a-zA-Z][a-zA-Z0-9 _-]*)\*\s*$/;
  const sections: Record<string, string[]> = {};
  let current = 'body';
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(markerRe);
    if (m) {
      current = m[1].trim().toLowerCase();
      sections[current] ??= [];
      continue;
    }
    (sections[current] ??= []).push(line);
  }
  const out: Record<string, string> = {};
  for (const [name, lines] of Object.entries(sections)) out[name] = lines.join('\n').trim();
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Order matters: escape real HTML characters first, THEN strip *notes* (a
// bare * from the source is untouched by escaping), THEN turn #bold# into
// real <strong> tags — otherwise those tags would just get escaped too.
function formatParagraph(raw: string): string {
  const escaped = escapeHtml(raw);
  const stripped = escaped.replace(/\*[^*]+\*/g, '');
  return stripped.replace(/#([^#]+)#/g, '<strong>$1</strong>').trim();
}

// Splits on runs of 2+ newlines (one or more blank lines), the same as a
// plain `.split(/\n{2,}/)` would, but keeps the runs themselves (the
// capturing group in the regex passed to .split keeps every delimiter as
// its own entry in the result, interleaved with the text either side of
// it) so each paragraph can be tagged with whether the gap immediately
// before it was exactly one blank line (2 newlines) or two-plus (3+).
function splitParagraphs(raw: string): PieceParagraph[] {
  const parts = raw.split(/(\n{2,})/);
  const paragraphs: PieceParagraph[] = [];
  let tight = false;
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      tight = parts[i].length === 2; // exactly one blank line between the text either side of it
      continue;
    }
    const html = formatParagraph(parts[i]);
    if (!html) continue;
    paragraphs.push({ html, tight });
  }
  return paragraphs;
}

export function getPieceText(relPath: string): PieceText | null {
  const filePath = path.join(TEXT_DIR, relPath);
  if (!existsSync(filePath)) return null;

  const raw = readFileSync(filePath, 'utf-8');
  if (!raw.trim()) return null;

  const sections = splitSections(raw);

  const bodyParagraphs = splitParagraphs(sections.body ?? '');

  const linkLabels = (sections.links ?? '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (bodyParagraphs.length === 0) return null;

  return { bodyParagraphs, linkLabels };
}
