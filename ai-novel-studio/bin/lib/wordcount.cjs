#!/usr/bin/env node

/**
 * wordcount — Reliable prose-only character counting for chapters.
 *
 * Re-uses extractProse / sanitizeProse / countVisibleCharacters from
 * chapter_budget.cjs (single algorithm source). This module owns scope
 * resolution (single / range / all) and aggregation across multiple chapters.
 */

const path = require('node:path');

const chapterBudget = require('./chapter_budget.cjs');
const { artifactPaths } = require('./chapter_ops.cjs');
const { chapterFiles, chapterNumberFromName, fileExists, readText } = require('./core.cjs');

const COUNT_BASIS = 'visible_non_whitespace_chars_in_prose';

function countSingle(root, chapter, source) {
  const paths = artifactPaths(root, chapter);
  const filePath = paths[source];
  if (!filePath) {
    throw new Error(`unknown source: ${source}`);
  }
  if (!fileExists(filePath)) {
    throw new Error(`${source} chapter ${chapter} not found: ${filePath}`);
  }
  const text = readText(filePath);
  const prose = chapterBudget.extractProse(text);
  const proseChars = chapterBudget.countVisibleCharacters(prose);
  return {
    chapter,
    source,
    file_path: path.relative(root, filePath),
    prose_chars: proseChars,
    count_basis: COUNT_BASIS,
  };
}

function countBatch(root, chapterNumbers, source) {
  const chapters = [];
  const missing = [];
  for (const chapter of chapterNumbers) {
    try {
      chapters.push(countSingle(root, chapter, source));
    } catch (e) {
      const paths = artifactPaths(root, chapter);
      missing.push({
        chapter,
        source,
        file_path: paths[source] ? path.relative(root, paths[source]) : null,
      });
    }
  }
  const totalChars = chapters.reduce((sum, c) => sum + c.prose_chars, 0);
  return {
    chapters,
    missing,
    aggregate: {
      chapter_count: chapters.length,
      missing_count: missing.length,
      total_chars: totalChars,
    },
  };
}

function resolveScope(root, { positional, all }) {
  if (all) {
    const files = chapterFiles(root);
    const chapters = files
      .map((f) => chapterNumberFromName(path.basename(f), 'chapter'))
      .filter((n) => Number.isInteger(n))
      .sort((a, b) => a - b);
    return { scope: 'all', requested: { chapters } };
  }
  if (typeof positional === 'string' && /^\d+$/.test(positional)) {
    return { scope: 'single', requested: { chapters: [Number.parseInt(positional, 10)] } };
  }
  if (typeof positional === 'string' && /^\d+-\d+$/.test(positional)) {
    const [startStr, endStr] = positional.split('-');
    const start = Number.parseInt(startStr, 10);
    const end = Number.parseInt(endStr, 10);
    if (end < start) {
      throw new Error(`chapter wordcount range invalid: ${positional} (end < start)`);
    }
    const chapters = [];
    for (let n = start; n <= end; n += 1) chapters.push(n);
    return { scope: 'range', requested: { chapters } };
  }
  throw new Error('chapter wordcount requires <N>, <N-M>, or --all');
}

module.exports = {
  countSingle,
  countBatch,
  resolveScope,
  COUNT_BASIS,
};
