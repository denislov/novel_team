'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const wordcount = require(path.join(REPO_ROOT, 'ai-novel-studio', 'bin', 'lib', 'wordcount.cjs'));
const chapterBudget = require(path.join(REPO_ROOT, 'ai-novel-studio', 'bin', 'lib', 'chapter_budget.cjs'));

function makeProjectFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ans-wctest-'));
  fs.mkdirSync(path.join(dir, 'chapters'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'PROJECT.md'),
    '---\nchapter_words: 3000\nchapter_word_ceiling: 4000\n---\n', 'utf8');
  return dir;
}

function writeChapter(root, n, lines) {
  fs.writeFileSync(path.join(root, 'chapters', `chapter-${n}.md`), lines.join('\n'), 'utf8');
}

test('countSingle returns prose_chars, file_path, count_basis for a chapter with prose', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---',
    'chapter: 1',
    'title: 测试',
    '---',
    '',
    '# 第1章 测试',
    '',
    '## 正文',
    '',
    '一段正文，有十个字符。',
  ]);

  const result = wordcount.countSingle(root, 1, 'formal');
  assert.strictEqual(result.chapter, 1);
  assert.strictEqual(result.source, 'formal');
  assert.ok(result.file_path.endsWith('chapters/chapter-1.md'));
  assert.strictEqual(result.prose_chars, 11, '一段正文，有十个字符。 = 11 visible non-whitespace CJK chars');
  assert.strictEqual(result.count_basis, 'visible_non_whitespace_chars_in_prose');
});

test('countSingle throws when source file is missing', () => {
  const root = makeProjectFixture();
  // No chapter file created.
  assert.throws(
    () => wordcount.countSingle(root, 99, 'formal'),
    /not found/,
    'countSingle must throw when the source file does not exist'
  );
});

test('countBatch aggregates prose_chars across chapters and reports missing', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---', 'chapter: 1', '---', '',
    '# 第1章', '',
    '## 正文', '',
    '十个字符的正文测试',
  ]);
  writeChapter(root, 3, [
    '---', 'chapter: 3', '---', '',
    '# 第3章', '',
    '## 正文', '',
    '另外一段五字',
  ]);
  // chapter 2 deliberately absent

  const result = wordcount.countBatch(root, [1, 2, 3], 'formal');
  assert.strictEqual(result.chapters.length, 2, 'present chapters only in chapters[]');
  assert.strictEqual(result.missing.length, 1, 'absent chapter listed in missing[]');
  assert.strictEqual(result.missing[0].chapter, 2);
  assert.strictEqual(result.aggregate.chapter_count, 2);
  assert.strictEqual(result.aggregate.missing_count, 1);
  assert.strictEqual(
    result.aggregate.total_chars,
    result.chapters[0].prose_chars + result.chapters[1].prose_chars
  );
});

test('countBatch on empty input returns empty arrays and zero aggregate', () => {
  const root = makeProjectFixture();
  const result = wordcount.countBatch(root, [], 'formal');
  assert.deepEqual(result.chapters, []);
  assert.deepEqual(result.missing, []);
  assert.strictEqual(result.aggregate.chapter_count, 0);
  assert.strictEqual(result.aggregate.missing_count, 0);
  assert.strictEqual(result.aggregate.total_chars, 0);
});
