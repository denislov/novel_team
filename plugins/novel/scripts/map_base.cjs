#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const TEXT_SUFFIXES = new Set(['.md', '.markdown', '.txt']);
const CORE_FILES = ['PROJECT.md', 'CHARACTERS.md', 'TIMELINE.md', 'ROADMAP.md', 'STATE.md'];
const IGNORED_DIRS = new Set(['.git', '.agents', '.claude-plugin', '.codex-plugin', '__pycache__', '.venv', 'venv', 'node_modules', 'plugins']);
const STRUCTURED_DIRS = new Set(['chapters', 'characters', 'research', 'reviews']);
const GENERIC_CHARACTER_NAMES = new Set(['人物', '人物卡', '角色', '角色卡', '人设', '人物设定', '角色设定', 'character', 'character-card']);
const CHINESE_NUMERAL_MAP = new Map([['零', 0], ['〇', 0], ['一', 1], ['二', 2], ['两', 2], ['三', 3], ['四', 4], ['五', 5], ['六', 6], ['七', 7], ['八', 8], ['九', 9]]);
const CHINESE_UNIT_MAP = new Map([['十', 10], ['百', 100], ['千', 1000]]);
const TITLE_NOISE_PATTERNS = [
  /(项目设定|小说设定|作品设定|世界观设定|设定集|设定稿)$/i,
  /(时间线整理|时间线总表|故事时间线|时间线)$/i,
  /(第一卷卷纲|第二卷卷纲|第三卷卷纲|卷纲|总纲|路线图|roadmap)$/i,
  /(人物总表|角色总表|人物关系|角色关系)$/i,
];
const OUTLINE_KEYWORDS = ['大纲', 'outline', '章节蓝图', '细纲', '章纲', '分镜', '拍点', 'beat'];
const REVIEW_NAME_KEYWORDS = ['审核', '复盘', 'review', 'verification', '修订意见', '修改报告', 'edit-report'];
const REVIEW_BODY_KEYWORDS = ['审核结果', '建议修改', '阻塞问题', '一致性检查', '复查清单', '总体评价', '亮点', '问题汇总'];
const TIMELINE_KEYWORDS = ['timeline', '时间线', '年表', '纪年', 'chronology', '事件表'];
const ROADMAP_KEYWORDS = ['roadmap', '路线图', '卷纲', '阶段规划', '剧情规划', '卷计划', '总纲', 'arc', '分卷'];
const CHARACTER_INDEX_KEYWORDS = ['人物总表', '角色总表', '关系表', '人物关系', '角色关系', 'cast'];
const CHARACTER_CARD_KEYWORDS = ['人物卡', '角色卡', 'character-card', '人物设定', '角色设定'];
const PROJECT_KEYWORDS = ['project', '设定', '世界观', '主线', '金手指', '简介', '梗概', '设定集', '作品设定'];
const RESEARCH_KEYWORDS = ['research', '考据', '资料', '史料', '术语', '背景研究', '百科', '行业资料'];

