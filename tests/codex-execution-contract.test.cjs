const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, beforeEach, test } = require('node:test');

const { installRuntime } = require('../bin/install.js');

function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'novel-codex-contract-'));
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

let tmpDir;

beforeEach(() => {
  tmpDir = mkTempDir();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test('generated Codex public skills encode required named-agent contracts', () => {
  installRuntime({
    runtime: 'codex',
    isGlobal: true,
    explicitConfigDir: tmpDir,
  });

  const writeChapterSkill = read(path.join(tmpDir, 'skills', 'novel-write-chapter', 'SKILL.md'));
  const newProjectSkill = read(path.join(tmpDir, 'skills', 'novel-new-project', 'SKILL.md'));

  assert.ok(writeChapterSkill.includes('## C1. Required Named Agents'));
  assert.ok(writeChapterSkill.includes('`novel-planner`'));
  assert.ok(writeChapterSkill.includes('`novel-writer`'));
  assert.ok(writeChapterSkill.includes('`novel-editor`'));
  assert.ok(writeChapterSkill.includes('`novel-verifier`'));
  assert.ok(writeChapterSkill.includes('Do not inline delegated stages'));
  assert.ok(writeChapterSkill.includes('validate --codex --global'));

  assert.ok(newProjectSkill.includes('## C1. Required Named Agents'));
  assert.ok(newProjectSkill.includes('`novel-architect`'));
  assert.ok(newProjectSkill.includes('Conditional agents declared by the workflow:'));
  assert.ok(newProjectSkill.includes('`novel-researcher`'));
});
