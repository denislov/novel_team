const path = require('node:path');

function collectTexts(items, readText) {
  return items.map((item) => readText(item.source));
}

function firstMatchingLine(texts, patterns, meaningfulLines) {
  for (const text of texts) {
    for (const line of meaningfulLines(text)) {
      const compact = line.replace(/\s+/g, ' ').trim();
      if (patterns.some((pattern) => new RegExp(pattern, 'i').test(compact))) return compact;
    }
  }
  return null;
}

function inferCurrentArc(texts, meaningfulLines) {
  const line = firstMatchingLine(texts, ['第[一二三四五六七八九十0-9]+卷', '卷[一二三四五六七八九十0-9]+'], meaningfulLines);
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

function inferEra(texts, meaningfulLines) {
  const patterns = [/([12][0-9]{3}年(?:代)?)/, /((?:洪武|永乐|宣德|正统|景泰|天顺|成化|弘治|正德|嘉靖|隆庆|万历|泰昌|天启|崇祯)[^，。,；;]{0,8})/, /((?:现代|近未来|未来|民国|清末|明末|古代|架空)[^，。,；;]{0,12})/];
  const line = firstMatchingLine(texts, patterns.map((p) => p.source), meaningfulLines);
  if (!line) return '待整理';
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) return match[1];
  }
  return '待整理';
}

function inferProjectHook(texts, meaningfulLines) {
  return firstMatchingLine(texts, ['主角', '金手指', '目标', '冲突', '故事'], meaningfulLines) || '待整理';
}

function inferGoldenFinger(texts, meaningfulLines) {
  return firstMatchingLine(texts, ['金手指', '系统', '能力', '账簿', '外挂'], meaningfulLines) || '待整理';
}

function inferMainConflict(texts, meaningfulLines) {
  return firstMatchingLine(texts, ['冲突', '目标', '主线', '对手', '阻力'], meaningfulLines) || '待整理';
}

function guessProtagonistName(projectSources, characterCardActions, readText) {
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

function extractCardSummary(text, fallbackName, frontmatterValue, meaningfulLines) {
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

function inferCharacterGoal(text, meaningfulLines) {
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

function readPathWithSourceMap(filePath, sourceMap, fileExists, readText) {
  if (fileExists(filePath)) return readText(filePath);
  const source = sourceMap.get(filePath);
  return source ? readText(source) : '';
}

function collectCardInfos(cardPaths, sourceMap, helpers) {
  const { fileExists, frontmatterValue, meaningfulLines, readText } = helpers;
  return cardPaths.slice().sort().map((filePath) => {
    const text = readPathWithSourceMap(filePath, sourceMap, fileExists, readText);
    return {
      ...extractCardSummary(text, path.basename(filePath, '.md'), frontmatterValue, meaningfulLines),
      path: filePath,
      relation_to_protagonist: inferRelationToProtagonist(text),
      goal: inferCharacterGoal(text, meaningfulLines),
      status: frontmatterValue(text, 'status') || '待整理',
      text,
    };
  });
}

function collectCharacterMentions(chapterPaths, sourceMap, names, helpers) {
  const { fileExists, readText } = helpers;
  const mentions = Object.fromEntries(names.map((name) => [name, []]));
  for (const filePath of chapterPaths) {
    const chapterNumber = chapterNumberFromPath(filePath);
    if (chapterNumber === null) continue;
    const text = readPathWithSourceMap(filePath, sourceMap, fileExists, readText);
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

function extractItemSummary(text, meaningfulLines) {
  return meaningfulLines(text)[0]?.replace(/\s+/g, ' ').trim() || '待整理';
}

function extractHookLine(text, meaningfulLines) {
  for (const line of meaningfulLines(text)) {
    const compact = line.replace(/\s+/g, ' ').trim();
    if (compact.includes('钩子')) return compact.replace(/^[^：:]*[:：]\s*/, '');
  }
  return '待整理';
}

function buildChapterQueueRows(outlinePaths, chapterPaths, sourceMap, helpers, limit = 8) {
  const { fileExists, meaningfulLines, readText } = helpers;
  const rows = [];
  const outlineMap = new Map(outlinePaths.map((filePath) => [chapterNumberFromPath(filePath), filePath]).filter(([n]) => n !== null));
  const chapterMap = new Map(chapterPaths.map((filePath) => [chapterNumberFromPath(filePath), filePath]).filter(([n]) => n !== null));
  const numbers = [...new Set([...outlineMap.keys(), ...chapterMap.keys()])].sort((a, b) => a - b).slice(0, limit);
  for (const number of numbers) {
    const outlinePath = outlineMap.get(number);
    const chapterPath = chapterMap.get(number);
    const text = outlinePath || chapterPath ? readPathWithSourceMap(outlinePath || chapterPath, sourceMap, fileExists, readText) : '';
    rows.push({
      chapter: `第${number}章`,
      task: extractItemSummary(text, meaningfulLines),
      emotion: '待整理',
      hook: extractHookLine(text, meaningfulLines),
      status: chapterPath ? '已成稿' : '待写作',
    });
  }
  return rows;
}

function buildTimelineRows(chapterPaths, sourceMap, helpers, limit = 8) {
  const { fileExists, meaningfulLines, readText } = helpers;
  return chapterPaths.slice().sort().slice(0, limit).map((filePath) => {
    const chapterNumber = chapterNumberFromPath(filePath);
    const text = readPathWithSourceMap(filePath, sourceMap, fileExists, readText);
    const storyDate = firstMatchingLine([text], ['[12][0-9]{3}年', '(?:洪武|永乐|宣德|正统|景泰|天顺|成化|弘治|正德|嘉靖|隆庆|万历|泰昌|天启|崇祯)', '(?:初春|盛夏|深秋|寒冬|春|夏|秋|冬)'], meaningfulLines) || '待整理';
    return { chapter: `第${chapterNumber}章`, story_date: storyDate, event: extractItemSummary(text, meaningfulLines) };
  });
}

function chapterNumberFromLabel(label) {
  const match = String(label).match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

module.exports = {
  buildChapterQueueRows,
  buildTimelineRows,
  chapterNumberFromLabel,
  chapterNumberFromPath,
  collectCardInfos,
  collectCharacterMentions,
  collectTexts,
  extractCardSummary,
  extractHookLine,
  extractItemSummary,
  firstMatchingLine,
  guessProtagonistName,
  inferCharacterGoal,
  inferCurrentArc,
  inferEra,
  inferGenre,
  inferGoldenFinger,
  inferMainConflict,
  inferProjectHook,
  inferRelationToProtagonist,
  readPathWithSourceMap,
  relationPairsFromCards,
};
