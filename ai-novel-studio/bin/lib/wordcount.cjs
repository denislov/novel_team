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

module.exports = {
  countSingle,
  COUNT_BASIS,
};
