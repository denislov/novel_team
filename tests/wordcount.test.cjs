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

test('resolveScope handles single, range, all, and rejects garbage input', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, ['---', 'chapter: 1', '---', '', '# 第1章', '', '## 正文', '', 'A']);
  writeChapter(root, 2, ['---', 'chapter: 2', '---', '', '# 第2章', '', '## 正文', '', 'B']);
  writeChapter(root, 5, ['---', 'chapter: 5', '---', '', '# 第5章', '', '## 正文', '', 'C']);

  // Single
  const single = wordcount.resolveScope(root, { positional: '5', all: false });
  assert.strictEqual(single.scope, 'single');
  assert.deepEqual(single.requested, { chapters: [5] });

  // Range
  const range = wordcount.resolveScope(root, { positional: '1-3', all: false });
  assert.strictEqual(range.scope, 'range');
  assert.deepEqual(range.requested, { chapters: [1, 2, 3] });

  // All — walks chapters/ directory
  const all = wordcount.resolveScope(root, { positional: null, all: true });
  assert.strictEqual(all.scope, 'all');
  assert.deepEqual(all.requested, { chapters: [1, 2, 5] });

  // Garbage
  assert.throws(
    () => wordcount.resolveScope(root, { positional: 'abc', all: false }),
    /requires <N>, <N-M>, or --all/
  );
});

test('countSingle excludes fenced code blocks from prose count', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---', 'chapter: 1', '---', '',
    '# 第1章', '',
    '## 正文', '',
    '正常一段五字',
    '',
    '```',
    '这段代码不算字数因为在围栏内',
    '```',
    '',
    '又一段六个字。',
  ]);

  const result = wordcount.countSingle(root, 1, 'formal');
  // '正常一段五字' (6) + '又一段六个字。' (7) = 13
  assert.strictEqual(result.prose_chars, 13);
});

test('wordcount.countSingle and chapter_budget.analyzeChapter return identical prose_chars', () => {
  const root = makeProjectFixture();
  writeChapter(root, 7, [
    '---', 'chapter: 7', 'title: 综合测试', '---', '',
    '# 第7章 综合测试',
    '',
    '> 故事时间：1980年',
    '',
    '## 正文',
    '',
    '一段正文 *带强调* 和 [链接文字](https://example.com)。',
    '',
    '- 列表项一',
    '- 列表项二',
    '',
    '> 引文也算字数。',
    '',
    '```',
    '代码块不算',
    '```',
    '',
    '最后一段正文。',
  ]);

  const wc = wordcount.countSingle(root, 7, 'formal');
  const budget = chapterBudget.analyzeChapter(root, 7, 'formal');

  assert.strictEqual(
    wc.prose_chars, budget.prose_chars,
    'wordcount and chapter_budget MUST return the same prose_chars for the same input ' +
    '(they share the underlying extractProse/countVisibleCharacters algorithm; this test ' +
    'fails immediately if a future refactor lets them diverge)'
  );
});
