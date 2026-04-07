#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const {
  CORE_FILES,
  IGNORED_DIRS,
  STRUCTURED_DIRS,
  TEXT_SUFFIXES,
} = require('./map_base/constants.cjs');
const {
  cleanProjectTitle,
  extractChapterNumber,
  firstHeading,
  frontmatterValue,
  inferTitle,
  meaningfulLines,
  normalizeSlug,
  sourceExcerpt,
} = require('./map_base/parse.cjs');
const {
  classifyFile,
  containsAny,
  inferCharacterName,
} = require('./map_base/classify.cjs');
const {
  scanCandidates: scanCandidatesImpl,
} = require('./map_base/scan.cjs');
const {
  buildCopyPlan,
} = require('./map_base/resolve.cjs');
const {
  buildCharactersFile,
  buildProjectFile,
  buildReport,
  buildRoadmapFile,
  buildStateFile,
  buildTimelineFile,
} = require('./map_base/render.cjs');
const {
  buildChapterQueueRows,
  buildTimelineRows,
  chapterNumberFromLabel,
  collectCardInfos,
  collectCharacterMentions,
  collectTexts,
  firstMatchingLine,
  guessProtagonistName,
  inferCurrentArc,
  inferEra,
  inferGenre,
  inferGoldenFinger,
  inferMainConflict,
  inferProjectHook,
  relationPairsFromCards,
} = require('./map_base/synthesize.cjs');

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

