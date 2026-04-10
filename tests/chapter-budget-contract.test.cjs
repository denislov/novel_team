const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('write-chapter workflow passes explicit chapter budget to planner and writer', () => {
  const workflow = read('workflows/write-chapter.md');
  const command = read('commands/write-chapter.md');
  const script = read('scripts/chapter_budget.cjs');

  assert.ok(workflow.includes('CHAPTER_WORD_BUDGET'));
  assert.ok(workflow.includes('CHAPTER_WORD_CEILING'));
  assert.ok(workflow.includes('chapter_word_budget: CHAPTER_WORD_BUDGET'));
  assert.ok(workflow.includes('chapter_word_ceiling: CHAPTER_WORD_CEILING'));
  assert.ok(workflow.includes('budget_result = split_required'));
  assert.ok(workflow.includes('scripts/chapter_budget.cjs gate'));
  assert.ok(command.includes('@scripts/chapter_budget.cjs'));
  assert.ok(script.includes("['inspect', 'gate', 'sync']"));
  assert.ok(script.includes("replaceOrAppendFrontmatterLine(frontmatter, 'words'"));
  assert.ok(script.includes("replaceOrAppendFrontmatterLine(frontmatter, 'budget_result'"));
});

test('planner and writer encode overflow split contracts', () => {
  const planner = read('agents/novel-planner.md');
  const writer = read('agents/novel-writer.md');
  const outlineTemplate = read('templates/CHAPTER-OUTLINE.md');
  const chapterTemplate = read('templates/CHAPTER.md');

  for (const content of [planner, writer, outlineTemplate]) {
    assert.ok(content.includes('must_land'));
    assert.ok(content.includes('can_rollover'));
    assert.ok(content.includes('split_point'));
  }

  assert.ok(planner.includes('控制单章预算'));
  assert.ok(planner.includes('超过硬上限'));
  assert.ok(writer.includes('60%'));
  assert.ok(writer.includes('80%'));
  assert.ok(writer.includes('90%'));
  assert.ok(writer.includes('split_required'));
  assert.ok(chapterTemplate.includes('budget_result'));
});