function parseArgs(argv) {
  const args = { source_dir: '.', merge: false, force: false, dry_run: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--merge') args.merge = true;
    else if (arg === '--force') args.force = true;
    else if (arg === '--dry-run') args.dry_run = true;
    else if (arg.startsWith('--from=')) args.source_dir = arg.slice('--from='.length);
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

function fileExists(filePath) {
  try { fs.accessSync(filePath); return true; } catch { return false; }
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function firstHeading(text) {
  for (const line of text.split(/\r?\n/)) {
    const stripped = line.trim();
    if (stripped.startsWith('#')) return stripped.replace(/^#+\s*/, '').trim();
  }
  return null;
}

function frontmatterValue(text, key) {
  const match = text.match(new RegExp(`^${escapeRegExp(key)}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

function normalizeSlug(value) {
  return String(value || '').trim().replace(/[\\/]+/g, '-').replace(/\s+/g, '-').replace(/-{2,}/g, '-').replace(/^[-._]+|[-._]+$/g, '') || 'untitled';
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
    if (line.startsWith('```')) { inCodeBlock = !inCodeBlock; continue; }
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

function inferCharacterName(text, filePath) {
  const explicit = frontmatterValue(text, 'name');
  if (explicit) return explicit;
  const title = firstHeading(text) || '';
  const headingMatch = title.match(/(?:人物卡|角色卡)[:：\s]+(.+)$/);
  if (headingMatch) return headingMatch[1].trim();

  let stem = path.basename(filePath, path.extname(filePath));
  stem = stem.replace(/^(人物卡|角色卡|人物设定|角色设定|人设|character-card|character)[-_：:\s]*/i, '');
  stem = stem.replace(/[-_：:\s]*(人物卡|角色卡|人物设定|角色设定|人设|character-card|character)$/i, '');
  stem = stem.trim();
  if (!stem || GENERIC_CHARACTER_NAMES.has(stem)) return null;
  return stem;
}

function containsAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function classifyFile(filePath, sourceDir) {
  const text = readText(filePath);
  const title = inferTitle(text, filePath);
  const lowered = `${path.basename(filePath).toLowerCase()}\n${text.toLowerCase()}\n${title.toLowerCase()}`;
  const nameTitle = `${path.basename(filePath).toLowerCase()}\n${title.toLowerCase()}`;
  const preview = meaningfulLines(text).slice(0, 8).join('\n').toLowerCase();
  const bodySignals = `${nameTitle}\n${preview}`;
  const chapter = extractChapterNumber(text, filePath);
  const rel = path.relative(sourceDir, filePath).split(path.sep).join('/');

  if (text.includes('# map-base Report') || text.includes('map-base completed')) {
    return { source: filePath, rel, kind: 'ignored_generated', confidence: 100, reason: 'map-base 生成产物', title };
  }
  if (chapter !== null && containsAny(`${nameTitle}\n${preview}`, OUTLINE_KEYWORDS)) {
    return { source: filePath, rel, kind: 'outline', confidence: 95, reason: '检测到章节号且含大纲信号', title, chapter };
  }
  if (containsAny(nameTitle, REVIEW_NAME_KEYWORDS) || containsAny(preview, REVIEW_BODY_KEYWORDS)) {
    return { source: filePath, rel, kind: 'review', confidence: 85, reason: '检测到审核/复盘信号', title };
  }
  if (chapter !== null) {
    return { source: filePath, rel, kind: 'chapter', confidence: 90, reason: '检测到章节号', title, chapter };
  }
  if (CORE_FILES.includes(path.basename(filePath))) {
    return { source: filePath, rel, kind: `existing_${path.basename(filePath, path.extname(filePath)).toLowerCase()}`, confidence: 100, reason: '已是标准核心文件', title };
  }
  if (containsAny(bodySignals, TIMELINE_KEYWORDS)) {
    return { source: filePath, rel, kind: 'timeline_source', confidence: 90, reason: '检测到时间线信号', title };
  }
  if (containsAny(bodySignals, ROADMAP_KEYWORDS)) {
    return { source: filePath, rel, kind: 'roadmap_source', confidence: 88, reason: '检测到路线图/卷纲信号', title };
  }
  if (containsAny(bodySignals, CHARACTER_INDEX_KEYWORDS)) {
    return { source: filePath, rel, kind: 'characters_index', confidence: 88, reason: '检测到人物总表/关系表信号', title };
  }
  if (containsAny(bodySignals, CHARACTER_CARD_KEYWORDS)) {
    return { source: filePath, rel, kind: 'character_card', confidence: 92, reason: '检测到人物卡信号', title, entity_name: inferCharacterName(text, filePath) };
  }
  if (containsAny(bodySignals, ['人物', '角色', '人设', 'character', 'cast'])) {
    const entityName = inferCharacterName(text, filePath);
    return { source: filePath, rel, kind: entityName ? 'character_card' : 'characters_index', confidence: 70, reason: '检测到人物相关信号', title, entity_name: entityName };
  }
  if (containsAny(bodySignals, RESEARCH_KEYWORDS)) {
    return { source: filePath, rel, kind: 'research', confidence: 82, reason: '检测到研究资料信号', title };
  }
  if (containsAny(bodySignals, PROJECT_KEYWORDS)) {
    return { source: filePath, rel, kind: 'project_source', confidence: 75, reason: '检测到项目设定信号', title };
  }
  return { source: filePath, rel, kind: 'unknown', confidence: 10, reason: '未命中稳定分类规则', title };
}

function shouldSkipRelativeDir(relativeDir) {
  if (!relativeDir || relativeDir === '.') return false;
  return relativeDir.split(path.sep).some((part) => IGNORED_DIRS.has(part) || STRUCTURED_DIRS.has(part));
}

function walkFiles(rootDir) {
  const results = [];
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const fullPath = path.join(current, entry.name);
      const relativeDir = path.relative(rootDir, entry.isDirectory() ? fullPath : path.dirname(fullPath));
      if (entry.isDirectory()) {
        if (shouldSkipRelativeDir(relativeDir)) continue;
        stack.push(fullPath);
      } else if (TEXT_SUFFIXES.has(path.extname(entry.name).toLowerCase()) && !shouldSkipRelativeDir(path.relative(rootDir, path.dirname(fullPath)))) {
        results.push(fullPath);
      }
    }
  }
  return results.sort();
}

function scanCandidates(sourceDir) {
  return walkFiles(sourceDir).map((filePath) => classifyFile(filePath, sourceDir));
}

function resolveCopyDestination(sourceDir, candidate, usedDestinations) {
  if (candidate.kind === 'chapter') return path.join(sourceDir, 'chapters', `chapter-${candidate.chapter}.md`);
  if (candidate.kind === 'outline') return path.join(sourceDir, 'chapters', 'outlines', `outline-${candidate.chapter}.md`);
  if (candidate.kind === 'character_card') {
    const base = normalizeSlug(candidate.entity_name || path.basename(candidate.source, path.extname(candidate.source)));
    let destination = path.join(sourceDir, 'characters', `${base}.md`);
    let counter = 2;
    while (usedDestinations.has(destination)) {
      destination = path.join(sourceDir, 'characters', `${base}-${counter}.md`);
      counter += 1;
    }
    return destination;
  }
  if (candidate.kind === 'research') {
    const base = normalizeSlug(path.basename(candidate.source, path.extname(candidate.source)));
    let destination = path.join(sourceDir, 'research', `${base}.md`);
    let counter = 2;
    while (usedDestinations.has(destination)) {
      destination = path.join(sourceDir, 'research', `${base}-${counter}.md`);
      counter += 1;
    }
    return destination;
  }
  if (candidate.kind === 'review') {
    const base = normalizeSlug(path.basename(candidate.source, path.extname(candidate.source)));
    let destination = path.join(sourceDir, 'reviews', `${base}.md`);
    let counter = 2;
    while (usedDestinations.has(destination)) {
      destination = path.join(sourceDir, 'reviews', `${base}-${counter}.md`);
      counter += 1;
    }
    return destination;
  }
  return null;
}

function chapterFilesOnDisk(sourceDir) {
  const dir = path.join(sourceDir, 'chapters');
  if (!fileExists(dir)) return [];
  return fs.readdirSync(dir).filter((name) => /^chapter-\d+\.md$/.test(name)).map((name) => path.join(dir, name)).sort();
}

function outlineFilesOnDisk(sourceDir) {
  const dir = path.join(sourceDir, 'chapters', 'outlines');
  if (!fileExists(dir)) return [];
  return fs.readdirSync(dir).filter((name) => /^outline-\d+\.md$/.test(name)).map((name) => path.join(dir, name)).sort();
}

function characterFilesOnDisk(sourceDir) {
  const dir = path.join(sourceDir, 'characters');
  if (!fileExists(dir)) return [];
  return fs.readdirSync(dir).filter((name) => name.endsWith('.md')).map((name) => path.join(dir, name)).sort();
}

function chapterNumbersFromPaths(paths, pattern) {
  const regex = new RegExp(pattern);
  return [...new Set(paths.map((filePath) => {
    const match = path.basename(filePath).match(regex);
    return match ? Number.parseInt(match[1], 10) : null;
  }).filter((value) => value !== null))].sort((a, b) => a - b);
}

function chapterRangeText(numbers) {
  if (!numbers.length) return '待整理';
  return numbers.length > 1 ? `${numbers[0]}-${numbers[numbers.length - 1]}` : String(numbers[0]);
}

function markdownSources(items) {
  if (!items.length) return '- 暂无直接来源，需人工补齐。';
  return items.slice().sort((a, b) => a.rel.localeCompare(b.rel)).map((item) => `- \`${item.rel}\`: ${item.reason}`).join('\n');
}

function collectTexts(items) {
  return items.map((item) => readText(item.source));
}

function firstMatchingLine(texts, patterns) {
  for (const text of texts) {
    for (const line of meaningfulLines(text)) {
      const compact = line.replace(/\s+/g, ' ').trim();
      if (patterns.some((pattern) => new RegExp(pattern, 'i').test(compact))) return compact;
    }
  }
  return null;
}

function inferCurrentArc(texts) {
  const line = firstMatchingLine(texts, ['第[一二三四五六七八九十0-9]+卷', '卷[一二三四五六七八九十0-9]+']);
  if (!line) return '待整理';
  const match = line.match(/(第[一二三四五六七八九十0-9]+卷|卷[一二三四五六七八九十0-9]+)/);
  return match ? match[1] : '待整理';
}

function inferGenre(texts) {
  const joined = texts.join('\n');
  const genrePatterns = [
    ['港综同人', [/港综/i, /香港.*(警|黑帮|社团)/i, /同人/i]],
    ['历史', [/大明/i, /大清/i, /万历/i, /天启/i, /嘉靖/i, /崇祯/i, /历史/i, /朝廷/i, /古代/i]],
    ['都市', [/都市/i, /商战/i, /黑市/i, /地产/i, /公司/i, /现代/i, /股市/i]],
    ['玄幻', [/玄幻/i, /宗门/i, /灵气/i, /秘境/i, /修行体系/i]],
    ['仙侠', [/仙侠/i, /修仙/i, /飞升/i, /仙门/i, /灵根/i]],
    ['科幻', [/科幻/i, /机甲/i, /星际/i, /未来/i, /赛博/i]],
  ];
  let best = ['待整理', 0];
  for (const [genre, patterns] of genrePatterns) {
    const score = patterns.reduce((sum, pattern) => sum + (pattern.test(joined) ? 1 : 0), 0);
    if (score > best[1]) best = [genre, score];
  }
  return best[1] ? best[0] : '待整理';
}

function inferEra(texts) {
  const patterns = [/([12][0-9]{3}年(?:代)?)/, /((?:洪武|永乐|宣德|正统|景泰|天顺|成化|弘治|正德|嘉靖|隆庆|万历|泰昌|天启|崇祯)[^，。,；;]{0,8})/, /((?:现代|近未来|未来|民国|清末|明末|古代|架空)[^，。,；;]{0,12})/];
  const line = firstMatchingLine(texts, patterns.map((p) => p.source));
  if (!line) return '待整理';
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) return match[1];
  }
  return '待整理';
}

function inferProjectHook(texts) {
  return firstMatchingLine(texts, ['主角', '金手指', '目标', '冲突', '故事']) || '待整理';
}

function inferGoldenFinger(texts) {
  return firstMatchingLine(texts, ['金手指', '系统', '能力', '账簿', '外挂']) || '待整理';
}

function inferMainConflict(texts) {
  return firstMatchingLine(texts, ['冲突', '目标', '主线', '对手', '阻力']) || '待整理';
}

function guessProtagonistName(projectSources, characterCardActions) {
  for (const source of projectSources) {
    const text = readText(source.source);
    for (const pattern of [/(?:主角[：:\s]+)([^\s，。,；;（）()]{2,12})/, /主角([^\s，。,；;（）()]{2,12})/]) {
      const match = text.match(pattern);
      if (match) return match[1].trim();
    }
  }
  if (characterCardActions.length) return path.basename(characterCardActions.slice().sort((a, b) => a.destination.localeCompare(b.destination))[0].destination, '.md');
  return null;
}

function extractCardSummary(text, fallbackName) {
  const lines = meaningfulLines(text);
  let identity = '待整理';
  let core = '待整理';
  for (const line of lines) {
    if (identity === '待整理' && /(身份|职业|出身)/.test(line)) identity = line.replace(/^[^：:]*[:：]\s*/, '');
    if (core === '待整理' && /(性格|核心|标签)/.test(line)) core = line.replace(/^[^：:]*[:：]\s*/, '');
  }
  return {
    name: frontmatterValue(text, 'name') || fallbackName,
    role: frontmatterValue(text, 'role') || '待整理',
    identity,
    core,
    summary: lines[0] || '待整理',
    first_appearance: frontmatterValue(text, 'first_appearance') || '待整理',
  };
}

function inferRelationToProtagonist(text) {
  for (const pattern of [/(?:与主角关系|关系类型|relation_to_protagonist)[：:]\s*(.+)/i, /(盟友|敌人|中立|复杂关系)/i]) {
    const match = text.match(pattern);
    if (match) return (match[1] || match[0]).trim();
  }
  return '待整理';
}

function inferCharacterGoal(text) {
  for (const line of meaningfulLines(text)) {
    const compact = line.replace(/\s+/g, ' ').trim();
    if (/(目标|想要|欲望|诉求)/.test(compact)) return compact.replace(/^[^：:]*[:：]\s*/, '');
  }
  return '待整理';
}

function chapterNumberFromPath(filePath) {
  const match = path.basename(filePath).match(/-(\d+)\.md$/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function readPathWithSourceMap(filePath, sourceMap) {
  if (fileExists(filePath)) return readText(filePath);
  const source = sourceMap.get(filePath);
  return source ? readText(source) : '';
}

function collectCardInfos(cardPaths, sourceMap) {
  return cardPaths.slice().sort().map((filePath) => {
    const text = readPathWithSourceMap(filePath, sourceMap);
    return {
      ...extractCardSummary(text, path.basename(filePath, '.md')),
      path: filePath,
      relation_to_protagonist: inferRelationToProtagonist(text),
      goal: inferCharacterGoal(text),
      status: frontmatterValue(text, 'status') || '待整理',
      text,
    };
  });
}

function collectCharacterMentions(chapterPaths, sourceMap, names) {
  const mentions = Object.fromEntries(names.map((name) => [name, []]));
  for (const filePath of chapterPaths) {
    const chapterNumber = chapterNumberFromPath(filePath);
    if (chapterNumber === null) continue;
    const text = readPathWithSourceMap(filePath, sourceMap);
    for (const name of names) {
      if (name.length >= 2 && text.includes(name)) mentions[name].push(chapterNumber);
    }
  }
  return mentions;
}

function relationPairsFromCards(cardInfos) {
  const names = cardInfos.map((info) => info.name);
  const seen = new Set();
  const rows = [];
  for (const info of cardInfos) {
    for (const other of names) {
      if (other === info.name || !info.text.includes(other)) continue;
      const key = [info.name, other].sort().join('::');
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push([info.name, other, '人物卡互相提及']);
    }
  }
  return rows;
}

function extractItemSummary(text) {
  return meaningfulLines(text)[0]?.replace(/\s+/g, ' ').trim() || '待整理';
}

function extractHookLine(text) {
  for (const line of meaningfulLines(text)) {
    const compact = line.replace(/\s+/g, ' ').trim();
    if (compact.includes('钩子')) return compact.replace(/^[^：:]*[:：]\s*/, '');
  }
  return '待整理';
}

function buildChapterQueueRows(outlinePaths, chapterPaths, sourceMap, limit = 8) {
  const rows = [];
  const outlineMap = new Map(outlinePaths.map((filePath) => [chapterNumberFromPath(filePath), filePath]).filter(([n]) => n !== null));
  const chapterMap = new Map(chapterPaths.map((filePath) => [chapterNumberFromPath(filePath), filePath]).filter(([n]) => n !== null));
  const numbers = [...new Set([...outlineMap.keys(), ...chapterMap.keys()])].sort((a, b) => a - b).slice(0, limit);
  for (const number of numbers) {
    const outlinePath = outlineMap.get(number);
    const chapterPath = chapterMap.get(number);
    const text = outlinePath || chapterPath ? readPathWithSourceMap(outlinePath || chapterPath, sourceMap) : '';
    rows.push({
      chapter: `第${number}章`,
      task: extractItemSummary(text),
      emotion: '待整理',
      hook: extractHookLine(text),
      status: chapterPath ? '已成稿' : '待写作',
    });
  }
  return rows;
}

function buildTimelineRows(chapterPaths, sourceMap, limit = 8) {
  return chapterPaths.slice().sort().slice(0, limit).map((filePath) => {
    const chapterNumber = chapterNumberFromPath(filePath);
    const text = readPathWithSourceMap(filePath, sourceMap);
    const storyDate = firstMatchingLine([text], ['[12][0-9]{3}年', '(?:洪武|永乐|宣德|正统|景泰|天顺|成化|弘治|正德|嘉靖|隆庆|万历|泰昌|天启|崇祯)', '(?:初春|盛夏|深秋|寒冬|春|夏|秋|冬)']) || '待整理';
    return { chapter: `第${chapterNumber}章`, story_date: storyDate, event: extractItemSummary(text) };
  });
}

function chapterNumberFromLabel(label) {
  const match = String(label).match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function buildProjectFile(title, sourceItems, roadmapItems, protagonistName, today) {
  const cleanTitle = cleanProjectTitle(title);
  const texts = collectTexts(sourceItems);
  const conflictTexts = texts.concat(collectTexts(roadmapItems));
  const sourceSection = sourceItems.slice().sort((a, b) => a.rel.localeCompare(b.rel)).slice(0, 5)
    .map((item) => `### \`${item.rel}\`\n${sourceExcerpt(readText(item.source))}`).join('\n\n') || '暂无明确设定源文件，请人工补齐。';
  return `---
title: ${cleanTitle}
genre: ${inferGenre(texts)}
era: ${inferEra(texts)}
target_words: 待定
chapter_words: 3000
target_chapters: 待定
status: 导入待整理
created: ${today}
updated: ${today}
---

# 《${cleanTitle}》项目设定

## 导入说明

- 本文件由 \`map-base.cjs\` 根据已有资料初始化。
- 当前重点是把散落资料归并成可持续创作的结构，不假装已经完成高质量策划。
- 请人工补齐世界观、主线、禁忌、金手指限制和长期路线。

## 已识别来源

${markdownSources(sourceItems)}

## 原始资料摘录

${sourceSection}

## 初步提取

- **主角**：${protagonistName || '待整理'}
- **题材**：${inferGenre(texts)}
- **时代/世界线**：${inferEra(texts)}
- **一句话抓手**：${inferProjectHook(texts)}
- **金手指/核心优势线索**：${inferGoldenFinger(texts)}
- **主线/核心冲突线索**：${inferMainConflict(conflictTexts)}

## 待整理

- [ ] 补齐一句话卖点
- [ ] 补齐世界观与社会规则
- [ ] 补齐主角成长主线
- [ ] 明确金手指/核心优势及限制
- [ ] 建立全书弧线与卷级规划
`;
}

function buildCharactersFile(title, protagonistName, cardInfos, mentions, relationPairs, sourceItems, today) {
  const protagonist = protagonistName || '待整理';
  const protagonistInfo = cardInfos.find((item) => item.name === protagonist);
  const cardsTable = cardInfos.length ? cardInfos.map((info) => {
    let firstAppearance = info.first_appearance;
    if (firstAppearance === '待整理' && mentions[info.name]?.length) firstAppearance = `第${mentions[info.name][0]}章`;
    let currentStatus = info.status;
    if (currentStatus === '待整理' && mentions[info.name]?.length) currentStatus = `已登场到第${mentions[info.name][mentions[info.name].length - 1]}章`;
    const identityOrRole = info.identity !== '待整理' ? info.identity : info.role;
    return `| ${info.name} | ${identityOrRole} | ${info.relation_to_protagonist} | ${info.goal} | ${firstAppearance} | ${currentStatus} | \`characters/${path.basename(info.path)}\` |`;
  }).join('\n') : '| 暂无 | - | - | - | - | - | - |';
  const relationTable = relationPairs.length ? relationPairs.slice(0, 8).map(([left, right, note]) => `| ${left} | ${right} | 相关 | ${note} | 待整理 |`).join('\n') : '| 暂无 | - | - | - | - |';
  const currentFocusTable = cardInfos.length ? cardInfos.slice(0, 5).map((info) => {
    const latest = mentions[info.name] || [];
    return `| ${info.name} | ${info.goal} | ${latest.length ? `第${latest[latest.length - 1]}章` : '-'} | ${info.summary} |`;
  }).join('\n') : '| 暂无 | - | - | - |';
  return `---
project: ${cleanProjectTitle(title)}
updated: ${today}
total_characters: ${cardInfos.length}
---

# 人物总表

## 导入说明

- 本文件由 \`map-base.cjs\` 初始化。
- 已复制的人物单卡请继续补充到 \`characters/\` 目录。
- 若当前只有零散人物资料，请先把关系、阵营和当前状态整理到这里。

## 已识别来源

${markdownSources(sourceItems)}

## 已导入人物卡

| 姓名 | 身份/阵营 | 与主角关系 | 当前目标 | 首次登场 | 当前状态 | 详细卡片 |
|------|-----------|------------|----------|----------|----------|----------|
${cardsTable}

## 主角锚点

### ${protagonist}

- **身份**：${protagonistInfo ? protagonistInfo.identity : '待整理'}
- **当前立场**：待整理
- **性格核心**：${protagonistInfo ? protagonistInfo.core : '待整理'}
- **当前目标**：待整理
- **阶段状态**：待整理
- **首次登场**：${protagonistInfo ? protagonistInfo.first_appearance : '待整理'}
- **详细卡片**：\`characters/${protagonist}.md\`

## 已提取人物摘要

${cardInfos.length ? cardInfos.map((info) => `- **${info.name}**：${info.summary}`).join('\n') : '- 暂无可提取人物摘要'}

## 关系矩阵

| 人物A | 人物B | 当前关系 | 冲突/纽带 | 预计变化 |
|-------|-------|----------|-----------|----------|
${relationTable}

## 当前重点人物

| 人物 | 当前戏份任务 | 最近变化 | 下次需要处理的点 |
|------|--------------|----------|------------------|
${currentFocusTable}

## 待整理

- [ ] 补齐主角与核心人物
- [ ] 补齐关系矩阵
- [ ] 补齐当前重点人物与状态变化
`;
}

function buildTimelineFile(title, sourceItems, timelineRows, today) {
  const texts = collectTexts(sourceItems);
  const anchors = [];
  for (const text of texts) {
    for (const line of meaningfulLines(text)) {
      const compact = line.replace(/\s+/g, ' ').trim();
      if ((/[12][0-9]{3}年/.test(compact) || /(?:洪武|永乐|宣德|正统|景泰|天顺|成化|弘治|正德|嘉靖|隆庆|万历|泰昌|天启|崇祯)/.test(compact) || /(?:初春|盛夏|深秋|寒冬|春|夏|秋|冬)/.test(compact)) && !anchors.includes(compact)) {
        anchors.push(compact);
        if (anchors.length >= 5) break;
      }
    }
    if (anchors.length >= 5) break;
  }
  const sourceSection = sourceItems.slice().sort((a, b) => a.rel.localeCompare(b.rel)).slice(0, 5)
    .map((item) => `### \`${item.rel}\`\n${sourceExcerpt(readText(item.source))}`).join('\n\n') || '暂无明确时间线源文件，请人工补齐。';
  return `---
project: ${cleanProjectTitle(title)}
current_story_date: ${anchors[0] || inferEra(texts)}
updated: ${today}
---

# 时间线

## 导入说明

- 本文件由 \`map-base.cjs\` 初始化。
- 现有时间资料已识别，但尚未完全结构化。
- 请先把章节时间、卷跨度和关键历史/世界事件整理成表格。

## 已识别来源

${markdownSources(sourceItems)}

## 原始资料摘录

${sourceSection}

## 初步提取时间锚点

${anchors.length ? anchors.map((item) => `- ${item}`).join('\n') : '- 待整理'}

## 已导入章节时间线

| 章节 | 故事时间 | 距上一章间隔 | 关键事件 | 人物状态变化 | 需要回写文件 |
|------|----------|--------------|----------|--------------|--------------|
${timelineRows.length ? timelineRows.map((row) => `| ${row.chapter} | ${row.story_date} | 待整理 | ${row.event} | 待整理 | \`STATE.md\` |`).join('\n') : '| 暂无 | 待整理 | - | 待整理 | 待整理 | `STATE.md` |'}

## 待整理

- [ ] 建立章节时间线
- [ ] 对齐关键事件锚点
- [ ] 标出时间风险与待核实项
`;
}

function buildRoadmapFile(title, sourceItems, chapterNumbers, chapterQueueRows, today) {
  const texts = collectTexts(sourceItems);
  const roadmapLines = [];
  for (const text of texts) {
    for (const line of meaningfulLines(text)) {
      const compact = line.replace(/\s+/g, ' ').trim();
      if (['卷', '阶段', '目标', '站稳脚跟', '高潮', '转折', '路线'].some((keyword) => compact.includes(keyword)) && !roadmapLines.includes(compact)) {
        roadmapLines.push(compact);
        if (roadmapLines.length >= 5) break;
      }
    }
    if (roadmapLines.length >= 5) break;
  }
  const sourceSection = sourceItems.slice().sort((a, b) => a.rel.localeCompare(b.rel)).slice(0, 5)
    .map((item) => `### \`${item.rel}\`\n${sourceExcerpt(readText(item.source))}`).join('\n\n') || '暂无明确卷纲/路线图源文件，请人工补齐。';
  const currentArc = inferCurrentArc(texts);
  return `---
project: ${cleanProjectTitle(title)}
target_words: 待定
target_chapters: 待定
current_arc: ${currentArc}
updated: ${today}
---

# 故事规划

## 导入说明

- 本文件由 \`map-base.cjs\` 初始化。
- 当前可能已存在卷纲或阶段规划来源，但尚未合并成统一路线图。

## 已识别来源

${markdownSources(sourceItems)}

## 原始资料摘录

${sourceSection}

## 当前导入覆盖

- 已导入正文章节范围：${chapterRangeText(chapterNumbers)}
- 当前卷/阶段：${currentArc}
- 下一步优先：补齐当前卷目标，再决定后续章节规划

## 初步提取路线信息

${roadmapLines.length ? roadmapLines.map((item) => `- ${item}`).join('\n') : '- 待整理'}

## 当前卷章节队列

| 章节 | 章节任务 | 情绪目标 | 预计钩子 | 状态 |
|------|----------|----------|----------|------|
${chapterQueueRows.length ? chapterQueueRows.map((row) => `| ${row.chapter} | ${row.task} | ${row.emotion} | ${row.hook} | ${row.status} |`).join('\n') : '| 暂无 | 待整理 | 待整理 | 待整理 | 未开始 |'}

## 待整理

- [ ] 明确当前卷与下一卷
- [ ] 补齐章节范围与阶段目标
- [ ] 补齐卷末钩子与长线伏笔
`;
}

function buildStateFile(title, currentArc, currentChapter, latestOutline, upcomingOutlineNumbers, totalWords, importedCards, today) {
  const nextChapter = currentChapter > 0 ? currentChapter + 1 : 1;
  const status = currentChapter > 0 ? '连载中' : '导入待整理';
  const latest = currentChapter > 0 ? `已导入到第${currentChapter}章` : '完成资料导入';
  let nextGoal = `第${nextChapter}章规划或核对`;
  if (latestOutline > currentChapter) nextGoal = `第${currentChapter + 1}章写作或核对`;
  const upcomingTable = upcomingOutlineNumbers.length
    ? upcomingOutlineNumbers.slice(0, 3).map((num) => `| 第${num}章 | 已有大纲待写作 | 待整理 | 待整理 | 待写作 |`).join('\n')
    : `| 第${nextChapter}章 | 待规划 | 待整理 | 待整理 | 未开始 |`;
  return `---
project: ${cleanProjectTitle(title)}
status: ${status}
current_arc: ${currentArc}
current_chapter: ${currentChapter}
total_words: ${totalWords}
last_updated: ${today}
---

# 当前状态

## 进度快照

| 项目 | 当前值 |
|------|--------|
| 当前卷 | ${currentArc} |
| 当前章节 | 第${currentChapter}章 |
| 总字数 | ${totalWords} |
| 最新完成内容 | ${latest} |
| 下一目标 | ${nextGoal} |

## 当前创作焦点

- **本阶段任务**：核对导入资料，补齐核心结构文件
- **当前最重要的矛盾**：统一旧资料与标准项目结构
- **本周/本轮要完成的内容**：检查 \`reviews/map-base-report.md\`
- **绝对不能忘的设定约束**：先核资料，再继续写新章节

## 人物当前状态

| 人物 | 当前状态 | 最新相关章节 | 下次出场任务 |
|------|----------|--------------|--------------|
| 已导入人物卡 ${importedCards} 份 | 待整理 | - | 补齐总表 |

## 接下来 3 章

| 章节 | 任务 | 目标情绪 | 关键人物 | 状态 |
|------|------|----------|----------|------|
${upcomingTable}

## 待办清单

- [ ] 检查 \`reviews/map-base-report.md\`
- [ ] 补齐 \`PROJECT.md\` 的关键信息
- [ ] 补齐 \`ROADMAP.md\` 与 \`TIMELINE.md\`
- [ ] 决定下一章的规划与写作范围
`;
}

function buildReport(sourceDir, dryRun, candidates, planned, generated, skipped, unresolved) {
  const kindCounts = new Map();
  for (const candidate of candidates) kindCounts.set(candidate.kind, (kindCounts.get(candidate.kind) || 0) + 1);
  const countLines = [...kindCounts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([kind, count]) => `- \`${kind}\`: ${count}`).join('\n') || '- 无';
  const classifiedRows = candidates.slice().sort((a, b) => a.rel.localeCompare(b.rel)).map((candidate) => `| \`${candidate.rel}\` | ${candidate.kind} | ${candidate.reason} |`).join('\n') || '| 无 | - | - |';
  const actionRows = planned.map((action) => `| \`${path.relative(sourceDir, action.source).split(path.sep).join('/')}\` | \`${path.relative(sourceDir, action.destination).split(path.sep).join('/')}\` | ${action.kind} | ${action.mode} |`).join('\n') || '| 无 | - | - | - |';
  return `# map-base Report

## Summary

- Source directory: \`${sourceDir}\`
- Mode: \`${dryRun ? 'dry-run' : 'write'}\`
- Scanned files: ${candidates.length}
- Planned copy actions: ${planned.length}
- Generated core files: ${generated.length}

## Kind Counts

${countLines}

## Classification

| Source | Kind | Reason |
|--------|------|--------|
${classifiedRows}

## Planned Actions

| Source | Destination | Kind | Mode |
|--------|-------------|------|------|
${actionRows}

## Generated Core Files

${generated.join('\n') || '- 无'}

## Skipped

${skipped.join('\n') || '- 无'}

## Needs Review

${unresolved.join('\n') || '- 无'}
`;
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFile(filePath, content, force) {
  if (fileExists(filePath) && !force) return [false, `skip existing \`${path.basename(filePath)}\``];
  ensureParent(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
  return [true, `write \`${path.basename(filePath)}\``];
}

function main(argv = process.argv.slice(2)) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    return 1;
  }

  const sourceDir = path.resolve(args.source_dir);
  if (!fileExists(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    console.error(`source directory not found: ${sourceDir}`);
    return 2;
  }

  const coreCount = CORE_FILES.filter((name) => fileExists(path.join(sourceDir, name))).length;
  if (coreCount >= 3 && !args.merge) {
    console.log('检测到当前目录已经接近或已经是结构化项目。');
    console.log('如果需要继续吸收散落资料，请使用 /novel:map-base --merge');
    return 0;
  }

  if (!args.dry_run) {
    ['chapters/draft', 'chapters/outlines', 'characters', 'research', 'reviews'].forEach((dir) => {
      fs.mkdirSync(path.join(sourceDir, dir), { recursive: true });
    });
  }

  const candidates = scanCandidates(sourceDir);
  const actionable = candidates.filter((item) => item.kind !== 'unknown' && item.kind !== 'ignored_generated' && !item.kind.startsWith('existing_'));
  if (!actionable.length) {
    console.log('未发现足够的已有小说材料，无法执行 map-base。');
    console.log('空目录或只有很少想法时，直接运行：/novel:new-project');
    console.log('如果你有核心设定文档，请把文档放进当前目录后再运行：/novel:map-base');
    return 1;
  }

  const planned = [];
  const skipped = [];
  const unresolved = [];
  const usedDestinations = new Set();
  const chapterDestinations = new Map();

  for (const candidate of actionable.slice().sort((a, b) => (b.confidence - a.confidence) || a.rel.localeCompare(b.rel))) {
    const destination = resolveCopyDestination(sourceDir, candidate, usedDestinations);
    if (!destination) continue;
    if ((candidate.kind === 'chapter' || candidate.kind === 'outline') && chapterDestinations.has(destination)) {
      unresolved.push(`章节冲突：\`${candidate.rel}\` 与 \`${chapterDestinations.get(destination).rel}\` 都映射到 \`${path.relative(sourceDir, destination).split(path.sep).join('/')}\``);
      continue;
    }
    if (candidate.kind === 'chapter' || candidate.kind === 'outline') chapterDestinations.set(destination, candidate);
    usedDestinations.add(destination);
    planned.push({ source: candidate.source, destination, kind: candidate.kind, mode: 'copy', reason: candidate.reason });
  }

  const sourceMap = new Map(planned.map((action) => [action.destination, action.source]));
  if (!args.dry_run) {
    for (const action of planned) {
      if (path.resolve(action.source) === path.resolve(action.destination)) {
        skipped.push(`already normalized: \`${path.relative(sourceDir, action.destination).split(path.sep).join('/')}\``);
        continue;
      }
      if (fileExists(action.destination) && !args.force) {
        skipped.push(`target exists: \`${path.relative(sourceDir, action.destination).split(path.sep).join('/')}\``);
        continue;
      }
      ensureParent(action.destination);
      fs.copyFileSync(action.source, action.destination);
    }
  }

  const projectSources = candidates.filter((item) => item.kind === 'project_source' || item.kind === 'existing_project');
  const timelineSources = candidates.filter((item) => item.kind === 'timeline_source' || item.kind === 'existing_timeline');
  const roadmapSources = candidates.filter((item) => item.kind === 'roadmap_source' || item.kind === 'existing_roadmap');
  const characterIndexes = candidates.filter((item) => item.kind === 'characters_index' || item.kind === 'existing_characters');
  const characterCards = planned.filter((item) => item.kind === 'character_card');
  const diskChapters = chapterFilesOnDisk(sourceDir);
  const diskOutlines = outlineFilesOnDisk(sourceDir);
  const diskCards = characterFilesOnDisk(sourceDir);
  const plannedChapterPaths = args.dry_run ? planned.filter((item) => item.kind === 'chapter' && !diskChapters.includes(item.destination)).map((item) => item.destination) : [];
  const plannedOutlinePaths = args.dry_run ? planned.filter((item) => item.kind === 'outline' && !diskOutlines.includes(item.destination)).map((item) => item.destination) : [];
  const plannedCardPaths = args.dry_run ? planned.filter((item) => item.kind === 'character_card' && !diskCards.includes(item.destination)).map((item) => item.destination) : [];
  const allChapterPaths = args.dry_run ? [...diskChapters, ...plannedChapterPaths].sort() : diskChapters;
  const allOutlinePaths = args.dry_run ? [...diskOutlines, ...plannedOutlinePaths].sort() : diskOutlines;
  const allCardPaths = args.dry_run ? [...diskCards, ...plannedCardPaths].sort() : diskCards;
  const currentChapter = Math.max(0, ...chapterNumbersFromPaths(allChapterPaths, 'chapter-(\\d+)\\.md$'));
  const latestOutline = Math.max(0, ...chapterNumbersFromPaths(allOutlinePaths, 'outline-(\\d+)\\.md$'));
  let totalWords = 0;
  for (const chapterFile of allChapterPaths) {
    if (fileExists(chapterFile)) totalWords += readText(chapterFile).length;
    else {
      const action = planned.find((item) => item.destination === chapterFile);
      if (action) totalWords += readText(action.source).length;
    }
  }
  const importedNumbers = chapterNumbersFromPaths([...allChapterPaths, ...allOutlinePaths], '(?:chapter|outline)-(\\d+)\\.md$');
  const importedCardCount = allCardPaths.length;
  const upcomingOutlineNumbers = chapterNumbersFromPaths(allOutlinePaths, 'outline-(\\d+)\\.md$').filter((num) => num > currentChapter);
  let inferredTitle = fileExists(path.join(sourceDir, 'PROJECT.md')) ? frontmatterValue(readText(path.join(sourceDir, 'PROJECT.md')), 'title') : null;
  if (!inferredTitle) inferredTitle = projectSources.slice().sort((a, b) => (b.confidence - a.confidence) || a.rel.localeCompare(b.rel))[0]?.title || path.basename(sourceDir);
  inferredTitle = cleanProjectTitle(inferredTitle);
  const today = new Date().toISOString().slice(0, 10);
  const currentArc = inferCurrentArc(collectTexts(roadmapSources));
  const cardInfos = collectCardInfos(allCardPaths, sourceMap);
  let protagonistName = guessProtagonistName(projectSources, characterCards);
  if (!protagonistName) protagonistName = cardInfos.find((info) => info.role === '主角')?.name || null;
  const names = cardInfos.map((info) => info.name).filter((name) => name.length >= 2);
  const mentions = collectCharacterMentions(allChapterPaths, sourceMap, names);
  const relationPairs = relationPairsFromCards(cardInfos);
  const chapterQueueRows = buildChapterQueueRows(allOutlinePaths, allChapterPaths, sourceMap);
  const timelineRows = buildTimelineRows(allChapterPaths, sourceMap);

  const coreWrites = [];
  if (!fileExists(path.join(sourceDir, 'PROJECT.md')) || args.force) coreWrites.push([path.join(sourceDir, 'PROJECT.md'), buildProjectFile(inferredTitle, projectSources, roadmapSources, protagonistName, today)]);
  if (!fileExists(path.join(sourceDir, 'CHARACTERS.md')) || args.force) coreWrites.push([path.join(sourceDir, 'CHARACTERS.md'), buildCharactersFile(inferredTitle, protagonistName, cardInfos, mentions, relationPairs, characterIndexes, today)]);
  if (!fileExists(path.join(sourceDir, 'TIMELINE.md')) || args.force) coreWrites.push([path.join(sourceDir, 'TIMELINE.md'), buildTimelineFile(inferredTitle, timelineSources, timelineRows, today)]);
  if (!fileExists(path.join(sourceDir, 'ROADMAP.md')) || args.force) coreWrites.push([path.join(sourceDir, 'ROADMAP.md'), buildRoadmapFile(inferredTitle, roadmapSources, importedNumbers, chapterQueueRows, today)]);
  if (!fileExists(path.join(sourceDir, 'STATE.md')) || args.force) coreWrites.push([path.join(sourceDir, 'STATE.md'), buildStateFile(inferredTitle, currentArc, currentChapter, latestOutline, upcomingOutlineNumbers, totalWords, importedCardCount, today)]);

  const generated = [];
  for (const [filePath, content] of coreWrites) {
    if (args.dry_run) generated.push(`- would generate \`${path.basename(filePath)}\``);
    else {
      const [written, message] = writeFile(filePath, content, args.force);
      if (written) generated.push(`- ${message}`);
      else skipped.push(`- ${message}`);
    }
  }

  for (const candidate of candidates) {
    if (candidate.kind === 'unknown') unresolved.push(`- 未分类：\`${candidate.rel}\``);
  }

  const report = buildReport(sourceDir, args.dry_run, candidates, planned, generated, skipped.map((item) => item.startsWith('- ') ? item : `- ${item}`), unresolved);
  if (args.dry_run) {
    console.log(report);
  } else {
    fs.writeFileSync(path.join(sourceDir, 'reviews', 'map-base-report.md'), report, 'utf8');
    console.log('map-base completed');
    console.log(`source: ${sourceDir}`);
    console.log(`report: ${path.join(sourceDir, 'reviews', 'map-base-report.md')}`);
    console.log(`planned copies: ${planned.length}`);
    console.log(`generated core files: ${generated.length}`);
    if (unresolved.length) console.log(`needs review: ${unresolved.length}`);
  }

  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  classifyFile,
  cleanProjectTitle,
  extractChapterNumber,
  inferCharacterName,
  main,
  parseArgs,
  scanCandidates,
};
