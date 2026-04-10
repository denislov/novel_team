#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

function parseArgs(argv) {
  if (argv.length === 0) {
    throw new Error('command required');
  }

  const command = argv[0];
  const args = {
    command,
    root: '.',
    json: false,
    field: '',
    chapter: '',
    next: false,
    kind: '',
    range_text: '',
    status: '',
    current_arc: '',
    latest_completed: '',
    next_goal: '',
    dry_run: false,
  };

  const supportedCommands = new Set(['stats', 'write-target', 'range-target', 'refresh']);
  if (!supportedCommands.has(command)) {
    throw new Error(`unknown command: ${command}`);
  }

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--json') {
      args.json = true;
      continue;
    }
    if (arg === '--next') {
      args.next = true;
      continue;
    }
    if (arg === '--dry-run') {
      args.dry_run = true;
      continue;
    }
    if (arg === '--root' || arg === '--chapter' || arg === '--field' || arg === '--kind' || arg === '--range'
      || arg === '--status' || arg === '--current-arc' || arg === '--latest-completed' || arg === '--next-goal') {
      const nextValue = argv[index + 1];
      if (nextValue === undefined) {
        throw new Error(`${arg} requires a value`);
      }
      index += 1;
      if (arg === '--root') args.root = nextValue;
      if (arg === '--chapter') args.chapter = nextValue;
      if (arg === '--field') args.field = nextValue;
      if (arg === '--kind') args.kind = nextValue;
      if (arg === '--range') args.range_text = nextValue;
      if (arg === '--status') args.status = nextValue;
      if (arg === '--current-arc') args.current_arc = nextValue;
      if (arg === '--latest-completed') args.latest_completed = nextValue;
      if (arg === '--next-goal') args.next_goal = nextValue;
      continue;
    }

    throw new Error(`unknown argument: ${arg}`);
  }

  if (command === 'range-target') {
    if (!['plan', 'review', 'polish'].includes(args.kind)) {
      throw new Error('--kind must be one of: plan, review, polish');
    }
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

function readText(filePath) {
  const buffer = fs.readFileSync(filePath);
  const utf8 = buffer.toString('utf8');
  if (!utf8.includes('\uFFFD')) {
    return utf8;
  }
  return buffer.toString('utf8');
}

function frontmatterValue(text, key) {
  const match = text.match(new RegExp(`^${escapeRegExp(key)}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function chapterNumberFromName(name, prefix) {
  const match = name.match(new RegExp(`${escapeRegExp(prefix)}-(\\d+)\\.md$`));
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseRangeText(rangeText) {
  const raw = String(rangeText || '').trim();
  if (/^\d+$/.test(raw)) {
    const value = Number.parseInt(raw, 10);
    if (value <= 0) throw new Error('chapter number must be > 0');
    return [value, value];
  }
  const match = raw.match(/^(\d+)-(\d+)$/);
  if (!match) throw new Error(`invalid range: ${rangeText}`);
  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);
  if (start <= 0 || end <= 0) throw new Error('range values must be > 0');
  if (start > end) throw new Error('range start must be <= end');
  return [start, end];
}

function listMatchingFiles(dirPath, pattern) {
  if (!fileExists(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((entry) => pattern.test(entry))
    .map((entry) => path.join(dirPath, entry))
    .sort();
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

function loadProjectTitle(root) {
  const filePath = path.join(root, 'PROJECT.md');
  if (!fileExists(filePath)) return path.basename(root);
  const text = readText(filePath);
  const value = frontmatterValue(text, 'title');
  if (value) return value;
  const quoted = text.match(/《(.+?)》/);
  if (quoted) return quoted[1];
  for (const line of text.split(/\r?\n/)) {
    const stripped = line.trim().replace(/^#+\s*/, '').trim();
    if (stripped) return stripped;
  }
  return path.basename(root);
}

function loadProjectMetadata(root) {
  const projectPath = path.join(root, 'PROJECT.md');
  const statePath = path.join(root, 'STATE.md');
  const projectText = fileExists(projectPath) ? readText(projectPath) : '';
  const stateText = fileExists(statePath) ? readText(statePath) : '';

  return {
    story_format: frontmatterValue(projectText, 'story_format') || frontmatterValue(stateText, 'story_format') || 'long_form',
    planning_unit: frontmatterValue(projectText, 'planning_unit') || frontmatterValue(stateText, 'planning_unit') || 'chapter',
    target_length_band: frontmatterValue(projectText, 'target_length_band') || 'medium_long',
  };
}

function loadCurrentArc(root) {
  const roadmapPath = path.join(root, 'ROADMAP.md');
  if (fileExists(roadmapPath)) {
    const text = readText(roadmapPath);
    const value = frontmatterValue(text, 'current_arc');
    if (value) return value;
    const match = text.match(/(第[一二三四五六七八九十0-9]+卷|卷[一二三四五六七八九十0-9]+)/);
    if (match) return match[1];
  }

  const statePath = path.join(root, 'STATE.md');
  if (fileExists(statePath)) {
    const value = frontmatterValue(readText(statePath), 'current_arc');
    if (value) return value;
  }

  return '待整理';
}

function extractOutlineTitle(filePath) {
  const text = readText(filePath);
  const value = frontmatterValue(text, 'title');
  if (value) return value;
  for (const line of text.split(/\r?\n/)) {
    const stripped = line.trim();
    if (stripped.startsWith('#')) return stripped.replace(/^#+\s*/, '').trim();
  }
  return path.basename(filePath, '.md');
}

function computeStats(root) {
  if (!fileExists(path.join(root, 'PROJECT.md'))) {
    throw new Error('PROJECT.md not found');
  }

  const projectMeta = loadProjectMetadata(root);
  const chapters = chapterFiles(root);
  const outlines = outlineFiles(root);
  const reviews = reviewFiles(root);

  const chapterNumbers = chapters.map((filePath) => chapterNumberFromName(path.basename(filePath), 'chapter')).filter(Boolean);
  const outlineNumbers = outlines.map((filePath) => chapterNumberFromName(path.basename(filePath), 'outline')).filter(Boolean);
  const reviewNumbers = reviews.map((filePath) => chapterNumberFromName(path.basename(filePath), 'review')).filter(Boolean);

  const latestChapter = chapterNumbers.length ? Math.max(...chapterNumbers) : 0;
  const latestOutline = outlineNumbers.length ? Math.max(...outlineNumbers) : 0;
  const latestReview = reviewNumbers.length ? Math.max(...reviewNumbers) : 0;
  const totalWords = chapters.reduce((sum, filePath) => sum + readText(filePath).length, 0);

  const firstUnwritten = outlineNumbers.slice().sort((a, b) => a - b)
    .find((num) => !fileExists(path.join(root, 'chapters', `chapter-${num}.md`))) || null;
  const firstUnreviewed = chapterNumbers.slice().sort((a, b) => a - b)
    .find((num) => !fileExists(path.join(root, 'reviews', `review-${num}.md`))) || null;

  const nextChapter = firstUnwritten || (latestChapter ? latestChapter + 1 : 1);
  const outlineBuffer = Math.max(latestOutline - latestChapter, 0);
  const reviewGap = Math.max(latestChapter - latestReview, 0);

  let recommendedCommand = 'progress';
  let recommendedArgs = '';
  let recommendedReason = '需要先查看项目状态。';

  if (projectMeta.story_format === 'short_story') {
    if (latestChapter === 0 && latestOutline === 0) {
      recommendedCommand = 'plan-batch';
      recommendedArgs = '1-1';
      recommendedReason = '短故事项目优先先完成单篇故事蓝图，再进入写作。';
    } else if (firstUnwritten !== null) {
      recommendedCommand = 'write-chapter';
      recommendedArgs = String(firstUnwritten);
      recommendedReason = '短故事已有蓝图，下一步应尽快完成当前故事正文。';
    } else if (firstUnreviewed !== null) {
      recommendedCommand = 'review';
      recommendedArgs = String(firstUnreviewed);
      recommendedReason = '短故事正文已完成，先补审核与收尾检查。';
    } else {
      recommendedCommand = 'progress';
      recommendedArgs = '';
      recommendedReason = '短故事主流程已走通，下一步更适合人工确认是否润色、定稿或结束项目。';
    }
  } else if (projectMeta.story_format === 'story_collection') {
    if (latestChapter === 0 && latestOutline === 0) {
      recommendedCommand = 'plan-batch';
      recommendedArgs = '1-1';
      recommendedReason = '短故事集优先先规划当前激活故事，而不是长篇式批量铺章。';
    } else if (firstUnwritten !== null) {
      recommendedCommand = 'write-chapter';
      recommendedArgs = String(firstUnwritten);
      recommendedReason = '故事集当前故事已有蓝图，下一步应完成这一篇的正文。';
    } else if (firstUnreviewed !== null) {
      recommendedCommand = 'review';
      recommendedArgs = String(firstUnreviewed);
      recommendedReason = '先完成当前故事的审核，再决定是否推进下一篇。';
    } else if (outlineBuffer <= 0) {
      recommendedCommand = 'plan-batch';
      recommendedArgs = `${nextChapter}-${nextChapter}`;
      recommendedReason = '故事集应逐篇推进，先补下一篇故事或下一故事节点的规划。';
    } else {
      recommendedCommand = 'write-chapter';
      recommendedArgs = String(nextChapter);
      recommendedReason = '故事集下一篇已有规划，可以继续推进当前集合中的下一篇作品。';
    }
  } else if (latestChapter === 0 && latestOutline === 0) {
    recommendedCommand = 'plan-batch';
    recommendedArgs = '1-10';
    recommendedReason = '项目还没有大纲和正文，先建立章节规划。';
  } else if (firstUnwritten !== null) {
    recommendedCommand = 'write-chapter';
    recommendedArgs = String(firstUnwritten);
    recommendedReason = '已经有大纲，下一步应把最早未写章节落成正文。';
  } else if (firstUnreviewed !== null) {
    recommendedCommand = 'review';
    recommendedArgs = String(firstUnreviewed);
    recommendedReason = '已有正文未审核，先补一致性检查。';
  } else if (outlineBuffer <= 0) {
    recommendedCommand = 'plan-batch';
    recommendedArgs = `${nextChapter}-${nextChapter + 4}`;
    recommendedReason = '规划缓冲不足，先补后续几章大纲。';
  } else {
    recommendedCommand = 'write-chapter';
    recommendedArgs = String(nextChapter);
    recommendedReason = '下一章已有规划或已到继续写作阶段。';
  }

  const queueRows = [];
  for (const number of outlineNumbers.slice().sort((a, b) => a - b)) {
    if (number <= latestChapter) continue;
    queueRows.push({
      chapter: number,
      task: extractOutlineTitle(path.join(root, 'chapters', 'outlines', `outline-${number}.md`)),
      emotion: '待整理',
      characters: '待整理',
      status: '待写作',
    });
    if (queueRows.length >= 3) break;
  }

  if (queueRows.length === 0) {
    queueRows.push({
      chapter: nextChapter,
      task: '待规划',
      emotion: '待整理',
      characters: '待整理',
      status: '未开始',
    });
  }

  const statePath = path.join(root, 'STATE.md');
  const existingStatus = fileExists(statePath) ? frontmatterValue(readText(statePath), 'status') : null;
  const status = existingStatus || (latestChapter > 0 ? '连载中' : '规划中');

  return {
    title: loadProjectTitle(root),
    story_format: projectMeta.story_format,
    planning_unit: projectMeta.planning_unit,
    target_length_band: projectMeta.target_length_band,
    status,
    current_arc: loadCurrentArc(root),
    current_chapter: latestChapter,
    total_words: totalWords,
    latest_chapter: latestChapter,
    latest_outline: latestOutline,
    latest_review: latestReview,
    first_unwritten: firstUnwritten,
    first_unreviewed: firstUnreviewed,
    outline_buffer: outlineBuffer,
    review_gap: reviewGap,
    next_chapter: nextChapter,
    recommended_command: recommendedCommand,
    recommended_args: recommendedArgs,
    recommended_reason: recommendedReason,
    queue_rows: queueRows,
  };
}

function resolveWriteTarget(root, chapterArg, useNext) {
  const stats = computeStats(root);
  if (chapterArg && useNext) {
    throw new Error('cannot use --chapter and --next together');
  }

  let targetChapter;
  if (chapterArg) {
    if (!/^\d+$/.test(String(chapterArg).trim())) {
      throw new Error(`invalid chapter: ${chapterArg}`);
    }
    targetChapter = Number.parseInt(chapterArg, 10);
  } else {
    targetChapter = Number(stats.next_chapter);
  }

  if (targetChapter <= 0) throw new Error('target chapter must be > 0');

  const previousChapter = targetChapter > 1 ? targetChapter - 1 : 0;
  const chapterPath = path.join(root, 'chapters', `chapter-${targetChapter}.md`);
  const outlinePath = path.join(root, 'chapters', 'outlines', `outline-${targetChapter}.md`);
  const draftPath = path.join(root, 'chapters', 'draft', `chapter-${targetChapter}-draft.md`);
  const reviewPath = path.join(root, 'reviews', `review-${targetChapter}.md`);

  return {
    target_chapter: targetChapter,
    previous_chapter: previousChapter,
    previous_exists: previousChapter === 0 || fileExists(path.join(root, 'chapters', `chapter-${previousChapter}.md`)),
    chapter_exists: fileExists(chapterPath),
    outline_exists: fileExists(outlinePath),
    review_exists: fileExists(reviewPath),
    mode: fileExists(chapterPath) ? 'rewrite' : 'new',
    chapter_path: chapterPath,
    outline_path: outlinePath,
    draft_path: draftPath,
    review_path: reviewPath,
  };
}

function resolveRangeTarget(root, kind, rangeText) {
  const stats = computeStats(root);
  let defaulted = false;
  let start;
  let end;

  if (String(rangeText || '').trim()) {
    [start, end] = parseRangeText(rangeText);
  } else {
    defaulted = true;
    if (kind === 'plan') {
      start = Number(stats.next_chapter);
      end = start + 9;
    } else {
      const latest = Number(stats.latest_chapter);
      if (latest <= 0) {
        start = 0;
        end = 0;
      } else {
        start = latest;
        end = latest;
      }
    }
  }

  const chapterNumbers = start > 0 && end > 0 ? Array.from({ length: end - start + 1 }, (_, i) => start + i) : [];
  const existingOutlines = chapterNumbers.filter((n) => fileExists(path.join(root, 'chapters', 'outlines', `outline-${n}.md`)));
  const existingChapters = chapterNumbers.filter((n) => fileExists(path.join(root, 'chapters', `chapter-${n}.md`)));
  const existingReviews = chapterNumbers.filter((n) => fileExists(path.join(root, 'reviews', `review-${n}.md`)));
  const missingChapters = chapterNumbers.filter((n) => !existingChapters.includes(n));
  const missingReviews = chapterNumbers.filter((n) => !existingReviews.includes(n));

  return {
    kind,
    defaulted,
    start,
    end,
    count: chapterNumbers.length,
    range_text: chapterNumbers.length === 0 ? '' : (start === end ? String(start) : `${start}-${end}`),
    chapter_numbers: chapterNumbers,
    existing_outlines: existingOutlines,
    existing_chapters: existingChapters,
    existing_reviews: existingReviews,
    missing_chapters: missingChapters,
    missing_reviews: missingReviews,
  };
}

function replaceOrAppendLine(text, prefix, value) {
  const pattern = new RegExp(`^${escapeRegExp(prefix)}.*$`, 'm');
  const replacement = `${prefix}${value}`;
  if (pattern.test(text)) {
    return text.replace(pattern, replacement);
  }
  return `${text.replace(/\s*$/, '')}\n${replacement}\n`;
}

function renderQueueTable(rows) {
  const header = [
    '## 接下来 3 章',
    '',
    '| 章节 | 任务 | 目标情绪 | 关键人物 | 状态 |',
    '|------|------|----------|----------|------|',
  ];
  const body = rows.map((row) => `| 第${row.chapter}章 | ${row.task} | ${row.emotion} | ${row.characters} | ${row.status} |`);
  return [...header, ...body].join('\n');
}

function replaceSection(text, heading, sectionBody) {
  const pattern = new RegExp(`^## ${escapeRegExp(heading)}\\n.*?(?=^## |\\Z)`, 'ms');
  const replacement = `${sectionBody.trim()}\n\n`;
  if (pattern.test(text)) {
    return text.replace(pattern, replacement);
  }
  return `${text.replace(/\s*$/, '')}\n\n${replacement}`;
}

function refreshState(root, statusOverride, arcOverride, latestCompleted, nextGoal, dryRun) {
  const statePath = path.join(root, 'STATE.md');
  if (!fileExists(statePath)) {
    throw new Error('STATE.md not found');
  }

  const stats = computeStats(root);
  let text = readText(statePath);
  const today = new Date().toISOString().slice(0, 10);

  const status = statusOverride || String(stats.status);
  const currentArc = arcOverride || String(stats.current_arc);
  const latest = latestCompleted || (stats.current_chapter ? `已完成第${stats.current_chapter}章` : '新建项目');
  const nextTarget = nextGoal || `第${stats.next_chapter}章规划或核对`;

  text = replaceOrAppendLine(text, 'status: ', status);
  text = replaceOrAppendLine(text, 'current_arc: ', currentArc);
  text = replaceOrAppendLine(text, 'current_chapter: ', String(stats.current_chapter));
  text = replaceOrAppendLine(text, 'total_words: ', String(stats.total_words));
  text = replaceOrAppendLine(text, 'last_updated: ', today);

  const progressSection = [
    '## 进度快照',
    '',
    '| 项目 | 当前值 |',
    '|------|--------|',
    `| 当前卷 | ${currentArc} |`,
    `| 当前章节 | 第${stats.current_chapter}章 |`,
    `| 总字数 | ${stats.total_words} |`,
    `| 最新完成内容 | ${latest} |`,
    `| 下一目标 | ${nextTarget} |`,
  ].join('\n');

  text = replaceSection(text, '进度快照', progressSection);
  text = replaceSection(text, '接下来 3 章', renderQueueTable(stats.queue_rows));

  if (!dryRun) {
    fs.writeFileSync(statePath, text, 'utf8');
  }
  return text;
}

function printValue(value) {
  if (Array.isArray(value) || (value && typeof value === 'object')) {
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log(value ?? '');
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

  const root = path.resolve(args.root || '.');

  try {
    if (args.command === 'stats') {
      const stats = computeStats(root);
      if (args.field) {
        printValue(stats[args.field] ?? '');
      } else if (args.json) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        for (const [key, value] of Object.entries(stats)) {
          if (key === 'queue_rows') continue;
          console.log(`${key}=${value}`);
        }
        for (const row of stats.queue_rows) {
          console.log(`queue=第${row.chapter}章|${row.task}|${row.status}`);
        }
      }
      return 0;
    }

    if (args.command === 'write-target') {
      const result = resolveWriteTarget(root, args.chapter, args.next);
      if (args.field) {
        printValue(result[args.field] ?? '');
      } else if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        for (const [key, value] of Object.entries(result)) {
          console.log(`${key}=${value}`);
        }
      }
      return 0;
    }

    if (args.command === 'range-target') {
      const result = resolveRangeTarget(root, args.kind, args.range_text);
      if (args.field) {
        printValue(result[args.field] ?? '');
      } else if (args.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        for (const [key, value] of Object.entries(result)) {
          console.log(`${key}=${value}`);
        }
      }
      return 0;
    }

    if (args.command === 'refresh') {
      const refreshed = refreshState(root, args.status, args.current_arc, args.latest_completed, args.next_goal, args.dry_run);
      if (args.dry_run) {
        console.log(refreshed);
      } else {
        console.log(`refreshed ${path.join(root, 'STATE.md')}`);
      }
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
  chapterFiles,
  chapterNumberFromName,
  computeStats,
  extractOutlineTitle,
  frontmatterValue,
  loadCurrentArc,
  loadProjectTitle,
  main,
  outlineFiles,
  parseArgs,
  parseRangeText,
  readText,
  refreshState,
  renderQueueTable,
  replaceOrAppendLine,
  replaceSection,
  resolveRangeTarget,
  resolveWriteTarget,
  reviewFiles,
};
