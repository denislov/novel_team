const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, beforeEach, describe, test } = require('node:test');

const {
  computeStats,
  main,
} = require('../plugins/novel/scripts/novel_state.cjs');

function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'novel-state-'));
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content.trim()}\n`, 'utf8');
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function makeProject(root) {
  write(path.join(root, 'PROJECT.md'), `
---
title: 九河城
story_format: long_form
planning_unit: chapter
---
# 《九河城》项目设定
`);
  write(path.join(root, 'ROADMAP.md'), `
---
current_arc: 第一卷
---
# 第一卷总纲
`);
  write(path.join(root, 'CHARACTERS.md'), '# 人物总表');
  write(path.join(root, 'TIMELINE.md'), '# 时间线');
  write(path.join(root, 'STATE.md'), `
---
project: 九河城
story_format: long_form
planning_unit: chapter
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

describe('novel_state.cjs', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('computeStats prefers first unwritten outline as next chapter', () => {
    makeProject(tmpDir);
    write(path.join(tmpDir, 'chapters', 'chapter-1.md'), '# 第1章\n正文一');
    write(path.join(tmpDir, 'chapters', 'outlines', 'outline-2.md'), '# 第2章大纲');
    write(path.join(tmpDir, 'chapters', 'outlines', 'outline-5.md'), '# 第5章大纲');

    const stats = computeStats(tmpDir);
    assert.strictEqual(stats.next_chapter, 2);
    assert.strictEqual(stats.recommended_command, 'write-chapter');
    assert.strictEqual(stats.recommended_args, '2');
  });

  test('computeStats keeps long-form as compatibility baseline', () => {
    makeProject(tmpDir);
    const stats = computeStats(tmpDir);
    assert.strictEqual(stats.story_format, 'long_form');
    assert.strictEqual(stats.planning_unit, 'chapter');
    assert.strictEqual(stats.recommended_command, 'plan-batch');
    assert.strictEqual(stats.recommended_args, '1-10');
  });

  test('computeStats uses lighter routing for short stories', () => {
    makeProject(tmpDir);
    write(path.join(tmpDir, 'PROJECT.md'), `
---
title: 雨夜短篇
story_format: short_story
planning_unit: story
---
# 《雨夜短篇》项目设定
`);
    const stats = computeStats(tmpDir);
    assert.strictEqual(stats.story_format, 'short_story');
    assert.strictEqual(stats.planning_unit, 'story');
    assert.strictEqual(stats.recommended_command, 'plan-batch');
    assert.strictEqual(stats.recommended_args, '1-1');
  });

  test('computeStats uses story-by-story routing for collections', () => {
    makeProject(tmpDir);
    write(path.join(tmpDir, 'PROJECT.md'), `
---
title: 夜航故事集
story_format: story_collection
planning_unit: story
---
# 《夜航故事集》项目设定
`);
    const stats = computeStats(tmpDir);
    assert.strictEqual(stats.story_format, 'story_collection');
    assert.strictEqual(stats.planning_unit, 'story');
    assert.strictEqual(stats.recommended_command, 'plan-batch');
    assert.strictEqual(stats.recommended_args, '1-1');
  });

  test('refresh updates STATE.md using node implementation', () => {
    makeProject(tmpDir);
    write(path.join(tmpDir, 'chapters', 'chapter-1.md'), '# 第1章\n正文一');
    write(path.join(tmpDir, 'chapters', 'outlines', 'outline-2.md'), '# 第2章大纲');
    write(path.join(tmpDir, 'chapters', 'outlines', 'outline-3.md'), '# 第3章大纲');

    const exitCode = main(['refresh', '--root', tmpDir]);
    assert.strictEqual(exitCode, 0);

    const state = read(path.join(tmpDir, 'STATE.md'));
    assert.match(state, /\| 当前章节 \| 第1章 \|/);
    assert.match(state, /\| 下一目标 \| 第2章规划或核对 \|/);
    assert.match(state, /\| 第2章 \| 第2章大纲 \| 待整理 \| 待整理 \| 待写作 \|/);
  });

  test('write-target resolves --next from state snapshot', () => {
    makeProject(tmpDir);
    write(path.join(tmpDir, 'chapters', 'chapter-1.md'), '# 第1章\n正文一');
    write(path.join(tmpDir, 'chapters', 'outlines', 'outline-2.md'), '# 第2章大纲');

    const stdout = [];
    const originalLog = console.log;
    console.log = (line) => stdout.push(String(line));
    try {
      const exitCode = main(['write-target', '--root', tmpDir, '--next', '--json']);
      assert.strictEqual(exitCode, 0);
    } finally {
      console.log = originalLog;
    }

    const data = JSON.parse(stdout.join('\n'));
    assert.strictEqual(data.target_chapter, 2);
    assert.strictEqual(data.outline_exists, true);
    assert.strictEqual(data.previous_exists, true);
  });

  test('range-target rejects reversed ranges', () => {
    makeProject(tmpDir);

    const stderr = [];
    const originalError = console.error;
    console.error = (line) => stderr.push(String(line));
    try {
      const exitCode = main(['range-target', '--root', tmpDir, '--kind', 'plan', '--range', '10-2']);
      assert.strictEqual(exitCode, 1);
    } finally {
      console.error = originalError;
    }

    assert.ok(stderr.some((line) => line.includes('range start must be <= end')));
  });
});
