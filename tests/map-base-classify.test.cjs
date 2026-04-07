const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, beforeEach, describe, test } = require('node:test');

const { classifyFile, inferCharacterName } = require('../plugins/novel/scripts/map_base/classify.cjs');
const { scanCandidates } = require('../plugins/novel/scripts/map_base.cjs');

function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'map-base-classify-'));
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content.trim()}\n`, 'utf8');
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

describe('map_base classification', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('classifies chapter by chapter number in body', () => {
    const filePath = path.join(tmpDir, 'chapter.txt');
    write(filePath, '# 第5回\n顾沉第一次使用硬币。');
    const result = classifyFile(filePath, tmpDir, readText);
    assert.strictEqual(result.kind, 'chapter');
    assert.strictEqual(result.chapter, 5);
  });

  test('classifies outline when chapter signal and outline keywords coexist', () => {
    const filePath = path.join(tmpDir, 'outline.txt');
    write(filePath, '# 第5回细纲\n章末钩子：旧敌现身。');
    const result = classifyFile(filePath, tmpDir, readText);
    assert.strictEqual(result.kind, 'outline');
    assert.strictEqual(result.chapter, 5);
  });

  test('classifies review from review body signals', () => {
    const filePath = path.join(tmpDir, 'notes.md');
    write(filePath, '# 审核记录\n审核结果：时间线存在冲突。\n建议修改：补齐日期。');
    const result = classifyFile(filePath, tmpDir, readText);
    assert.strictEqual(result.kind, 'review');
  });

  test('infers character card from frontmatter name and keywords', () => {
    const filePath = path.join(tmpDir, '角色设定-林渡.md');
    write(filePath, '---\nname: 林渡\n---\n# 角色设定：林渡\n底层少年。');
    const result = classifyFile(filePath, tmpDir, readText);
    assert.strictEqual(result.kind, 'character_card');
    assert.strictEqual(result.entity_name, '林渡');
  });

  test('classifies character index separately from character cards', () => {
    const filePath = path.join(tmpDir, '人物总表.md');
    write(filePath, '# 人物总表\n林渡，苏清，顾沉');
    const result = classifyFile(filePath, tmpDir, readText);
    assert.strictEqual(result.kind, 'characters_index');
  });

  test('classifies project source from strong title and concept signals', () => {
    const filePath = path.join(tmpDir, '设定.md');
    write(filePath, '# 九河城项目设定\n主角林渡，在九河城底层起家。\n金手指是能看见交易风险的残缺账簿。');
    const result = classifyFile(filePath, tmpDir, readText);
    assert.strictEqual(result.kind, 'project_source');
    assert.ok(result.reason.includes('设定信号') || result.reason.includes('核心设定'));
  });

  test('does not misclassify generic engineering docs as project source', () => {
    const filePath = path.join(tmpDir, '开发说明.md');
    write(filePath, '# 开发说明\n本项目使用 Node.js 20。\n测试命令为 npm test。');
    const result = classifyFile(filePath, tmpDir, readText);
    assert.strictEqual(result.kind, 'unknown');
  });

  test('ignores generated map-base reports', () => {
    const filePath = path.join(tmpDir, 'dry-run.txt');
    write(filePath, '# map-base Report\n\n- Source directory: /tmp/demo');
    const result = classifyFile(filePath, tmpDir, readText);
    assert.strictEqual(result.kind, 'ignored_generated');
  });

  test('scanCandidates ignores .planning subtree', () => {
    write(path.join(tmpDir, '.planning', 'codebase', 'ARCHITECTURE.md'), '# Architecture\n路线图');
    write(path.join(tmpDir, '设定.md'), '# 设定\n主角陆停，故事开始于现代。');
    const results = scanCandidates(tmpDir);
    assert.strictEqual(results.some((item) => item.rel.includes('.planning/')), false);
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].rel, '设定.md');
  });

  test('inferCharacterName returns null for generic names', () => {
    const filePath = path.join(tmpDir, '人物卡.md');
    write(filePath, '# 人物卡');
    assert.strictEqual(inferCharacterName(readText(filePath), filePath), null);
  });
});
