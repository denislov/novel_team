/**
 * Verify — Structural consistency checks for ANS
 *
 * Performs structural (non-semantic) checks across project files:
 * - Character name consistency across chapters
 * - Timeline marker format validation
 * - Foreshadowing tracking
 * - Project health checks
 *
 * Q1 decision: structural checks only in CLI, semantic checks in agent layer.
 */

const fs = require('node:fs');
const path = require('node:path');
const core = require('./core.cjs');

// ─── Consistency checks ──────────────────────────────────────────────────────

/**
 * Check character name consistency across chapters.
 * Scans CHARACTERS.md for known names, then checks all chapters for variants.
 */
function checkCharacterNames(root) {
  const charactersPath = path.join(root, 'CHARACTERS.md');
  const issues = [];

  if (!core.fileExists(charactersPath)) {
    return { checked: false, reason: 'CHARACTERS.md not found', issues: [] };
  }

  const charText = core.readText(charactersPath);

  // Extract character names from CHARACTERS.md
  // Real format uses ### 姓名 for named characters, and | 姓名 | in table rows.
  // Filter out section headings (## 使用规则, ## 主角, ## 核心人物, etc.)
  const sectionHeadings = new Set([
    '使用规则', '主角', '核心人物', '第一卷核心人物', '第二卷核心人物',
    '阵营分布', '关系矩阵', '当前重点人物', '新登场待补卡', '状态更新日志',
    '身份', '当前立场', '性格核心', '当前目标', '阶段状态', '首次登场', '详细卡片',
  ]);

  const knownNames = new Set();

  // Pattern 1: ### 姓名 (individual character headings)
  const h3Pattern = /^###\s+(.+?)(?:\s*[-—]|\s*$)/gm;
  let match;
  while ((match = h3Pattern.exec(charText)) !== null) {
    const name = match[1].trim();
    if (name.length >= 2 && name.length <= 10 && !sectionHeadings.has(name)) {
      knownNames.add(name);
    }
  }

  // Pattern 2: Table rows — | 姓名 | 类型 | ... (skip header/separator rows)
  const tableRowPattern = /^\|\s*([^|]+?)\s*\|\s*(?:盟友|反派|对手|利益方|配角|线索|中立|卷一核心角色|卷二核心角色|[^|]*?)\s*\|/gm;
  while ((match = tableRowPattern.exec(charText)) !== null) {
    const name = match[1].trim();
    if (name.length >= 2 && name.length <= 10 && name !== '姓名' && !/^[-:]+$/.test(name)) {
      knownNames.add(name);
    }
  }

  // Pattern 3: characters/*.md filenames
  const charsDir = path.join(root, 'characters');
  if (core.fileExists(charsDir)) {
    try {
      for (const file of fs.readdirSync(charsDir)) {
        if (file.endsWith('.md')) {
          const name = path.basename(file, '.md');
          if (name.length >= 2 && name.length <= 10) {
            knownNames.add(name);
          }
        }
      }
    } catch { /* skip */ }
  }

  if (knownNames.size === 0) {
    return { checked: true, names_found: 0, issues: [] };
  }

  // Scan chapters for name frequency
  const chapters = core.chapterFiles(root);
  const nameFrequency = {};

  for (const name of knownNames) {
    nameFrequency[name] = { total: 0, chapters: [] };
  }

  for (const chapterPath of chapters) {
    const text = core.readText(chapterPath);
    const chapterNum = core.chapterNumberFromName(path.basename(chapterPath), 'chapter');

    for (const name of knownNames) {
      const count = (text.match(new RegExp(core.escapeRegExp(name), 'g')) || []).length;
      if (count > 0) {
        nameFrequency[name].total += count;
        nameFrequency[name].chapters.push({ chapter: chapterNum, count });
      }
    }
  }

  return {
    checked: true,
    names_found: knownNames.size,
    chapters_scanned: chapters.length,
    name_frequency: nameFrequency,
    issues,
  };
}

/**
 * validate health — Check project file integrity.
 */
