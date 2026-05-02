'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const ops = require(path.join(REPO_ROOT, 'ai-novel-studio', 'bin', 'lib', 'chapter_ops.cjs'));
const { CHAPTER_FRONTMATTER } = require(
  path.join(REPO_ROOT, 'ai-novel-studio', 'bin', 'lib', 'schemas.cjs')
);

function makeProjectFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ans-normtest-'));
  fs.mkdirSync(path.join(dir, 'chapters'), { recursive: true });
  return dir;
}

function writeChapter(root, n, lines) {
  fs.writeFileSync(
    path.join(root, 'chapters', `chapter-${n}.md`),
    lines.join('\n'),
    'utf8'
  );
}

function readChapter(root, n) {
  return fs.readFileSync(path.join(root, 'chapters', `chapter-${n}.md`), 'utf8');
}

test('chapter normalize: strips legacy "## 章节元数据" trailing sections', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---',
    'chapter: 1',
    'title: 楔子',
    'target_words: 2500',
    'hard_ceiling: 4000',
    'status: draft',
    'words: 2950',
    'budget_result: within_target',
    'created: 2025-01-01',
    'updated: 2025-01-01',
    '---',
    '',
    '# 第1章 楔子',
    '',
    '正文段落 A。',
    '',
    '正文段落 B。',
    '',
    '---',
    '',
    '## 章节元数据',
    '',
    '### 出场人物',
    '- 张三',
    '',
    '### 自检清单',
    '- [x] 完成',
  ]);

  const result = ops.normalizeChapter(root, 1, 'formal');
  assert.strictEqual(result.no_op, false, 'a dirty chapter should not be no_op');

  const content = readChapter(root, 1);
  assert.ok(content.includes('## 正文'), 'normalized file must contain ## 正文');
  assert.ok(content.includes('正文段落 A'), 'prose A must survive');
  assert.ok(content.includes('正文段落 B'), 'prose B must survive');
  assert.ok(!content.includes('## 章节元数据'), '## 章节元数据 must be stripped');
  assert.ok(!content.includes('### 出场人物'), '出场人物 trailing section must be stripped');
  assert.ok(!content.includes('### 自检清单'), '自检清单 trailing section must be stripped');
});

test('chapter normalize: preserves "## 章末钩子" when present as standalone section', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---',
    'chapter: 1',
    'title: 决断',
    'target_words: 2500',
    'hard_ceiling: 4000',
    'status: draft',
    'words: 0',
    'budget_result: within_target',
    'created: 2025-01-01',
    'updated: 2025-01-01',
    '---',
    '',
    '# 第1章 决断',
    '',
    '## 正文',
    '',
    '正文。',
    '',
    '## 章末钩子',
    '',
    '钩子内容。',
    '',
    '## 创作备注',
    '',
    '备注会被删除。',
  ]);

  ops.normalizeChapter(root, 1, 'formal');
  const content = readChapter(root, 1);
  assert.ok(content.includes('## 章末钩子'), '## 章末钩子 must be preserved');
  assert.ok(content.includes('钩子内容'), 'hook content must be preserved');
  assert.ok(!content.includes('## 创作备注'), '## 创作备注 must be stripped');
  assert.ok(!content.includes('备注会被删除'), 'creative notes content must be removed');
});

test('chapter normalize: strips forbidden frontmatter fields', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---',
    'chapter: 1',
    'title: 测试',
    'target_words: 2500',
    'hard_ceiling: 4000',
    'status: draft',
    'words: 0',
    'budget_result: within_target',
    'created: 2025-01-01',
    'updated: 2025-01-01',
    'characters: [张三, 李四]',
    'hooks: [门外的人]',
    'foreshadowing: [茶杯]',
    'timeline: 1980-05-12',
    '---',
    '',
    '# 第1章 测试',
    '',
    '## 正文',
    '正文',
  ]);

  ops.normalizeChapter(root, 1, 'formal');
  const content = readChapter(root, 1);
  for (const f of CHAPTER_FRONTMATTER.forbidden) {
    assert.ok(
      !new RegExp(`^${f}:`, 'm').test(content),
      `forbidden frontmatter field "${f}" must be stripped`
    );
  }
});

