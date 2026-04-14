#!/usr/bin/env node
/**
 * Copy ANS hooks to hooks/dist for installation and validate JS syntax first.
 * Prevents published installs from shipping missing or syntactically broken
 * hook files.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const HOOKS_DIR = path.join(__dirname, '..', 'hooks');
const DIST_DIR = path.join(HOOKS_DIR, 'dist');

const HOOKS_TO_COPY = [
  'ans-update-check.js',
  'ans-context-monitor.js',
  'ans-statusline.js',
];

function validateSyntax(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  try {
    new vm.Script(content, { filename: path.basename(filePath) });
    return null;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return error.message;
    }
    throw error;
  }
}

function build() {
  fs.mkdirSync(DIST_DIR, { recursive: true });

  let hasErrors = false;

  for (const hook of HOOKS_TO_COPY) {
    const src = path.join(HOOKS_DIR, hook);
    const dest = path.join(DIST_DIR, hook);

    if (!fs.existsSync(src)) {
      console.warn(`Warning: ${hook} not found, skipping`);
      continue;
    }

    const syntaxError = validateSyntax(src);
    if (syntaxError) {
      console.error(`\x1b[31m✗ ${hook}: SyntaxError — ${syntaxError}\x1b[0m`);
      hasErrors = true;
      continue;
    }

    console.log(`\x1b[32m✓\x1b[0m Copying ${hook}...`);
    fs.copyFileSync(src, dest);
    try {
      fs.chmodSync(dest, 0o755);
    } catch {
      // Windows may not preserve POSIX permissions.
    }
  }

  if (hasErrors) {
    console.error('\n\x1b[31mBuild failed: fix syntax errors above before publishing.\x1b[0m');
    process.exit(1);
  }

  console.log('\nBuild complete.');
}

build();
