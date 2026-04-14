/**
 * Init — Structured context loading for ANS workflows
 *
 * Each workflow gets a dedicated init command that returns a JSON payload
 * containing all the context it needs to operate. This replaces the fragile
 * inline bash grep patterns used in workflow markdown files.
 */

const fs = require('node:fs');
const path = require('node:path');
const core = require('./core.cjs');
const { loadConfig } = require('./config.cjs');
const novelState = require('./novel_state.cjs');

// ─── Helper: attach common project metadata ──────────────────────────────────

function withProjectMeta(root, result) {
  result.project_root = root;
  result.project_exists = core.fileExists(path.join(root, 'PROJECT.md'));
  result.state_exists = core.fileExists(path.join(root, 'STATE.md'));
  result.roadmap_exists = core.fileExists(path.join(root, 'ROADMAP.md'));
  result.characters_exists = core.fileExists(path.join(root, 'CHARACTERS.md'));
  result.timeline_exists = core.fileExists(path.join(root, 'TIMELINE.md'));
  return result;
}

// ─── init write-chapter <N> ──────────────────────────────────────────────────

function cmdInitWriteChapter(root, chapter, raw) {
  const config = loadConfig(root);
  let stats;
  try {
    stats = novelState.computeStats(root);
  } catch (e) {
    core.error(e.message);
  }

  const targetChapter = chapter ? Number(chapter) : stats.next_chapter;
  if (!targetChapter || isNaN(targetChapter)) {
    core.error('Could not determine target chapter');
  }

  const writeTarget = novelState.resolveWriteTarget(root, String(targetChapter), false);
  const previousChapterPath = targetChapter > 1
    ? path.join(root, 'chapters', `chapter-${targetChapter - 1}.md`)
    : null;

  const result = {
    // Config
    config,

    // Target
    target_chapter: targetChapter,
    next_chapter: stats.next_chapter,
    mode: writeTarget.mode,

    // Paths
    chapter_path: writeTarget.chapter_path,
    outline_path: writeTarget.outline_path,
    draft_path: writeTarget.draft_path,
    review_path: writeTarget.review_path,

    // Existence checks
    chapter_exists: writeTarget.chapter_exists,
    outline_exists: writeTarget.outline_exists,
    review_exists: writeTarget.review_exists,
    previous_exists: writeTarget.previous_exists,
    previous_chapter: writeTarget.previous_chapter,

    // Project context
    story_format: stats.story_format,
    planning_unit: stats.planning_unit,
    chapter_words: stats.chapter_words,
    chapter_word_ceiling: stats.chapter_word_ceiling,
    current_chapter: stats.current_chapter,
    total_words: stats.total_words,
    title: stats.title,
  };

  core.output(withProjectMeta(root, result), raw);
}

// ─── init plan-batch [START-END] ─────────────────────────────────────────────

function cmdInitPlanBatch(root, rangeText, raw) {
  const config = loadConfig(root);
  let stats;
  try {
    stats = novelState.computeStats(root);
  } catch (e) {
    core.error(e.message);
  }

  let range;
  if (rangeText && /^\d+-\d+$/.test(String(rangeText).trim())) {
    const [start, end] = String(rangeText).trim().split('-').map(Number);
    range = { start, end, range_text: `${start}-${end}` };
  } else {
    const start = stats.next_chapter;
    const size = Math.max(Number(config.batch_size) || 3, 1);
    const end = start + size - 1;
    range = { start, end, range_text: `${start}-${end}` };
  }

  const result = {
    config,
    title: stats.title,
    story_format: stats.story_format,
    planning_unit: stats.planning_unit,
    current_arc: stats.current_arc,
    current_chapter: stats.current_chapter,
    next_chapter: stats.next_chapter,
    latest_outline: stats.latest_outline,
    latest_chapter: stats.latest_chapter,
    recommended_command: stats.recommended_command,
    recommended_args: stats.recommended_args,
    range_start: range.start,
    range_end: range.end,
    range_text: range.range_text,
  };

  core.output(withProjectMeta(root, result), raw);
}

