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

// ─── chapter normalize helpers ────────────────────────────────────────────────

function _trimTrailingBlanks(arr) {
  const out = [...arr];
  while (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
  return out;
}

function _stripLeadingBlanks(arr) {
  const out = [...arr];
  while (out.length > 0 && out[0].trim() === '') out.shift();
  return out;
}

/**
 * Split chapter body (post-frontmatter) into title / leading-context / sections.
 * - titleLine:      first '# ...' line (H1), or null
 * - leadingContext: lines between H1 and the first H2 (e.g., '> 故事时间：...'
 *                   notes; or — in legacy writer output — the prose itself)
 * - sections:       array of { heading, body[] } for each '## X' block
 */
function _splitBodyIntoSections(bodyText) {
  const lines = bodyText.split(/\r?\n/);
  const out = { titleLine: null, leadingContext: [], sections: [] };

  let i = 0;
  while (i < lines.length && lines[i].trim() === '') i++;

  if (i < lines.length && /^#\s+/.test(lines[i]) && !/^##\s+/.test(lines[i])) {
    out.titleLine = lines[i];
    i++;
  }

  while (i < lines.length && !/^##\s+/.test(lines[i])) {
    out.leadingContext.push(lines[i]);
    i++;
  }

  let currentHeading = null;
  let currentBody = [];
  for (; i < lines.length; i++) {
    const m = lines[i].match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (currentHeading !== null) {
        out.sections.push({ heading: currentHeading, body: currentBody });
      }
      currentHeading = m[1].trim();
      currentBody = [];
    } else {
      currentBody.push(lines[i]);
    }
  }
  if (currentHeading !== null) {
    out.sections.push({ heading: currentHeading, body: currentBody });
  }
  return out;
}

/**
 * Normalize chapter body so it contains only:
 *   - the H1 title line
 *   - optional '> ...' notes (story_date / 承接章节 etc.)
 *   - '## 正文\n[prose]'
 *   - optional '## 章末钩子\n[hook]'
 *
 * Drops any other H2 section (notably '## 章节元数据', '## 创作备注',
 * '## 自检清单') and any naked '---' divider that precedes them.
 *
 * If the input is in the legacy writer format (prose lives directly under
 * the H1 with no '## 正文' heading), the prose is moved under a synthetic
 * '## 正文' heading so downstream tools (chapter_budget.extractProse) work
 * uniformly.
 */