function scanCandidates(sourceDir) {
  return scanCandidatesImpl(sourceDir, readText);
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

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeFile(filePath, content, force) {
  if (fileExists(filePath) && !force) return [false, `skip existing \`${path.basename(filePath)}\``];
  ensureParent(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
  return [true, `write \`${path.basename(filePath)}\``];
}

function buildScanResult(sourceDir, candidates) {
  return {
    sourceDir,
    candidates,
    actionable: candidates.filter((item) => item.kind !== 'unknown' && item.kind !== 'ignored_generated' && !item.kind.startsWith('existing_')),
  };
}

function buildPlanResult({ sourceDir, scanResult, force, dryRun }) {
  const { planned, unresolved } = buildCopyPlan(sourceDir, scanResult.actionable);
  const sourceMap = new Map(planned.map((action) => [action.destination, action.source]));

  const projectSources = scanResult.candidates.filter((item) => item.kind === 'project_source' || item.kind === 'existing_project');
  const timelineSources = scanResult.candidates.filter((item) => item.kind === 'timeline_source' || item.kind === 'existing_timeline');
  const roadmapSources = scanResult.candidates.filter((item) => item.kind === 'roadmap_source' || item.kind === 'existing_roadmap');
  const characterIndexes = scanResult.candidates.filter((item) => item.kind === 'characters_index' || item.kind === 'existing_characters');
  const characterCards = planned.filter((item) => item.kind === 'character_card');
  const diskChapters = chapterFilesOnDisk(sourceDir);
  const diskOutlines = outlineFilesOnDisk(sourceDir);
  const diskCards = characterFilesOnDisk(sourceDir);
  const plannedChapterPaths = planned.filter((item) => item.kind === 'chapter' && !diskChapters.includes(item.destination)).map((item) => item.destination);
  const plannedOutlinePaths = planned.filter((item) => item.kind === 'outline' && !diskOutlines.includes(item.destination)).map((item) => item.destination);
  const plannedCardPaths = planned.filter((item) => item.kind === 'character_card' && !diskCards.includes(item.destination)).map((item) => item.destination);
  const allChapterPaths = [...diskChapters, ...plannedChapterPaths].sort();
  const allOutlinePaths = [...diskOutlines, ...plannedOutlinePaths].sort();
  const allCardPaths = [...diskCards, ...plannedCardPaths].sort();
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
  const currentArc = inferCurrentArc(collectTexts(roadmapSources, readText), meaningfulLines);
  const cardInfos = collectCardInfos(allCardPaths, sourceMap, { fileExists, frontmatterValue, meaningfulLines, readText });
  let protagonistName = guessProtagonistName(projectSources, characterCards, readText);
  if (!protagonistName) protagonistName = cardInfos.find((info) => info.role === '主角')?.name || null;
  const names = cardInfos.map((info) => info.name).filter((name) => name.length >= 2);
  const mentions = collectCharacterMentions(allChapterPaths, sourceMap, names, { fileExists, readText });
  const relationPairs = relationPairsFromCards(cardInfos);
  const chapterQueueRows = buildChapterQueueRows(allOutlinePaths, allChapterPaths, sourceMap, { fileExists, meaningfulLines, readText });
  const timelineRows = buildTimelineRows(allChapterPaths, sourceMap, { fileExists, meaningfulLines, readText });

  const coreWrites = [];
  if (!fileExists(path.join(sourceDir, 'PROJECT.md')) || force) coreWrites.push([path.join(sourceDir, 'PROJECT.md'), buildProjectFile({
    title: inferredTitle, sourceItems: projectSources, roadmapItems: roadmapSources, protagonistName, today,
    cleanProjectTitle, collectTexts, inferGenre, inferEra, inferProjectHook, inferGoldenFinger, inferMainConflict,
    markdownSources, meaningfulLines, sourceExcerpt, readText,
  })]);
  if (!fileExists(path.join(sourceDir, 'CHARACTERS.md')) || force) coreWrites.push([path.join(sourceDir, 'CHARACTERS.md'), buildCharactersFile({
    title: inferredTitle, protagonistName, cardInfos, mentions, relationPairs, sourceItems: characterIndexes,
    today, cleanProjectTitle, markdownSources,
  })]);
  if (!fileExists(path.join(sourceDir, 'TIMELINE.md')) || force) coreWrites.push([path.join(sourceDir, 'TIMELINE.md'), buildTimelineFile({
    title: inferredTitle, sourceItems: timelineSources, timelineRows, today, cleanProjectTitle, collectTexts,
    inferEra, meaningfulLines, markdownSources, sourceExcerpt, readText,
  })]);
  if (!fileExists(path.join(sourceDir, 'ROADMAP.md')) || force) coreWrites.push([path.join(sourceDir, 'ROADMAP.md'), buildRoadmapFile({
    title: inferredTitle, sourceItems: roadmapSources, chapterNumbers: importedNumbers, chapterQueueRows, today,
    cleanProjectTitle, collectTexts, inferCurrentArc, meaningfulLines, markdownSources, sourceExcerpt, readText, chapterRangeText,
  })]);
  if (!fileExists(path.join(sourceDir, 'STATE.md')) || force) coreWrites.push([path.join(sourceDir, 'STATE.md'), buildStateFile({
    title: inferredTitle, currentArc, currentChapter, latestOutline, upcomingOutlineNumbers, totalWords,
    importedCards: importedCardCount, today, cleanProjectTitle,
  })]);

  const reportUnresolved = unresolved.slice();
  for (const candidate of scanResult.candidates) {
    if (candidate.kind === 'unknown') reportUnresolved.push(`- 未分类：\`${candidate.rel}\``);
  }

  return {
    sourceDir,
    dryRun,
    planned,
    coreWrites,
    reportInput: {
      sourceDir,
      dryRun,
      candidates: scanResult.candidates,
      planned,
      unresolved: reportUnresolved,
    },
  };
}

function executeWritePlan(planResult, force) {
  const skipped = [];
  for (const action of planResult.planned) {
    if (path.resolve(action.source) === path.resolve(action.destination)) {
      skipped.push(`target exists: \`${path.relative(planResult.sourceDir, action.destination).split(path.sep).join('/')}\``);
      continue;
    }
    if (fileExists(action.destination) && !force) {
      skipped.push(`target exists: \`${path.relative(planResult.sourceDir, action.destination).split(path.sep).join('/')}\``);
      continue;
    }
    ensureParent(action.destination);
    fs.copyFileSync(action.source, action.destination);
  }

  const generated = [];
  for (const [filePath, content] of planResult.coreWrites) {
    const [written, message] = writeFile(filePath, content, force);
    if (written) generated.push(`- ${message}`);
    else skipped.push(`- ${message}`);
  }

  const report = buildReport({
    ...planResult.reportInput,
    generated,
    skipped: skipped.map((item) => item.startsWith('- ') ? item : `- ${item}`),
  });
  const reportPath = path.join(planResult.sourceDir, 'reviews', 'map-base-report.md');
  fs.writeFileSync(reportPath, report, 'utf8');

  return { generated, skipped, report, reportPath };
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

  const scanResult = buildScanResult(sourceDir, scanCandidates(sourceDir));
  if (!scanResult.actionable.length) {
    console.log('未发现足够的已有小说材料，无法执行 map-base。');
    console.log('空目录或只有很少想法时，直接运行：/novel:new-project');
    console.log('如果你有核心设定文档，请把文档放进当前目录后再运行：/novel:map-base');
    return 1;
  }
  const planResult = buildPlanResult({
    sourceDir,
    scanResult,
    force: args.force,
    dryRun: args.dry_run,
  });
  if (args.dry_run) {
    const generated = planResult.coreWrites.map(([filePath]) => `- would generate \`${path.basename(filePath)}\``);
    console.log(buildReport({
      ...planResult.reportInput,
      generated,
      skipped: [],
    }));
  } else {
    const writeResult = executeWritePlan(planResult, args.force);
    console.log('map-base completed');
    console.log(`source: ${sourceDir}`);
    console.log(`report: ${writeResult.reportPath}`);
    console.log(`planned copies: ${planResult.planned.length}`);
    console.log(`generated core files: ${writeResult.generated.length}`);
    if (planResult.reportInput.unresolved.length) console.log(`needs review: ${planResult.reportInput.unresolved.length}`);
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
