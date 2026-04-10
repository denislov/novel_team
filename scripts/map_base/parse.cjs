const path = require('node:path');

const {
  CHINESE_NUMERAL_MAP,
  CHINESE_UNIT_MAP,
  TITLE_NOISE_PATTERNS,
} = require('./constants.cjs');

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function frontmatterValue(text, key) {
  const match = text.match(new RegExp(`^${escapeRegExp(key)}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}

function firstHeading(text) {
  for (const line of text.split(/\r?\n/)) {
    const stripped = line.trim();
    if (stripped.startsWith('#')) return stripped.replace(/^#+\s*/, '').trim();
  }
  return null;
}

function chineseToInt(raw) {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number.parseInt(raw, 10);
  let total = 0;
  let current = 0;
  let pending = 0;
  for (const ch of raw) {
    if (CHINESE_NUMERAL_MAP.has(ch)) pending = CHINESE_NUMERAL_MAP.get(ch);
    else if (CHINESE_UNIT_MAP.has(ch)) {
      current += (pending || 1) * CHINESE_UNIT_MAP.get(ch);
      pending = 0;
    } else return null;
  }
  total += current + pending;
  return total || null;
}

function extractChapterNumber(text, filePath) {
  const haystacks = [path.basename(filePath, path.extname(filePath)), firstHeading(text) || '', frontmatterValue(text, 'chapter') || ''];
  const patterns = [
    /(?:chapter|chap)[\s_-]*(\d{1,4})/i,
    /第\s*([0-9]{1,4}|[零〇一二两三四五六七八九十百千]+)\s*章/i,
    /第\s*([0-9]{1,4}|[零〇一二两三四五六七八九十百千]+)\s*[回话节]/i,
    /卷[一二三四五六七八九十0-9]+\s*第\s*([0-9]{1,4}|[零〇一二两三四五六七八九十百千]+)\s*章/i,
    /^0*([0-9]{1,4})$/,
  ];
  for (const haystack of haystacks) {
    for (const pattern of patterns) {
      const match = haystack.match(pattern);
      if (!match) continue;
      const value = chineseToInt(match[1]);
      if (value !== null) return value;
    }
  }
  return null;
}

function inferTitle(text, filePath) {
  for (const key of ['title', 'name', 'topic']) {
    const value = frontmatterValue(text, key);
    if (value) return value;
  }
  return firstHeading(text) || path.basename(filePath, path.extname(filePath));
}

function cleanProjectTitle(title) {
  let cleaned = String(title || '').trim().replace(/^#+\s*/, '').trim();
  cleaned = cleaned.replace(/^《(.+)》.*$/, '$1').replace(/^[《"]?(.+?)[》"]?$/, '$1');
  for (const pattern of TITLE_NOISE_PATTERNS) {
    const candidate = cleaned.replace(pattern, '').trim().replace(/^[\s\-_:：]+|[\s\-_:：]+$/g, '');
    if (candidate && candidate !== cleaned) cleaned = candidate;
  }
  return cleaned || title;
}

function stripFrontmatter(text) {
  if (!text.startsWith('---')) return text;
  const parts = text.split('---', 3);
  return parts.length === 3 ? parts[2] : text;
}

function meaningfulLines(text) {
  const body = stripFrontmatter(text);
  const lines = [];
  let inCodeBlock = false;
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock || !line) continue;
    if (/^(#|\||<|>)/.test(line)) continue;
    if (/^[-=*]{3,}$/.test(line)) continue;
    lines.push(line);
  }
  return lines;
}

function sourceExcerpt(text, maxItems = 3, maxChars = 240) {
  const snippets = [];
  let total = 0;
  for (const line of meaningfulLines(text)) {
    if (snippets.length >= maxItems) break;
    const compact = line.replace(/\s+/g, ' ').trim();
    if (!compact) continue;
    if (total + compact.length > maxChars && snippets.length) break;
    const piece = compact.slice(0, Math.max(0, maxChars - total)).trimEnd();
    snippets.push(piece);
    total += piece.length;
  }
  if (!snippets.length) return '（源文件暂无可直接摘录内容）';
  return snippets.map((item) => `- ${item}`).join('\n');
}

function normalizeSlug(value) {
  return String(value || '').trim().replace(/[\\/]+/g, '-').replace(/\s+/g, '-').replace(/-{2,}/g, '-').replace(/^[-._]+|[-._]+$/g, '') || 'untitled';
}

module.exports = {
  cleanProjectTitle,
  escapeRegExp,
  extractChapterNumber,
  firstHeading,
  frontmatterValue,
  inferTitle,
  meaningfulLines,
  normalizeSlug,
  sourceExcerpt,
  stripFrontmatter,
};
