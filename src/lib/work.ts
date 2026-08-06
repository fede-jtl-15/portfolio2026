import { getCollection, type CollectionEntry } from 'astro:content';
import type { SectionId } from './site';

export async function getWork(section?: SectionId) {
  const all = await getCollection('work', ({ data }) => !data.draft);
  const filtered = section ? all.filter((e) => e.data.section === section) : all;
  return filtered.sort(sortWork);
}

function sortWork(a: CollectionEntry<'work'>, b: CollectionEntry<'work'>) {
  if (a.data.order !== b.data.order) return a.data.order - b.data.order;
  return a.data.title.localeCompare(b.data.title, 'es');
}
