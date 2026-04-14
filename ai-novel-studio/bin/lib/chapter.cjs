/**
 * Chapter — Chapter operations and budget management for ANS
 *
 * Combines lib/chapter_ops.cjs and lib/chapter_budget.cjs functionality
 * with structured JSON output for workflow consumption.
 */

const path = require('node:path');
const core = require('./core.cjs');
const chapterOps = require('./chapter_ops.cjs');
const chapterBudget = require('./chapter_budget.cjs');

// ─── CLI Commands ─────────────────────────────────────────────────────────────

/**
 * chapter inspect <N> — Inspect chapter file status.
 */
function cmdChapterInspect(root, chapter, raw) {
  if (!chapter || isNaN(Number(chapter))) {
    core.error('chapter inspect requires a chapter number');
  }
  const result = chapterOps.inspectChapter(root, Number(chapter));
  core.output(result, raw);
}

/**
 * chapter list — List all chapters with their status.
 */
function cmdChapterList(root, raw) {
  const chapters = core.chapterFiles(root);
  const outlines = core.outlineFiles(root);
  const reviews = core.reviewFiles(root);

  const chapterNums = chapters.map(f => core.chapterNumberFromName(path.basename(f), 'chapter')).filter(Boolean);
  const outlineNums = outlines.map(f => core.chapterNumberFromName(path.basename(f), 'outline')).filter(Boolean);
  const reviewNums = reviews.map(f => core.chapterNumberFromName(path.basename(f), 'review')).filter(Boolean);

  // Gather all chapter numbers
  const allNums = [...new Set([...chapterNums, ...outlineNums, ...reviewNums])].sort((a, b) => a - b);

  const rows = allNums.map(num => ({
    chapter: num,
    has_outline: outlineNums.includes(num),
    has_chapter: chapterNums.includes(num),
    has_review: reviewNums.includes(num),
    status: chapterNums.includes(num)
      ? (reviewNums.includes(num) ? 'reviewed' : 'written')
      : (outlineNums.includes(num) ? 'planned' : 'unknown'),
  }));

  core.output({
    total_chapters: chapterNums.length,
    total_outlines: outlineNums.length,
    total_reviews: reviewNums.length,
    chapters: rows,
  }, raw);
}

/**
 * chapter budget <N> — Analyze chapter word budget.
 */
function cmdChapterBudget(root, chapter, source, raw) {
  if (!chapter || isNaN(Number(chapter))) {
    core.error('chapter budget requires a chapter number');
  }
  const result = chapterBudget.analyzeChapter(root, Number(chapter), source || 'formal');
  core.output(result, raw);
}

/**
 * chapter budget-sync <N> — Sync budget metadata to chapter frontmatter.
 */
function cmdChapterBudgetSync(root, chapter, source, raw) {
  if (!chapter || isNaN(Number(chapter))) {
    core.error('chapter budget-sync requires a chapter number');
  }
  const result = chapterBudget.syncChapterMetadata(root, Number(chapter), source || 'formal');
  core.output(result, raw);
}

/**
 * chapter promote <N> --source <draft|quick|polished> — Promote draft to formal.
 */
function cmdChapterPromote(root, chapter, sourceKey, force, dryRun, raw) {
  if (!chapter || isNaN(Number(chapter))) {
    core.error('chapter promote requires a chapter number');
  }
  if (!sourceKey) sourceKey = 'draft';
  const result = chapterOps.promote(root, Number(chapter), sourceKey, force, dryRun);
  core.output(result, raw);
}

/**
 * chapter paths <N> — Get all artifact paths for a chapter.
 */
function cmdChapterPaths(root, chapter, raw) {
  if (!chapter || isNaN(Number(chapter))) {
    core.error('chapter paths requires a chapter number');
  }
  const paths = chapterOps.artifactPaths(root, Number(chapter));
  const exists = {};
  for (const [key, filePath] of Object.entries(paths)) {
    exists[`${key}_exists`] = core.fileExists(filePath);
  }
  core.output({ chapter: Number(chapter), ...paths, ...exists }, raw);
}

module.exports = {
  cmdChapterInspect,
  cmdChapterList,
  cmdChapterBudget,
  cmdChapterBudgetSync,
  cmdChapterPromote,
  cmdChapterPaths,
};
