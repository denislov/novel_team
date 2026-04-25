#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const { artifactPaths } = require('./chapter_ops.cjs');

function parseArgs(argv) {
  if (argv.length === 0) {
    throw new Error('command required');
  }

  const command = argv[0];
  const supported = new Set(['inspect', 'gate', 'sync']);
  if (!supported.has(command)) {
    throw new Error(`unknown command: ${command}`);
  }

  const args = {
    command,
    root: '.',
    chapter: 0,
    source: 'draft',
    json: false,
  };

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--json') {
      args.json = true;
      continue;
    }

    if (arg === '--root' || arg === '--chapter' || arg === '--source') {
      const nextValue = argv[index + 1];
      if (nextValue === undefined) {
        throw new Error(`${arg} requires a value`);
      }
      index += 1;
      if (arg === '--root') args.root = nextValue;
      if (arg === '--chapter') args.chapter = Number.parseInt(nextValue, 10);
      if (arg === '--source') args.source = nextValue;
      continue;
    }

    throw new Error(`unknown argument: ${arg}`);
  }

  if (!Number.isInteger(args.chapter) || args.chapter <= 0) {
    throw new Error('--chapter must be a positive integer');
  }

  if (!['draft', 'formal', 'quick', 'polished'].includes(args.source)) {
    throw new Error('--source must be one of: draft, formal, quick, polished');
  }

  return args;
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

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function stripFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? text.slice(match[0].length) : text;
}

function parseFrontmatter(text) {
  if (!text.startsWith('---')) {
    return {
      has_frontmatter: false,
      frontmatter: '',
      body: text,
    };
  }

  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!match) {
    return {
      has_frontmatter: false,
      frontmatter: '',
      body: text,
    };
  }

  return {
    has_frontmatter: true,
    frontmatter: match[1],
    body: text.slice(match[0].length),
  };
}

function frontmatterValue(text, key) {
  const match = text.match(new RegExp(`^${escapeRegExp(key)}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseIntegerField(value, fallback) {
  const match = String(value || '').match(/\d+/);
  if (!match) return fallback;
  const parsed = Number.parseInt(match[0], 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function replaceOrAppendFrontmatterLine(frontmatter, key, value) {
  const replacement = `${key}: ${value}`;
  const pattern = new RegExp(`^${escapeRegExp(key)}:\\s*.*$`, 'm');
  if (pattern.test(frontmatter)) {
    return frontmatter.replace(pattern, replacement);
  }

  const trimmed = frontmatter.replace(/\s*$/, '');
  return trimmed ? `${trimmed}\n${replacement}` : replacement;
}

function extractSection(text, heading) {
  const lines = String(text || '').split(/\r?\n/);
  const headingPattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`);
  const nextHeadingPattern = /^##\s+/;
  const startIndex = lines.findIndex((line) => headingPattern.test(line.trim()));

  if (startIndex === -1) return '';

  const collected = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (nextHeadingPattern.test(lines[index].trim())) break;
    collected.push(lines[index]);
  }

  return collected.join('\n').trim();
}

