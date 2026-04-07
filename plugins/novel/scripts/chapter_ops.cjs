#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const STATE_SCRIPT = path.join(__dirname, 'novel_state.cjs');

function parseArgs(argv) {
  if (argv.length === 0) {
    throw new Error('command required');
  }

  const command = argv[0];
  const supported = new Set(['inspect', 'use-draft', 'use-quick', 'apply-polish']);
  if (!supported.has(command)) {
    throw new Error(`unknown command: ${command}`);
  }

  const args = {
    command,
    root: '.',
    chapter: 0,
    json: false,
    force: false,
    dry_run: false,
  };

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--json') {
      args.json = true;
      continue;
    }
    if (arg === '--force') {
      args.force = true;
      continue;
    }
    if (arg === '--dry-run') {
      args.dry_run = true;
      continue;
    }
    if (arg === '--root' || arg === '--chapter') {
      const nextValue = argv[index + 1];
      if (nextValue === undefined) {
        throw new Error(`${arg} requires a value`);
      }
      index += 1;
      if (arg === '--root') args.root = nextValue;
      if (arg === '--chapter') args.chapter = Number.parseInt(nextValue, 10);
      continue;
    }

    throw new Error(`unknown argument: ${arg}`);
  }

  if (!Number.isInteger(args.chapter) || args.chapter <= 0) {
    throw new Error('--chapter must be a positive integer');
  }

  return args;
}

function artifactPaths(root, chapter) {
  const draftDir = path.join(root, 'chapters', 'draft');
  return {
    formal: path.join(root, 'chapters', `chapter-${chapter}.md`),
    draft: path.join(draftDir, `chapter-${chapter}-draft.md`),
    quick: path.join(draftDir, `chapter-${chapter}-quick.md`),
    polished: path.join(draftDir, `chapter-${chapter}-polished.md`),
    review: path.join(root, 'reviews', `review-${chapter}.md`),
    edit_report: path.join(root, 'reviews', `edit-report-${chapter}.md`),
  };
}

function fileExists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function ensureExists(filePath, label) {
  if (!fileExists(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function maybeBackup(formalPath, dryRun) {
  if (!fileExists(formalPath)) return null;
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const backupPath = path.join(path.dirname(formalPath), 'draft', `${path.basename(formalPath, '.md')}-backup-${stamp}.md`);
  if (!dryRun) {
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.copyFileSync(formalPath, backupPath);
  }
  return backupPath;
}

function refreshState(root, chapter, dryRun) {
  const args = [
    STATE_SCRIPT,
    'refresh',
    '--root',
    root,
    '--status',
    '连载中',
    '--latest-completed',
    `已完成第${chapter}章`,
    '--next-goal',
    `第${chapter + 1}章规划或核对`,
  ];
  if (dryRun) args.push('--dry-run');

  const result = spawnSync(process.execPath, args, {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error((result.stderr || '').trim() || 'state refresh failed');
  }
}

function inspectChapter(root, chapter) {
  const paths = artifactPaths(root, chapter);
  return {
    chapter,
    formal_exists: fileExists(paths.formal),
    draft_exists: fileExists(paths.draft),
    quick_exists: fileExists(paths.quick),
    polished_exists: fileExists(paths.polished),
    review_exists: fileExists(paths.review),
    edit_report_exists: fileExists(paths.edit_report),
    paths,
  };
}

function promote(root, chapter, sourceKey, force, dryRun) {
  const paths = artifactPaths(root, chapter);
  const sourcePath = paths[sourceKey];
  const formalPath = paths.formal;
  ensureExists(sourcePath, sourceKey);

  if (fileExists(formalPath) && !force) {
    throw new Error(`formal chapter already exists: ${formalPath}`);
  }

  const backupPath = fileExists(formalPath) ? maybeBackup(formalPath, dryRun) : null;
  if (!dryRun) {
    fs.mkdirSync(path.dirname(formalPath), { recursive: true });
    fs.copyFileSync(sourcePath, formalPath);
    refreshState(root, chapter, false);
  }

  return {
    chapter,
    source: sourceKey,
    source_path: sourcePath,
    formal_path: formalPath,
    backup_path: backupPath,
    dry_run: dryRun,
  };
}

function printResult(result, asJson) {
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  for (const [key, value] of Object.entries(result)) {
    if (key === 'paths') {
      for (const [pathKey, pathValue] of Object.entries(value)) {
        console.log(`path.${pathKey}=${pathValue}`);
      }
    } else {
      console.log(`${key}=${value}`);
    }
  }
}

function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    return 1;
  }

  const root = path.resolve(args.root);

  try {
    if (args.command === 'inspect') {
      printResult(inspectChapter(root, args.chapter), args.json);
      return 0;
    }

    if (args.command === 'use-draft') {
      printResult(promote(root, args.chapter, 'draft', args.force, args.dry_run), true);
      return 0;
    }

    if (args.command === 'use-quick') {
      printResult(promote(root, args.chapter, 'quick', args.force, args.dry_run), true);
      return 0;
    }

    if (args.command === 'apply-polish') {
      printResult(promote(root, args.chapter, 'polished', args.force, args.dry_run), true);
      return 0;
    }
  } catch (error) {
    console.error(error.message);
    return 1;
  }

  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  artifactPaths,
  inspectChapter,
  main,
  maybeBackup,
  parseArgs,
  promote,
  refreshState,
};