// ─── init autonomous ─────────────────────────────────────────────────────────

function cmdInitAutonomous(root, raw) {
  const config = loadConfig(root);
  let stats;
  try {
    stats = novelState.computeStats(root);
  } catch (e) {
    core.error(e.message);
  }

  const result = {
    // Config
    config,

    // Project stats
    title: stats.title,
    story_format: stats.story_format,
    status: stats.status,
    current_arc: stats.current_arc,
    current_chapter: stats.current_chapter,
    total_words: stats.total_words,
    next_chapter: stats.next_chapter,

    // Outline buffer
    latest_outline: stats.latest_outline,
    latest_chapter: stats.latest_chapter,
    latest_review: stats.latest_review,
    outline_buffer: stats.outline_buffer,
    review_gap: stats.review_gap,

    // Recommendation
    recommended_command: stats.recommended_command,
    recommended_args: stats.recommended_args,
    recommended_reason: stats.recommended_reason,

    // Queue
    queue_rows: stats.queue_rows,
  };

  core.output(withProjectMeta(root, result), raw);
}

// ─── init manager ─────────────────────────────────────────────────────────────

function cmdInitManager(root, raw) {
  const config = loadConfig(root);
  let stats;
  try {
    stats = novelState.computeStats(root);
  } catch (e) {
    core.error(e.message);
  }

  // Build per-chapter status grid
  const chapters = core.chapterFiles(root);
  const outlines = core.outlineFiles(root);
  const reviews = core.reviewFiles(root);

  const chapterNums = chapters.map(f => core.chapterNumberFromName(path.basename(f), 'chapter')).filter(Boolean);
  const outlineNums = outlines.map(f => core.chapterNumberFromName(path.basename(f), 'outline')).filter(Boolean);
  const reviewNums = reviews.map(f => core.chapterNumberFromName(path.basename(f), 'review')).filter(Boolean);

  const allNums = [...new Set([...chapterNums, ...outlineNums, ...reviewNums])].sort((a, b) => a - b);

  // Extend to show upcoming chapters too
  const maxKnown = Math.max(0, ...allNums);
  const showUpTo = Math.max(maxKnown, stats.next_chapter + 2);
  for (let i = 1; i <= showUpTo; i++) {
    if (!allNums.includes(i)) allNums.push(i);
  }
  allNums.sort((a, b) => a - b);

  const chapterGrid = allNums.map(num => {
    const hasOutline = outlineNums.includes(num);
    const hasChapter = chapterNums.includes(num);
    const hasReview = reviewNums.includes(num);

    let status;
    if (hasChapter && hasReview) status = 'complete';
    else if (hasChapter) status = 'written';
    else if (hasOutline) status = 'planned';
    else status = 'pending';

    // Try to load outline title for display
    let displayName = `第${num}章`;
    if (hasOutline) {
      try {
        displayName = novelState.extractOutlineTitle(
          path.join(root, 'chapters', 'outlines', `outline-${num}.md`)
        );
        if (displayName.length > 20) displayName = displayName.slice(0, 19) + '…';
      } catch { /* use default */ }
    }

    return {
      chapter: num,
      display_name: displayName,
      has_outline: hasOutline,
      has_chapter: hasChapter,
      has_review: hasReview,
      status,
    };
  });

  // Compute progress
  const completedCount = chapterGrid.filter(c => c.status === 'complete').length;
  const totalCount = chapterGrid.length;

  // Build recommended actions
  const recommendedActions = [];
  if (stats.recommended_command) {
    recommendedActions.push({
      command: stats.recommended_command,
      args: stats.recommended_args,
      reason: stats.recommended_reason,
    });
  }

  const result = {
    // Config
    config,

    // Project
    title: stats.title,
    story_format: stats.story_format,
    status: stats.status,
    current_arc: stats.current_arc,

    // Counts
    total_chapters: chapterNums.length,
    total_outlines: outlineNums.length,
    total_reviews: reviewNums.length,
    total_words: stats.total_words,
    completed_count: completedCount,
    total_count: totalCount,

    // Grid
    chapter_grid: chapterGrid,

    // Recommendations
    recommended_actions: recommendedActions,
    all_complete: completedCount > 0 && completedCount === totalCount,
  };

  core.output(withProjectMeta(root, result), raw);
}

