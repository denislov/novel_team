const path = require('node:path');
const { normalizeSlug } = require('./parse.cjs');

function resolveCopyDestination(sourceDir, candidate, usedDestinations) {
  if (candidate.kind === 'chapter') return path.join(sourceDir, 'chapters', `chapter-${candidate.chapter}.md`);
  if (candidate.kind === 'outline') return path.join(sourceDir, 'chapters', 'outlines', `outline-${candidate.chapter}.md`);
  if (candidate.kind === 'character_card') {
    const base = normalizeSlug(candidate.entity_name || path.basename(candidate.source, path.extname(candidate.source)));
    let destination = path.join(sourceDir, 'characters', `${base}.md`);
    let counter = 2;
    while (usedDestinations.has(destination)) {
      destination = path.join(sourceDir, 'characters', `${base}-${counter}.md`);
      counter += 1;
    }
    return destination;
  }
  if (candidate.kind === 'research') {
    const base = normalizeSlug(path.basename(candidate.source, path.extname(candidate.source)));
    let destination = path.join(sourceDir, 'research', `${base}.md`);
    let counter = 2;
    while (usedDestinations.has(destination)) {
      destination = path.join(sourceDir, 'research', `${base}-${counter}.md`);
      counter += 1;
    }
    return destination;
  }
  if (candidate.kind === 'review') {
    const base = normalizeSlug(path.basename(candidate.source, path.extname(candidate.source)));
    let destination = path.join(sourceDir, 'reviews', `${base}.md`);
    let counter = 2;
    while (usedDestinations.has(destination)) {
      destination = path.join(sourceDir, 'reviews', `${base}-${counter}.md`);
      counter += 1;
    }
    return destination;
  }
  return null;
}

function buildCopyPlan(sourceDir, actionable) {
  const planned = [];
  const unresolved = [];
  const usedDestinations = new Set();
  const chapterDestinations = new Map();

  for (const candidate of actionable.slice().sort((a, b) => (b.confidence - a.confidence) || a.rel.localeCompare(b.rel))) {
    const destination = resolveCopyDestination(sourceDir, candidate, usedDestinations);
    if (!destination) continue;
    if ((candidate.kind === 'chapter' || candidate.kind === 'outline') && chapterDestinations.has(destination)) {
      unresolved.push(`章节冲突：\`${candidate.rel}\` 与 \`${chapterDestinations.get(destination).rel}\` 都映射到 \`${path.relative(sourceDir, destination).split(path.sep).join('/')}\``);
      continue;
    }
    if (candidate.kind === 'chapter' || candidate.kind === 'outline') chapterDestinations.set(destination, candidate);
    usedDestinations.add(destination);
    planned.push({ source: candidate.source, destination, kind: candidate.kind, mode: 'copy', reason: candidate.reason });
  }

  return { planned, unresolved };
}

module.exports = {
  buildCopyPlan,
  resolveCopyDestination,
};
