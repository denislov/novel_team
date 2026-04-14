'use strict';

process.env.ANS_TEST_MODE = '1';

const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const INSTALL_SRC = path.join(REPO_ROOT, 'bin', 'install.js');
const BUILD_SCRIPT = path.join(REPO_ROOT, 'scripts', 'build-hooks.js');
const DIST_DIR = path.join(REPO_ROOT, 'hooks', 'dist');
const PKG = require(path.join(REPO_ROOT, 'package.json'));
const {
  replaceClaudePathReferences,
  replaceSupportBundleRelativeRefs,
} = require(INSTALL_SRC);

const EXPECTED_HOOKS = [
  'ans-context-monitor.js',
  'ans-statusline.js',
  'ans-update-check.js',
];

before(() => {
  require(BUILD_SCRIPT);
});

test('build:hooks writes the expected hook files to hooks/dist', () => {
  for (const hook of EXPECTED_HOOKS) {
    assert.ok(
      fs.existsSync(path.join(DIST_DIR, hook)),
      `${hook} should exist in hooks/dist after build`
    );
  }
});

test('package.json publishes installer-critical directories', () => {
  assert.ok(PKG.files.includes('hooks'), 'package.json should publish hooks/');
  assert.ok(PKG.files.includes('scripts'), 'package.json should publish scripts/');
  assert.equal(PKG.scripts['build:hooks'], 'node scripts/build-hooks.js');
  assert.equal(PKG.scripts.prepublishOnly, 'npm run build:hooks');
});

test('install.js uses the top-level hooks path for Codex update checks', () => {
  const src = fs.readFileSync(INSTALL_SRC, 'utf8');

  assert.ok(
    src.includes("path.resolve(targetDir, 'hooks', 'ans-update-check.js')"),
    'Codex hook registration should target targetDir/hooks/ans-update-check.js'
  );

  assert.ok(
    !src.includes("path.resolve(targetDir, 'ai-novel-studio', 'hooks', 'ans-update-check.js')"),
    'Codex hook registration must not point into ai-novel-studio/hooks/'
  );
});

test('install.js uses a shared cache dir and guards context-monitor registration', () => {
  const src = fs.readFileSync(INSTALL_SRC, 'utf8');

  assert.ok(
    src.includes("os.homedir(), '.cache', 'ans', 'ans-update-check.json'"),
    'Update cache should live under ~/.cache/ans/'
  );

  assert.ok(
    src.includes('Skipped Context Monitor hook registration'),
    'Context monitor registration should be skipped when the hook file is missing'
  );
});

test('installer keeps file mentions tilde-based and shell commands home-based', () => {
  const mentioned = replaceClaudePathReferences(
    '@~/.claude/ai-novel-studio/workflows/help.md',
    '~/.gemini/',
    '$HOME/.gemini/',
    '.gemini'
  );
  const shelled = replaceClaudePathReferences(
    'node "$HOME/.claude/ai-novel-studio/bin/ans-tools.cjs" init progress',
    '~/.gemini/',
    '$HOME/.gemini/',
    '.gemini'
  );

  assert.equal(
    mentioned,
    '@~/.gemini/ai-novel-studio/workflows/help.md',
    'file mentions should use ~/.gemini/ so runtime file refs remain resolvable'
  );

  assert.equal(
    shelled,
    'node "$HOME/.gemini/ai-novel-studio/bin/ans-tools.cjs" init progress',
    'shell commands should continue using $HOME/.gemini/'
  );
});

test('installer rewrites support-bundle relative refs to installed absolute mentions', () => {
  const rewritten = replaceSupportBundleRelativeRefs(
    'Execute @workflows/help.md and load @commands/ans/_codex-conventions.md first.',
    '~/.gemini/'
  );

  assert.equal(
    rewritten,
    'Execute @~/.gemini/ai-novel-studio/workflows/help.md and load @~/.gemini/ai-novel-studio/commands/ans/_codex-conventions.md first.',
    'support bundle relative refs should be rewritten to installed file mentions'
  );
});
