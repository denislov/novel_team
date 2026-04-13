/**
 * Core — Shared utilities for ANS CLI tools
 *
 * Provides: error handling, output formatting, file I/O, frontmatter CRUD,
 * project root detection, and path helpers.
 */

const fs = require('node:fs');
const path = require('node:path');

// ─── Output helpers ───────────────────────────────────────────────────────────

/**
 * Write structured result to stdout.
 * Large payloads (>50KB) are written to a temp file with @file: prefix.
 */
function output(result, raw, rawValue) {
  let data;
  if (raw && rawValue !== undefined) {
    data = String(rawValue);
  } else {
    const json = JSON.stringify(result, null, 2);
    if (json.length > 50000) {
      const tmpPath = path.join(require('node:os').tmpdir(), `ans-${Date.now()}.json`);
      fs.writeFileSync(tmpPath, json, 'utf-8');
      data = '@file:' + tmpPath;
    } else {
      data = json;
    }
  }
  fs.writeSync(1, data);
}

function error(message) {
  fs.writeSync(2, 'Error: ' + message + '\n');
  process.exit(1);
}

// ─── File utilities ───────────────────────────────────────────────────────────

function fileExists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function safeReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

function readText(filePath) {
  const buffer = fs.readFileSync(filePath);
  return buffer.toString('utf8');
}

function writeText(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function listMatchingFiles(dirPath, pattern) {
  if (!fileExists(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((entry) => pattern.test(entry))
    .map((entry) => path.join(dirPath, entry))
    .sort();
}

// ─── Regex helpers ────────────────────────────────────────────────────────────

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Frontmatter utilities ────────────────────────────────────────────────────

/**
 * Extract a single frontmatter value from text.
 * Supports YAML-style `key: value` lines.
 */
function frontmatterValue(text, key) {
  const match = text.match(new RegExp(`^${escapeRegExp(key)}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}

/**
 * Parse full frontmatter block from markdown text.
 * Returns { has_frontmatter, frontmatter, body }.
 */
function parseFrontmatter(text) {
  if (!text.startsWith('---')) {
    return { has_frontmatter: false, frontmatter: '', body: text };
  }
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!match) {
    return { has_frontmatter: false, frontmatter: '', body: text };
  }
  return {
    has_frontmatter: true,
    frontmatter: match[1],
    body: text.slice(match[0].length),
  };
}

/**
 * Parse frontmatter into a key-value object.
 */
function parseFrontmatterToObject(text) {
  const { has_frontmatter, frontmatter } = parseFrontmatter(text);
  if (!has_frontmatter) return {};
  const result = {};
  for (const line of frontmatter.split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (m) {
      result[m[1]] = m[2].trim();
    }
  }
  return result;
}

/**
 * Replace or append a frontmatter-style line in text.
 */
function replaceOrAppendLine(text, prefix, value) {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}.*$`, 'm');
  const replacement = `${prefix}${value}`;
  if (pattern.test(text)) {
    return text.replace(pattern, replacement);
  }
  return `${text.replace(/\s*$/, '')}\n${replacement}\n`;
}

/**
 * Replace or append a line within frontmatter block only.
 */
function replaceOrAppendFrontmatterLine(frontmatter, key, value) {
  const replacement = `${key}: ${value}`;
  const pattern = new RegExp(`^${escapeRegExp(key)}:\\s*.*$`, 'm');
  if (pattern.test(frontmatter)) {
    return frontmatter.replace(pattern, replacement);
  }
  const trimmed = frontmatter.replace(/\s*$/, '');
  return trimmed ? `${trimmed}\n${replacement}` : replacement;
}

// ─── Section utilities ────────────────────────────────────────────────────────

/**
 * Extract a markdown section by heading.
 */
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

/**
 * Replace a ## section in text. If not found, appends.
 */
function replaceSection(text, heading, sectionBody) {
  const pattern = new RegExp(`^## ${escapeRegExp(heading)}\\n.*?(?=^## |\\Z)`, 'ms');
  const replacement = `${sectionBody.trim()}\n\n`;
  if (pattern.test(text)) {
    return text.replace(pattern, replacement);
  }
  return `${text.replace(/\s*$/, '')}\n\n${replacement}`;
}

// ─── Project root detection ───────────────────────────────────────────────────

/**
 * Find the novel project root by looking for PROJECT.md.
 * Walks up from startDir until it finds PROJECT.md or reaches filesystem root.
 */
function findProjectRoot(startDir) {
  const resolved = path.resolve(startDir);
  const root = path.parse(resolved).root;

  let dir = resolved;
  while (dir !== root) {
    if (fileExists(path.join(dir, 'PROJECT.md'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return startDir;
}

// ─── Chapter number helpers ───────────────────────────────────────────────────

function chapterNumberFromName(name, prefix) {
  const match = name.match(new RegExp(`${escapeRegExp(prefix)}-(\\d+)\\.md$`));
  return match ? Number.parseInt(match[1], 10) : null;
}

function chapterFiles(root) {
  return listMatchingFiles(path.join(root, 'chapters'), /^chapter-\d+\.md$/);
}

function outlineFiles(root) {
  return listMatchingFiles(path.join(root, 'chapters', 'outlines'), /^outline-\d+\.md$/);
}

function reviewFiles(root) {
  return listMatchingFiles(path.join(root, 'reviews'), /^review-\d+\.md$/);
}

// ─── Arg parsing helpers ──────────────────────────────────────────────────────

/**
 * Extract named --flag <value> pairs from an args array.
 * @param {string[]} args
 * @param {string[]} valueFlags - flags that consume the next token as value
 * @param {string[]} booleanFlags - flags that are boolean (no value consumed)
 */
function parseNamedArgs(args, valueFlags = [], booleanFlags = []) {
  const result = {};
  for (const flag of valueFlags) {
    const idx = args.indexOf(`--${flag}`);
    result[flag] = idx !== -1 && args[idx + 1] !== undefined && !args[idx + 1].startsWith('--')
      ? args[idx + 1]
      : null;
  }
  for (const flag of booleanFlags) {
    result[flag] = args.includes(`--${flag}`);
  }
  return result;
}

// ─── Timestamp helpers ────────────────────────────────────────────────────────

function currentDate() {
  return new Date().toISOString().slice(0, 10);
}

function currentTimestamp() {
  return new Date().toISOString();
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  output,
  error,
  fileExists,
  safeReadFile,
  readText,
  writeText,
  listMatchingFiles,
  escapeRegExp,
  frontmatterValue,
  parseFrontmatter,
  parseFrontmatterToObject,
  replaceOrAppendLine,
  replaceOrAppendFrontmatterLine,
  extractSection,
  replaceSection,
  findProjectRoot,
  chapterNumberFromName,
  chapterFiles,
  outlineFiles,
  reviewFiles,
  parseNamedArgs,
  currentDate,
  currentTimestamp,
};