// ─── init new-project ─────────────────────────────────────────────────────────

function cmdInitNewProject(root, raw) {
  const config = loadConfig(root);

  // Detect existing materials
  const hasExistingMaterial = core.fileExists(path.join(root, 'chapters'))
    || fs.readdirSync(root).some(f => f.endsWith('.md') && f !== 'README.md');

  const result = {
    config,
    has_existing_material: hasExistingMaterial,
    needs_map_base: hasExistingMaterial && !core.fileExists(path.join(root, 'PROJECT.md')),
  };

  core.output(withProjectMeta(root, result), raw);
}

// ─── init review <N> ──────────────────────────────────────────────────────────

function cmdInitReview(root, chapterOrRange, raw) {
  const config = loadConfig(root);
  let stats;
  try {
    stats = novelState.computeStats(root);
  } catch (e) {
    core.error(e.message);
  }

  let rangeText = '';
  let chapterNumbers = [];

  if (chapterOrRange) {
    const normalized = String(chapterOrRange).trim();
    if (/^\d+-\d+$/.test(normalized)) {
      const [start, end] = normalized.split('-').map(Number);
      rangeText = normalized;
      chapterNumbers = Array.from({ length: end - start + 1 }, (_, index) => start + index);
    } else if (/^\d+(?:\s+\d+)+$/.test(normalized)) {
      chapterNumbers = normalized.split(/\s+/).map(Number);
      rangeText = `${chapterNumbers[0]}-${chapterNumbers[chapterNumbers.length - 1]}`;
    } else if (/^\d+$/.test(normalized)) {
      chapterNumbers = [Number(normalized)];
      rangeText = normalized;
    }
  }

  let targetChapter;
  if (chapterNumbers.length > 0) {
    targetChapter = chapterNumbers[0];
  } else if (stats.first_unreviewed) {
    targetChapter = stats.first_unreviewed;
  } else {
    targetChapter = stats.current_chapter || 1;
  }

  if (!rangeText) {
    rangeText = String(targetChapter);
    chapterNumbers = [targetChapter];
  }

  const chapterPath = path.join(root, 'chapters', `chapter-${targetChapter}.md`);
  const reviewPath = path.join(root, 'reviews', `review-${targetChapter}.md`);
  const outlinePath = path.join(root, 'chapters', 'outlines', `outline-${targetChapter}.md`);

  const result = {
    config,
    target_chapter: targetChapter,
    range_text: rangeText,
    chapter_numbers: chapterNumbers,
    is_batch: chapterNumbers.length > 1,
    chapter_path: chapterPath,
    review_path: reviewPath,
    outline_path: outlinePath,
    chapter_exists: core.fileExists(chapterPath),
    review_exists: core.fileExists(reviewPath),
    outline_exists: core.fileExists(outlinePath),
    story_format: stats.story_format,
    title: stats.title,
  };

  core.output(withProjectMeta(root, result), raw);
}

// ─── init progress ────────────────────────────────────────────────────────────

function cmdInitProgress(root, raw) {
  const config = loadConfig(root);
  let stats;
  try {
    stats = novelState.computeStats(root);
  } catch (e) {
    core.error(e.message);
  }

  core.output(withProjectMeta(root, {
    config,
    ...stats,
  }), raw);
}

module.exports = {
  cmdInitWriteChapter,
  cmdInitPlanBatch,
  cmdInitAutonomous,
  cmdInitManager,
  cmdInitNewProject,
  cmdInitReview,
  cmdInitProgress,
};