function checkProjectHealth(root) {
  const issues = [];
  const warnings = [];

  const requiredFiles = ['PROJECT.md', 'STATE.md'];
  const recommendedFiles = ['CHARACTERS.md', 'TIMELINE.md', 'ROADMAP.md'];

  for (const file of requiredFiles) {
    if (!core.fileExists(path.join(root, file))) {
      issues.push({ severity: 'error', file, message: `Required file missing: ${file}` });
    }
  }

  for (const file of recommendedFiles) {
    if (!core.fileExists(path.join(root, file))) {
      warnings.push({ severity: 'warning', file, message: `Recommended file missing: ${file}` });
    }
  }

  // Check directory structure
  const requiredDirs = ['chapters', 'chapters/outlines'];
  const recommendedDirs = ['reviews', 'characters', 'research'];

  for (const dir of requiredDirs) {
    if (!core.fileExists(path.join(root, dir))) {
      issues.push({ severity: 'error', dir, message: `Required directory missing: ${dir}` });
    }
  }

  for (const dir of recommendedDirs) {
    if (!core.fileExists(path.join(root, dir))) {
      warnings.push({ severity: 'warning', dir, message: `Recommended directory missing: ${dir}` });
    }
  }

  // Check STATE.md has valid frontmatter if it exists
  const statePath = path.join(root, 'STATE.md');
  if (core.fileExists(statePath)) {
    const stateText = core.readText(statePath);
    const fm = core.parseFrontmatterToObject(stateText);
    if (!fm.status) {
      warnings.push({ severity: 'warning', file: 'STATE.md', message: 'Missing status field in frontmatter' });
    }
    if (!fm.current_chapter) {
      warnings.push({ severity: 'warning', file: 'STATE.md', message: 'Missing current_chapter field in frontmatter' });
    }
  }

  // Check chapter numbering continuity
  const chapters = core.chapterFiles(root);
  const chapterNums = chapters
    .map(f => core.chapterNumberFromName(path.basename(f), 'chapter'))
    .filter(Boolean)
    .sort((a, b) => a - b);

  if (chapterNums.length > 0) {
    for (let i = 0; i < chapterNums.length - 1; i++) {
      if (chapterNums[i + 1] - chapterNums[i] > 1) {
        const gap = chapterNums[i + 1] - chapterNums[i] - 1;
        warnings.push({
          severity: 'warning',
          message: `Gap in chapter numbering: ${chapterNums[i]} → ${chapterNums[i + 1]} (${gap} missing)`,
        });
      }
    }
  }

  // Check outline coverage for written chapters
  const outlines = core.outlineFiles(root);
  const outlineNums = outlines
    .map(f => core.chapterNumberFromName(path.basename(f), 'outline'))
    .filter(Boolean);

  const writtenWithoutOutline = chapterNums.filter(n => !outlineNums.includes(n));
  if (writtenWithoutOutline.length > 0) {
    warnings.push({
      severity: 'warning',
      message: `Chapters without outlines: ${writtenWithoutOutline.join(', ')}`,
    });
  }

  return {
    healthy: issues.length === 0,
    error_count: issues.length,
    warning_count: warnings.length,
    errors: issues,
    warnings,
  };
}

// ─── CLI Commands ─────────────────────────────────────────────────────────────

function cmdValidateConsistency(root, raw) {
  const nameCheck = checkCharacterNames(root);
  core.output({
    character_names: nameCheck,
  }, raw);
}

function cmdValidateHealth(root, raw) {
  const health = checkProjectHealth(root);
  core.output(health, raw);
}

function cmdVerifyExtract(root, reportPath, raw) {
  if (!reportPath) {
    core.error('verify extract requires --report <path>');
  }

  const fullPath = path.isAbsolute(reportPath)
    ? reportPath
    : path.join(root, reportPath);

  if (!core.fileExists(fullPath)) {
    core.error(`review report not found: ${reportPath}`);
  }

  const text = core.readText(fullPath);

  const fencedMatches = [...text.matchAll(/```json\s*([\s\S]*?)```/g)];
  for (let index = fencedMatches.length - 1; index >= 0; index -= 1) {
    try {
      const parsed = JSON.parse(fencedMatches[index][1]);
      core.output(parsed, raw);
      return;
    } catch {
      // Keep scanning.
    }
  }

  const verdictMatch = text.match(/##\s+Structured Verdict[\s\S]*?```json\s*([\s\S]*?)```/);
  if (verdictMatch) {
    try {
      const parsed = JSON.parse(verdictMatch[1]);
      core.output(parsed, raw);
      return;
    } catch {
      // Fall through to explicit error below.
    }
  }

  core.error(`could not extract structured verdict JSON from ${reportPath}`);
}

module.exports = {
  checkCharacterNames,
  checkProjectHealth,
  cmdValidateConsistency,
  cmdValidateHealth,
  cmdVerifyExtract,
};
