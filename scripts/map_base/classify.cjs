const path = require('node:path');

const {
  CHARACTER_CARD_KEYWORDS,
  CHARACTER_INDEX_KEYWORDS,
  CORE_FILES,
  GENERIC_CHARACTER_NAMES,
  OUTLINE_KEYWORDS,
  PROJECT_KEYWORDS,
  RESEARCH_KEYWORDS,
  REVIEW_BODY_KEYWORDS,
  REVIEW_NAME_KEYWORDS,
  ROADMAP_KEYWORDS,
  TIMELINE_KEYWORDS,
} = require('./constants.cjs');
const {
  extractChapterNumber,
  firstHeading,
  frontmatterValue,
  inferTitle,
  meaningfulLines,
} = require('./parse.cjs');

function containsAny(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function countContains(text, keywords) {
  return keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
}

function scoreProjectSource({ filePath, title, text, bodySignals }) {
  const fileStem = path.basename(filePath, path.extname(filePath)).toLowerCase();
  const loweredTitle = String(title || '').toLowerCase();

  let score = 0;
  const reasons = [];

  if (/(设定|项目设定|小说设定|作品设定|世界观|梗概|简介|project)/i.test(fileStem)) {
    score += 3;
    reasons.push('文件名命中设定信号');
  }

  if (/(设定|项目设定|小说设定|作品设定|世界观|梗概|简介|project)/i.test(loweredTitle)) {
    score += 3;
    reasons.push('标题命中设定信号');
  }

  const frontmatterHits = ['title', 'genre', 'era', 'target_words', 'chapter_words', 'target_chapters']
    .filter((key) => frontmatterValue(text, key));
  if (frontmatterHits.length > 0) {
    score += Math.min(3, frontmatterHits.length);
    reasons.push(`frontmatter 命中 ${frontmatterHits.join(', ')}`);
  }

  const conceptKeywords = ['主角', '金手指', '世界观', '主线', '核心冲突', '一句话', '故事开始', '背景'];
  const conceptHits = countContains(bodySignals, conceptKeywords);
  if (conceptHits > 0) {
    score += Math.min(3, conceptHits);
    reasons.push(`正文命中 ${conceptHits} 个核心设定信号`);
  }

  const competingSignals = [
    ...TIMELINE_KEYWORDS,
    ...ROADMAP_KEYWORDS,
    ...CHARACTER_INDEX_KEYWORDS,
    ...CHARACTER_CARD_KEYWORDS,
    ...REVIEW_NAME_KEYWORDS,
    ...REVIEW_BODY_KEYWORDS,
    ...RESEARCH_KEYWORDS,
  ];
  const competingHits = countContains(bodySignals, competingSignals);
  if (competingHits > 0) {
    score -= Math.min(4, competingHits);
    reasons.push(`存在 ${competingHits} 个竞争分类信号`);
  }

  return {
    score,
    reason: reasons.join('；') || '项目设定评分不足',
  };
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

function classifyFile(filePath, sourceDir, readText) {
  const text = readText(filePath);
  const title = inferTitle(text, filePath);
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
  const projectSourceScore = scoreProjectSource({ filePath, title, text, bodySignals });
  if (projectSourceScore.score >= 4 && containsAny(bodySignals, PROJECT_KEYWORDS)) {
    return {
      source: filePath,
      rel,
      kind: 'project_source',
      confidence: Math.min(95, 70 + projectSourceScore.score * 3),
      reason: projectSourceScore.reason,
      title,
    };
  }
  return { source: filePath, rel, kind: 'unknown', confidence: 10, reason: '未命中稳定分类规则', title };
}

module.exports = {
  classifyFile,
  containsAny,
  inferCharacterName,
  scoreProjectSource,
};
