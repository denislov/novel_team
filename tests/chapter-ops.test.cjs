const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, beforeEach, describe, test } = require('node:test');

const { main } = require('../scripts/chapter_ops.cjs');

function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'chapter-ops-'));
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content.trim()}\n`, 'utf8');
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function makeProject(root) {
  write(path.join(root, 'PROJECT.md'), '---\ntitle: 九河城\n---\n# 《九河城》项目设定');
  write(path.join(root, 'ROADMAP.md'), '---\ncurrent_arc: 第一卷\n---\n# 第一卷总纲');
  write(path.join(root, 'CHARACTERS.md'), '# 人物总表');
  write(path.join(root, 'TIMELINE.md'), '# 时间线');
  write(path.join(root, 'STATE.md'), `
---
project: 九河城
status: 规划中
current_arc: 第一卷
current_chapter: 0
total_words: 0
last_updated: 2026-03-31
---

# 当前状态

## 进度快照

| 项目 | 当前值 |
|------|--------|
| 当前卷 | 第一卷 |
| 当前章节 | 第0章 |
| 总字数 | 0 |
| 最新完成内容 | 新建项目 |
| 下一目标 | 第1章大纲 |

## 接下来 3 章

| 章节 | 任务 | 目标情绪 | 关键人物 | 状态 |
|------|------|----------|----------|------|
| 第1章 | 待规划 | 待整理 | 待整理 | 未开始 |
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

describe('chapter_ops.cjs', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('use-draft promotes formal chapter and refreshes state', () => {
    makeProject(tmpDir);
    write(path.join(tmpDir, 'chapters', 'draft', 'chapter-1-draft.md'), '# 第1章\n正文一');

    const { exitCode } = captureOutput(() => main(['use-draft', '--root', tmpDir, '--chapter', '1']), 'log');
    assert.strictEqual(exitCode, 0);
    assert.ok(fs.existsSync(path.join(tmpDir, 'chapters', 'chapter-1.md')));
    assert.match(read(path.join(tmpDir, 'STATE.md')), /current_chapter: 1/);
  });

  test('apply-polish backs up existing formal chapter', () => {
    makeProject(tmpDir);
    write(path.join(tmpDir, 'chapters', 'chapter-2.md'), '# 第2章\n旧正文');
    write(path.join(tmpDir, 'chapters', 'draft', 'chapter-2-polished.md'), '# 第2章\n新正文');

    const { exitCode, lines } = captureOutput(
      () => main(['apply-polish', '--root', tmpDir, '--chapter', '2', '--force']),
      'log'
    );
    assert.strictEqual(exitCode, 0);
    const data = JSON.parse(lines.join('\n'));
    assert.match(read(path.join(tmpDir, 'chapters', 'chapter-2.md')), /新正文/);
    assert.ok(data.backup_path);
    assert.ok(fs.existsSync(data.backup_path));
  });

  test('inspect reports artifact availability', () => {
    makeProject(tmpDir);
    write(path.join(tmpDir, 'chapters', 'draft', 'chapter-3-draft.md'), '# 第3章\n草稿');

    const { exitCode, lines } = captureOutput(
      () => main(['inspect', '--root', tmpDir, '--chapter', '3', '--json']),
      'log'
    );
    assert.strictEqual(exitCode, 0);
    const data = JSON.parse(lines.join('\n'));
    assert.strictEqual(data.draft_exists, true);
    assert.strictEqual(data.formal_exists, false);
  });

  test('use-draft without force rejects existing formal chapter', () => {
    makeProject(tmpDir);
    write(path.join(tmpDir, 'chapters', 'chapter-1.md'), '# 第1章\n正文');
    write(path.join(tmpDir, 'chapters', 'draft', 'chapter-1-draft.md'), '# 第1章\n新正文');

    const { exitCode, lines } = captureOutput(
      () => main(['use-draft', '--root', tmpDir, '--chapter', '1']),
      'error'
    );
    assert.strictEqual(exitCode, 1);
    assert.ok(lines.some((line) => line.includes('formal chapter already exists')));
  });
});
