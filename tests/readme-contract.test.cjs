const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('README documents Codex installation-vs-execution contract and repair path', () => {
  const readme = read('plugins/novel/README.md');

  assert.ok(readme.includes('installation correctness'));
  assert.ok(readme.includes('execution correctness'));
  assert.ok(readme.includes('SpawnAgent(...)'));
  assert.ok(readme.includes('named agents'));
  assert.ok(readme.includes('validate --codex --global'));
  assert.ok(readme.includes('long-form compatibility remains the baseline'));
});
