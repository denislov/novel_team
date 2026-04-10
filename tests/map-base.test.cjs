const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, beforeEach, describe, test } = require('node:test');

const { main } = require('../scripts/map_base.cjs');

function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'map-base-'));
}

function write(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${content.trim()}\n`, 'utf8');
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function capture(method, fn) {
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

describe('map_base.cjs', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('basic import generates root layout', () => {
    write(path.join(tmpDir, '设定.md'), `
# 九河城项目设定
主角林渡，在九河城底层起家。
金手指是能看见交易风险的残缺账簿。
故事开始于天启三年初春。
`);
    write(path.join(tmpDir, '卷一第003章.md'), '# 卷一第003章\n林渡第一次看清赌桌上的风险线。');
    write(path.join(tmpDir, '第三回细纲.md'), '# 第三回细纲\n主角试探账簿能力。\n章末钩子：黑市真正的主人出现。');
    write(path.join(tmpDir, '角色设定-林渡.md'), `
---
name: 林渡
role: 主角
first_appearance: 第3章
---
# 角色设定：林渡
底层少年，心硬，算账快。
与主角关系：本人
目标：活下来并拿到入场券。
`);
    write(path.join(tmpDir, '故事年表.md'), '# 故事年表\n天启三年初春，林渡进入九河城黑市。');
    write(path.join(tmpDir, '第一卷总纲.md'), '# 第一卷总纲\n第一卷目标：活下来并拿到入场券。');

    const { exitCode } = capture('log', () => main([`--from=${tmpDir}`]));
    assert.strictEqual(exitCode, 0);
    assert.ok(fs.existsSync(path.join(tmpDir, 'PROJECT.md')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'CHARACTERS.md')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'TIMELINE.md')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'ROADMAP.md')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'STATE.md')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'chapters', 'chapter-3.md')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'chapters', 'outlines', 'outline-3.md')));
    assert.ok(fs.existsSync(path.join(tmpDir, 'characters', '林渡.md')));
    assert.match(read(path.join(tmpDir, 'PROJECT.md')), /title: 九河城/);
    assert.match(read(path.join(tmpDir, 'STATE.md')), /current_chapter: 3/);
    assert.match(read(path.join(tmpDir, 'ROADMAP.md')), /current_arc: 第一卷/);
  });

  test('merge uses existing chapters for state', () => {
    write(path.join(tmpDir, 'PROJECT.md'), '---\ntitle: 旧城账簿\n---\n# 《旧城账簿》项目设定');
    write(path.join(tmpDir, 'CHARACTERS.md'), '# 人物总表');
    write(path.join(tmpDir, 'TIMELINE.md'), '# 时间线');
    write(path.join(tmpDir, 'ROADMAP.md'), '# 第一卷总纲\n第一卷目标：站稳脚跟。');
    write(path.join(tmpDir, 'chapters', 'chapter-1.md'), '# 第1章\n旧章节内容。');
    write(path.join(tmpDir, '第2章黑市试探.md'), '# 第2章\n新导入章节。');

    const { exitCode } = capture('log', () => main([`--from=${tmpDir}`, '--merge']));
    assert.strictEqual(exitCode, 0);
    assert.match(read(path.join(tmpDir, 'STATE.md')), /current_chapter: 2/);
    assert.match(read(path.join(tmpDir, 'STATE.md')), /current_arc: 第一卷/);
    assert.ok(fs.existsSync(path.join(tmpDir, 'chapters', 'chapter-2.md')));
  });

  test('dry-run does not write files', () => {
    write(path.join(tmpDir, 'notes.md'), '# 设定\n主角顾沉，故事发生在现代都市。');
    const { exitCode, lines } = capture('log', () => main([`--from=${tmpDir}`, '--dry-run']));
    assert.strictEqual(exitCode, 0);
    assert.ok(!fs.existsSync(path.join(tmpDir, 'PROJECT.md')));
    assert.ok(!fs.existsSync(path.join(tmpDir, 'chapters')));
    assert.ok(!fs.existsSync(path.join(tmpDir, 'characters')));
    assert.ok(!fs.existsSync(path.join(tmpDir, 'research')));
    assert.ok(!fs.existsSync(path.join(tmpDir, 'reviews')));
    assert.ok(lines.join('\n').includes('would generate `PROJECT.md`'));
  });

  test('generic filename can still be classified from body', () => {
    write(path.join(tmpDir, 'notes.md'), '# 设定\n主角顾沉，金手指是一枚会预警的硬币。');
    write(path.join(tmpDir, 'chapter.txt'), '# 第5回\n顾沉第一次使用硬币。');
    write(path.join(tmpDir, 'outline.txt'), '# 第5回细纲\n章末钩子：旧敌现身。');

    const { exitCode, lines } = capture('log', () => main([`--from=${tmpDir}`, '--dry-run']));
    assert.strictEqual(exitCode, 0);
    const output = lines.join('\n');
    assert.ok(output.includes('project_source'));
    assert.ok(output.includes('chapter'));
    assert.ok(output.includes('outline'));
  });

  test('generated logs are not misclassified as reviews', () => {
    write(path.join(tmpDir, '设定.md'), '# 设定\n主角陆停，故事开始于现代。');
    write(path.join(tmpDir, 'dry-run.txt'), '# map-base Report\n\n- Source directory: /tmp/demo');

    const { exitCode, lines } = capture('log', () => main([`--from=${tmpDir}`, '--dry-run']));
    assert.strictEqual(exitCode, 0);
    const output = lines.join('\n');
    assert.ok(output.includes('ignored_generated'));
    assert.ok(!output.includes('reviews/dry-run.md'));
  });
});
