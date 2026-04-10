const path = require('node:path');

function buildProjectFile({ title, sourceItems, roadmapItems, protagonistName, today, cleanProjectTitle, collectTexts, inferGenre, inferEra, inferProjectHook, inferGoldenFinger, inferMainConflict, markdownSources, meaningfulLines, sourceExcerpt, readText }) {
  const cleanTitle = cleanProjectTitle(title);
  const texts = collectTexts(sourceItems, readText);
  const conflictTexts = texts.concat(collectTexts(roadmapItems, readText));
  const sourceSection = sourceItems.slice().sort((a, b) => a.rel.localeCompare(b.rel)).slice(0, 5)
    .map((item) => `### \`${item.rel}\`\n${sourceExcerpt(readText(item.source))}`).join('\n\n') || '暂无明确设定源文件，请人工补齐。';
  return `---
title: ${cleanTitle}
genre: ${inferGenre(texts)}
era: ${inferEra(texts, meaningfulLines)}
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
- **时代/世界线**：${inferEra(texts, meaningfulLines)}
- **一句话抓手**：${inferProjectHook(texts, meaningfulLines)}
- **金手指/核心优势线索**：${inferGoldenFinger(texts, meaningfulLines)}
- **主线/核心冲突线索**：${inferMainConflict(conflictTexts, meaningfulLines)}

## 待整理

- [ ] 补齐一句话卖点
- [ ] 补齐世界观与社会规则
- [ ] 补齐主角成长主线
- [ ] 明确金手指/核心优势及限制
- [ ] 建立全书弧线与卷级规划
`;
}

function buildCharactersFile({ title, protagonistName, cardInfos, mentions, relationPairs, sourceItems, today, cleanProjectTitle, markdownSources }) {
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

function buildTimelineFile({ title, sourceItems, timelineRows, today, cleanProjectTitle, collectTexts, inferEra, meaningfulLines, markdownSources, sourceExcerpt, readText }) {
  const texts = collectTexts(sourceItems, readText);
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

function buildRoadmapFile({ title, sourceItems, chapterNumbers, chapterQueueRows, today, cleanProjectTitle, collectTexts, inferCurrentArc, meaningfulLines, markdownSources, sourceExcerpt, readText, chapterRangeText }) {
  const texts = collectTexts(sourceItems, readText);
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
  const currentArc = inferCurrentArc(texts, meaningfulLines);
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

function buildStateFile({ title, currentArc, currentChapter, latestOutline, upcomingOutlineNumbers, totalWords, importedCards, today, cleanProjectTitle }) {
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

function buildReport({ sourceDir, dryRun, candidates, planned, generated, skipped, unresolved }) {
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

module.exports = {
  buildCharactersFile,
  buildProjectFile,
  buildReport,
  buildRoadmapFile,
  buildStateFile,
  buildTimelineFile,
};
