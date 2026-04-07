const assert = require('node:assert');
const path = require('node:path');
const { describe, test } = require('node:test');

const { buildCopyPlan, resolveCopyDestination } = require('../plugins/novel/scripts/map_base/resolve.cjs');

describe('map_base resolve', () => {
  test('resolveCopyDestination maps chapter and outline targets deterministically', () => {
    const root = '/tmp/demo';
    assert.strictEqual(
      resolveCopyDestination(root, { kind: 'chapter', chapter: 3 }, new Set()),
      path.join(root, 'chapters', 'chapter-3.md')
    );
    assert.strictEqual(
      resolveCopyDestination(root, { kind: 'outline', chapter: 7 }, new Set()),
      path.join(root, 'chapters', 'outlines', 'outline-7.md')
    );
  });

  test('resolveCopyDestination deduplicates character-card targets', () => {
    const root = '/tmp/demo';
    const used = new Set([path.join(root, 'characters', '林渡.md')]);
    const destination = resolveCopyDestination(root, {
      kind: 'character_card',
      entity_name: '林渡',
      source: path.join(root, '角色设定-林渡.md'),
    }, used);
    assert.strictEqual(destination, path.join(root, 'characters', '林渡-2.md'));
  });

  test('buildCopyPlan reports conflicting chapter destinations', () => {
    const root = '/tmp/demo';
    const actionable = [
      { rel: '第3章.md', source: path.join(root, '第3章.md'), kind: 'chapter', chapter: 3, confidence: 90, reason: '检测到章节号' },
      { rel: '卷一第003章.md', source: path.join(root, '卷一第003章.md'), kind: 'chapter', chapter: 3, confidence: 90, reason: '检测到章节号' },
    ];
    const result = buildCopyPlan(root, actionable);
    assert.strictEqual(result.planned.length, 1);
    assert.strictEqual(result.unresolved.length, 1);
    assert.ok(result.unresolved[0].includes('章节冲突'));
  });
});
