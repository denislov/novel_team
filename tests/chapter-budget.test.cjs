const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, beforeEach, describe, test } = require('node:test');

const { analyzeChapter, main, syncChapterMetadata } = require('../scripts/chapter_budget.cjs');

function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chapter-budget-'));
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content.trim()}\n`, 'utf8');
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function makeProject(root, extraProjectFrontmatter = '') {
  write(path.join(root, 'PROJECT.md'), `
---
title: 九河城
chapter_words: 3000
chapter_word_ceiling: 4000
${extraProjectFrontmatter}
---
# 《九河城》项目设定
`);
}

function captureOutput(fn, method = 'log') {
  const lines = [];
  const original = console[method];
  console[method] = (line) => lines.push(String(line));
  try {
    const exitCode = fn();
    return { exitCode, lines };
  } finally {
    console[method] = original;
  }
}

describe('chapter_budget.cjs', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('analyzeChapter counts only prose section for template-style chapter', () => {
    makeProject(tmpDir);
    write(path.join(tmpDir, 'chapters', 'draft', 'chapter-1-draft.md'), `
---
chapter: 1
title: 第一章
target_words: 3000
hard_ceiling: 4000
words: 0
---

# 第一章 起风

## 正文

天地玄黄

## 章末钩子

不要算我

## 创作备注

- 也不要算我
`);

    const result = analyzeChapter(tmpDir, 1, 'draft');
    assert.strictEqual(result.prose_chars, '天地玄黄'.length);
    assert.strictEqual(result.budget_status, 'within_target');
  });

  test('analyzeChapter supports legacy chapter format with metadata divider', () => {
    makeProject(tmpDir);
    write(path.join(tmpDir, 'chapters', 'draft', 'chapter-2-draft.md'), `
---
chapter: 2
title: 第二章
---

# 第二章 夜路

他推门进屋。
灯没亮，风先灌了进来。

---

## 章节元数据

### 字数统计
- 正文：999字
`);

    const result = analyzeChapter(tmpDir, 2, 'draft');
    assert.strictEqual(result.prose_chars, '他推门进屋。灯没亮，风先灌了进来。'.replace(/\s+/g, '').length);
  });

  test('gate fails when prose exceeds hard ceiling', () => {
    makeProject(tmpDir);
    write(path.join(tmpDir, 'chapters', 'draft', 'chapter-3-draft.md'), `
---
chapter: 3
title: 第三章
target_words: 3000
hard_ceiling: 4000
---

# 第三章 长夜

## 正文

${'字'.repeat(4001)}
`);

    const { exitCode, lines } = captureOutput(
      () => main(['gate', '--root', tmpDir, '--chapter', '3', '--source', 'draft']),
      'error'
    );
    assert.strictEqual(exitCode, 1);
    assert.ok(lines.some((line) => line.includes('exceeds hard ceiling')));
    const synced = read(path.join(tmpDir, 'chapters', 'draft', 'chapter-3-draft.md'));
    assert.match(synced, /^words:\s*4001$/m);
    assert.match(synced, /^budget_result:\s*split_required$/m);
  });

  test('syncChapterMetadata refreshes words and budget_result from prose count', () => {
    makeProject(tmpDir);
    write(path.join(tmpDir, 'chapters', 'draft', 'chapter-4-draft.md'), `
---
chapter: 4
title: 第四章
target_words: 10
hard_ceiling: 20
words: 999
budget_result: within_target
---

# 第四章 雨幕

## 正文

春雨来得急
`);

    const result = syncChapterMetadata(tmpDir, 4, 'draft');
    const synced = read(path.join(tmpDir, 'chapters', 'draft', 'chapter-4-draft.md'));

    assert.strictEqual(result.metadata_synced, true);
    assert.strictEqual(result.prose_chars, '春雨来得急'.length);
    assert.match(synced, /^words:\s*5$/m);
    assert.match(synced, /^budget_result:\s*within_target$/m);
  });

  test('sync command writes fresh metadata to frontmatter', () => {
    makeProject(tmpDir);
    write(path.join(tmpDir, 'chapters', 'draft', 'chapter-5-draft.md'), `
---
chapter: 5
title: 第五章
target_words: 3
hard_ceiling: 6
words: 0
budget_result: within_target
---

# 第五章 冷巷

## 正文

长街风冷
`);

    const { exitCode } = captureOutput(
      () => main(['sync', '--root', tmpDir, '--chapter', '5', '--source', 'draft']),
      'log'
    );
    assert.strictEqual(exitCode, 0);
    const synced = read(path.join(tmpDir, 'chapters', 'draft', 'chapter-5-draft.md'));
    assert.match(synced, /^words:\s*4$/m);
    assert.match(synced, /^budget_result:\s*near_ceiling$/m);
  });
});