function extractLegacyBody(text) {
  const withoutFrontmatter = stripFrontmatter(text);
  const titleMatch = withoutFrontmatter.match(/^#\s+.*$/m);
  const bodyStart = titleMatch ? titleMatch.index + titleMatch[0].length : 0;
  let remainder = withoutFrontmatter.slice(bodyStart).replace(/^\s+/, '');

  const metadataHeading = remainder.search(/^##\s+(章节元数据|创作备注)\s*$/m);
  if (metadataHeading !== -1) {
    remainder = remainder.slice(0, metadataHeading);
  }

  const chapterHookHeading = remainder.search(/^##\s+章末钩子\s*$/m);
  if (chapterHookHeading !== -1) {
    remainder = remainder.slice(0, chapterHookHeading);
  }

  const metadataDivider = remainder.search(/^\s*---\s*$\r?\n(?=##\s+)/m);
  if (metadataDivider !== -1) {
    remainder = remainder.slice(0, metadataDivider);
  }

  return remainder.trim();
}

function extractProse(text) {
  const withoutFrontmatter = stripFrontmatter(text);
  const proseSection = extractSection(withoutFrontmatter, '正文');
  if (proseSection) return proseSection;
  return extractLegacyBody(text);
}

function sanitizeProse(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^\s*([-*_])\1{2,}\s*$/gm, ' ')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^\s*#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/^\s*\[[^\n[\]]+\]\s*$/gm, ' ')
    .replace(/[`*_~]/g, '')
    .trim();
}

function countVisibleCharacters(text) {
  return sanitizeProse(text).replace(/\s+/g, '').length;
}

function loadProjectBudget(root) {
  const projectPath = path.join(root, 'PROJECT.md');
  const projectText = fileExists(projectPath) ? readText(projectPath) : '';
  const chapterWords = parseIntegerField(frontmatterValue(projectText, 'chapter_words'), 3000);
  const hardCeiling = parseIntegerField(frontmatterValue(projectText, 'chapter_word_ceiling'), chapterWords + 1000);
  return {
    target_words: chapterWords,
    hard_ceiling: Math.max(hardCeiling, chapterWords + 1),
  };
}

function resolveBudget(root, chapterText) {
  const projectBudget = loadProjectBudget(root);
  const targetWords = parseIntegerField(
    frontmatterValue(chapterText, 'target_words') || frontmatterValue(chapterText, 'word_target'),
    projectBudget.target_words
  );
  const hardCeiling = parseIntegerField(frontmatterValue(chapterText, 'hard_ceiling'), projectBudget.hard_ceiling);

  return {
    target_words: targetWords,
    hard_ceiling: Math.max(hardCeiling, targetWords + 1),
  };
}

function analyzeChapter(root, chapter, source) {
  const paths = artifactPaths(root, chapter);
  const filePath = paths[source];
  ensureExists(filePath, source);

  const text = readText(filePath);
  const prose = extractProse(text);
  const visibleCharacters = countVisibleCharacters(prose);
  const budget = resolveBudget(root, text);

  let budgetStatus = 'within_target';
  if (visibleCharacters > budget.hard_ceiling) {
    budgetStatus = 'over_ceiling';
  } else if (visibleCharacters > budget.target_words) {
    budgetStatus = 'near_ceiling';
  }

  return {
    chapter,
    source,
    file_path: filePath,
    count_basis: 'visible_non_whitespace_chars_in_prose',
    prose_chars: visibleCharacters,
    target_words: budget.target_words,
    hard_ceiling: budget.hard_ceiling,
    over_target: visibleCharacters > budget.target_words,
    over_ceiling: visibleCharacters > budget.hard_ceiling,
    budget_status: budgetStatus,
    budget_result: budgetStatus === 'over_ceiling' ? 'split_required' : budgetStatus,
  };
}

function syncChapterMetadata(root, chapter, source) {
  const result = analyzeChapter(root, chapter, source);
  const parsed = parseFrontmatter(readText(result.file_path));

  if (!parsed.has_frontmatter) {
    return {
      ...result,
      metadata_synced: false,
      sync_reason: 'frontmatter_missing',
    };
  }

  let frontmatter = parsed.frontmatter;
  frontmatter = replaceOrAppendFrontmatterLine(frontmatter, 'target_words', String(result.target_words));
  frontmatter = replaceOrAppendFrontmatterLine(frontmatter, 'hard_ceiling', String(result.hard_ceiling));
  frontmatter = replaceOrAppendFrontmatterLine(frontmatter, 'words', String(result.prose_chars));
  frontmatter = replaceOrAppendFrontmatterLine(frontmatter, 'budget_result', result.budget_result);

  const updatedText = `---\n${frontmatter.replace(/\s*$/, '')}\n---\n${parsed.body.replace(/^\n?/, '')}`;
  writeText(result.file_path, updatedText);

  return {
    ...result,
    metadata_synced: true,
    sync_reason: 'updated_frontmatter',
  };
}

function printResult(result, asJson) {
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  for (const [key, value] of Object.entries(result)) {
    console.log(`${key}=${value}`);
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
    const result = (args.command === 'inspect' || args.command === 'gate')
      ? analyzeChapter(root, args.chapter, args.source)
      : syncChapterMetadata(root, args.chapter, args.source);
    printResult(result, args.json);

    if (args.command === 'gate' && result.over_ceiling) {
      console.error(`chapter ${args.chapter} exceeds hard ceiling: ${result.prose_chars} > ${result.hard_ceiling}`);
      return 1;
    }

    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  analyzeChapter,
  countVisibleCharacters,
  extractLegacyBody,
  extractProse,
  loadProjectBudget,
  main,
  parseArgs,
  parseFrontmatter,
  replaceOrAppendFrontmatterLine,
  resolveBudget,
  sanitizeProse,
  syncChapterMetadata,
};
