const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, beforeEach, test } = require('node:test');

const { installRuntime } = require('../bin/install.js');

function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'novel-codex-routing-'));
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

test('Codex safe path stays on explicit public $novel-* skills', () => {
  installRuntime({
    runtime: 'codex',
    isGlobal: true,
    explicitConfigDir: tmpDir,
  });

  const publicSkillsDir = path.join(tmpDir, 'skills');
  const installedReadme = read(path.join(tmpDir, 'novel', 'README.md'));

  assert.ok(fs.existsSync(path.join(publicSkillsDir, 'novel-write-chapter', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(publicSkillsDir, 'novel-review', 'SKILL.md')));
  assert.ok(!fs.existsSync(path.join(publicSkillsDir, 'novel-command-center')));
  assert.ok(installedReadme.includes('In Codex, use skills rather than slash commands:'));
  assert.ok(installedReadme.includes('$novel-write-chapter'));
  assert.ok(installedReadme.includes('The supported safe path in Codex is the explicit public `$novel-*` skill surface.'));
  assert.ok(installedReadme.includes('internal command-center reference'));
});