test('chapter normalize: idempotent on second run', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---',
    'chapter: 1',
    'title: 测试',
    'target_words: 2500',
    'hard_ceiling: 4000',
    'status: draft',
    'words: 0',
    'budget_result: within_target',
    'created: 2025-01-01',
    'updated: 2025-01-01',
    '---',
    '',
    '# 第1章',
    '',
    '## 章节元数据',
    '会被删除',
  ]);

  const r1 = ops.normalizeChapter(root, 1, 'formal');
  assert.strictEqual(r1.no_op, false, 'first pass must rewrite');
  const after1 = readChapter(root, 1);

  const r2 = ops.normalizeChapter(root, 1, 'formal');
  assert.strictEqual(r2.no_op, true, 'second pass must be a no-op');
  assert.strictEqual(r2.backup_path, null, 'no-op must not produce a backup');

  const after2 = readChapter(root, 1);
  assert.strictEqual(after1, after2, 'idempotent normalize must produce identical content');
});

test('chapter normalize: fills missing required frontmatter from defaults', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---',
    'chapter: 1',
    '---',
    '',
    '# 第1章',
    '',
    '一段正文。',
  ]);

  ops.normalizeChapter(root, 1, 'formal');
  const content = readChapter(root, 1);
  for (const required of CHAPTER_FRONTMATTER.required) {
    assert.ok(
      new RegExp(`^${required}:`, 'm').test(content),
      `required field "${required}" must be present after normalize`
    );
  }
});

test('chapter normalize: wraps legacy bare prose under ## 正文', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---',
    'chapter: 1',
    'title: 楔子',
    '---',
    '',
    '# 第1章 楔子',
    '',
    '> 故事时间：1980年',
    '',
    '裸正文段落 A。',
    '',
    '裸正文段落 B。',
    '',
    '---',
    '',
    '## 章节元数据',
    '会被删除',
  ]);

  ops.normalizeChapter(root, 1, 'formal');
  const content = readChapter(root, 1);
  assert.ok(content.includes('## 正文'), 'must inject ## 正文 heading');
  assert.ok(content.includes('裸正文段落 A'), 'prose A preserved');
  assert.ok(content.includes('裸正文段落 B'), 'prose B preserved');
  assert.ok(content.includes('> 故事时间：1980年'), '> note line preserved');
  assert.ok(
    content.indexOf('故事时间') < content.indexOf('## 正文'),
    '> notes must precede ## 正文'
  );
});

test('chapter normalize: dry-run does not write the file', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---',
    'chapter: 1',
    '---',
    '',
    '# 第1章',
    '',
    '## 章节元数据',
    '需要清理',
  ]);
  const before = readChapter(root, 1);

  const result = ops.normalizeChapter(root, 1, 'formal', { dryRun: true });
  assert.strictEqual(result.dry_run, true);

  const after = readChapter(root, 1);
  assert.strictEqual(before, after, 'dry-run must leave file untouched');
});

test('chapter normalize: backs up the original before overwriting', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---',
    'chapter: 1',
    '---',
    '',
    '# 第1章',
    '',
    '## 章节元数据',
    '需要备份',
  ]);

  const result = ops.normalizeChapter(root, 1, 'formal');
  assert.ok(result.backup_path, 'must produce a backup_path');
  assert.ok(fs.existsSync(result.backup_path), 'backup file must exist on disk');
  const backupContent = fs.readFileSync(result.backup_path, 'utf8');
  assert.ok(backupContent.includes('需要备份'), 'backup must contain pre-normalize content');
});

test('chapter normalize: emits required fields in canonical schema order', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---',
    'updated: 2025-01-01',
    'words: 0',
    'created: 2025-01-01',
    'budget_result: within_target',
    'hard_ceiling: 4000',
    'status: draft',
    'target_words: 2500',
    'title: 乱序',
    'chapter: 1',
    '---',
    '',
    '# 第1章 乱序',
    '',
    '## 正文',
    '正文',
  ]);

  ops.normalizeChapter(root, 1, 'formal');
  const content = readChapter(root, 1);
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert.ok(fmMatch, 'normalized file must have frontmatter');

  const keys = [];
  for (const line of fmMatch[1].split('\n')) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):/);
    if (m) keys.push(m[1]);
  }

  // The schema's required order should be a prefix of the emitted key order.
  const requiredKeys = CHAPTER_FRONTMATTER.required;
  assert.deepEqual(
    keys.slice(0, requiredKeys.length),
    requiredKeys,
    'emitted frontmatter must lead with CHAPTER_FRONTMATTER.required in declared order'
  );
});
