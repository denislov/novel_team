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