function _normalizeChapterBody(bodyText, schema) {
  const split = _splitBodyIntoSections(bodyText);
  const proseSection = split.sections.find((s) => s.heading === '正文');
  const hookSection = split.sections.find((s) => s.heading === '章末钩子');

  // Strip lone '---' separator lines from leading context — they're divider
  // artifacts from the legacy '正文 --- 章节元数据' layout.
  const cleanLeading = split.leadingContext.filter(
    (l) => !/^\s*---\s*$/.test(l)
  );

  let leadingNotes = [];
  let proseBody;

  if (proseSection) {
    leadingNotes = _trimTrailingBlanks(cleanLeading);
    proseBody = _stripLeadingBlanks(_trimTrailingBlanks(proseSection.body));
  } else {
    // Legacy: no '## 正文'. Prose was placed directly under the H1.
    // Separate '> ...' notes (kept above '## 正文') from prose proper.
    const ctx = _trimTrailingBlanks(cleanLeading);
    const noteLines = [];
    const proseLines = [];
    let stillInNoteBlock = true;
    for (const line of ctx) {
      const isNoteLine = line.trim() === '' || line.trim().startsWith('>');
      if (stillInNoteBlock && isNoteLine) {
        noteLines.push(line);
      } else {
        stillInNoteBlock = false;
        proseLines.push(line);
      }
    }
    leadingNotes = _trimTrailingBlanks(noteLines);
    proseBody = _stripLeadingBlanks(_trimTrailingBlanks(proseLines));
  }

  const out = [];
  if (split.titleLine) out.push(split.titleLine);
  if (leadingNotes.length > 0) {
    out.push('');
    out.push(..._trimTrailingBlanks(leadingNotes));
  }
  out.push('');
  out.push('## 正文');
  out.push('');
  out.push(...proseBody);
  if (hookSection) {
    const hookBody = _stripLeadingBlanks(_trimTrailingBlanks(hookSection.body));
    if (hookBody.length > 0) {
      out.push('');
      out.push('## 章末钩子');
      out.push('');
      out.push(...hookBody);
    }
  }

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

/**
 * Normalize chapter frontmatter against `schemas.CHAPTER_FRONTMATTER`.
 * - drop forbidden keys
 * - fill missing required keys from dynamicDefaults || schema.defaults
 * - emit in canonical order: required → optional → leftover unknowns
 *   (unknown keys that aren't forbidden are preserved at the tail)
 */
function _normalizeChapterFrontmatter(rawFrontmatter, schema, dynamicDefaults) {
  const parsed = {};
  const insertionOrder = [];
  for (const line of rawFrontmatter.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (m) {
      if (parsed[m[1]] === undefined) insertionOrder.push(m[1]);
      parsed[m[1]] = m[2].trim();
    }
  }

  for (const f of schema.forbidden) {
    delete parsed[f];
  }

  for (const key of schema.required) {
    if (parsed[key] === undefined || parsed[key] === '') {
      const fallback = dynamicDefaults?.[key] ?? schema.defaults?.[key];
      if (fallback !== undefined && fallback !== null) {
        parsed[key] = String(fallback);
      }
    }
  }

  const lines = [];
  const seen = new Set();
  for (const key of [...schema.required, ...schema.optional]) {
    if (parsed[key] !== undefined) {
      lines.push(`${key}: ${parsed[key]}`);
      seen.add(key);
    }
  }
  for (const key of insertionOrder) {
    if (!seen.has(key) && parsed[key] !== undefined) {
      lines.push(`${key}: ${parsed[key]}`);
      seen.add(key);
    }
  }
  return lines.join('\n');
}

/**
 * `chapter normalize <N>` core implementation.
 *
 * Rewrites a chapter file to match the canonical CHAPTER_FRONTMATTER schema
 * and the canonical body shape (## 正文 + optional ## 章末钩子). Backs up
 * the original to chapters/draft/chapter-N-backup-<ts>.md before overwriting.
 *
 * Idempotent: a second invocation on an already-normalized file is a no-op.
 *
 * @param {string} root - novel project root
 * @param {number} chapter - chapter number
 * @param {string} sourceKey - 'formal' | 'draft' | 'quick' | 'polished'
 * @param {object} options - { dryRun: boolean }
 */
function normalizeChapter(root, chapter, sourceKey = 'formal', options = {}) {
  const paths = artifactPaths(root, chapter);
  const sourcePath = paths[sourceKey];
  ensureExists(sourcePath, sourceKey);

  const text = fs.readFileSync(sourcePath, 'utf8');
  const schema = require('./schemas.cjs').CHAPTER_FRONTMATTER;

  const fmMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const rawFrontmatter = fmMatch ? fmMatch[1] : '';
  const body = fmMatch ? text.slice(fmMatch[0].length) : text;

  const today = new Date().toISOString().slice(0, 10);
  const dynamicDefaults = {
    chapter: chapter,
    title: `第${chapter}章`,
    created: today,
    updated: today,
  };

  let normalizedFrontmatter = _normalizeChapterFrontmatter(
    rawFrontmatter,
    schema,
    dynamicDefaults
  );
  // Always bump 'updated' to today on a successful normalize (non-noop) pass.
  // We compute this against the candidate result and only apply if content
  // actually changes — the no-op check below handles the unchanged case.
  const bumpedFrontmatter = normalizedFrontmatter
    .split('\n')
    .map((line) => (line.startsWith('updated:') ? `updated: ${today}` : line))
    .join('\n');

  const normalizedBody = _normalizeChapterBody(body, schema);
  const candidate = `---\n${bumpedFrontmatter}\n---\n\n${normalizedBody}`;

  // Check no-op against an alternate render that DOES NOT bump 'updated' —
  // otherwise idempotence breaks when only the date changes.
  const candidateNoBump = `---\n${normalizedFrontmatter}\n---\n\n${normalizedBody}`;
  const isNoOp = text === candidateNoBump || text === candidate;

  const dryRun = !!options.dryRun;
  let backupPath = null;
  let bytesAfter = text.length;

  if (!isNoOp) {
    backupPath = maybeBackup(sourcePath, dryRun);
    if (!dryRun) {
      fs.writeFileSync(sourcePath, candidate, 'utf8');
    }
    bytesAfter = candidate.length;
  }

  return {
    chapter,
    source: sourceKey,
    file_path: sourcePath,
    backup_path: backupPath,
    bytes_before: text.length,
    bytes_after: bytesAfter,
    no_op: isNoOp,
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
  normalizeChapter,
  parseArgs,
  promote,
  refreshState,
  // Exported for unit testing only:
  _normalizeChapterBody,
  _normalizeChapterFrontmatter,
  _splitBodyIntoSections,
};
