/**
 * Config — Project-level configuration management for ANS
 *
 * Reads/writes config.json in the project root.
 * Uses "absent = enabled" defaults for workflow flags.
 */

const fs = require('node:fs');
const path = require('node:path');
const { output, error, fileExists, safeReadFile } = require('./core.cjs');

const DEFAULTS = {
  story_format: 'long_form',
  language: 'zh-CN',
  target_words_per_chapter: 3000,
  chapter_word_ceiling: null, // null = target + 1000
  review_strictness: 'standard', // relaxed | standard | strict
  batch_size: 3,
  commit_docs: true,
  model_profile: 'balanced', // quality | balanced | budget | inherit
  workflow: {
    plan_check: true,
    consistency_check: true,
    auto_polish: false,
    research_before_write: false,
    skip_verify: false,
    context_monitor_threshold: 0.40,
  },
};

/**
 * Load project config from config.json in project root.
 * Merges with defaults.
 */
function loadConfig(root) {
  const configPath = path.join(root, 'config.json');
  const projectPath = path.join(root, 'PROJECT.md');

  let parsed = {};
  try {
    const raw = safeReadFile(configPath);
    if (raw) {
      parsed = JSON.parse(raw);
    }
  } catch {
    // Malformed config — use defaults
  }

  // Helper: get nested or top-level value
  const get = (key, section) => {
    if (parsed[key] !== undefined) return parsed[key];
    if (section && parsed[section] && parsed[section][key] !== undefined) {
      return parsed[section][key];
    }
    return undefined;
  };

  // Build workflow config
  const workflow = {};
  for (const [key, defaultValue] of Object.entries(DEFAULTS.workflow)) {
    workflow[key] = get(key, 'workflow') ?? defaultValue;
  }

  // Resolve chapter word ceiling
  const targetWords = get('target_words_per_chapter') ?? DEFAULTS.target_words_per_chapter;
  const explicitCeiling = get('chapter_word_ceiling');
  const chapterWordCeiling = explicitCeiling != null
    ? Math.max(Number(explicitCeiling), targetWords + 1)
    : targetWords + 1000;

  return {
    story_format: get('story_format') ?? DEFAULTS.story_format,
    language: get('language') ?? DEFAULTS.language,
    target_words_per_chapter: targetWords,
    chapter_word_ceiling: chapterWordCeiling,
    review_strictness: get('review_strictness') ?? DEFAULTS.review_strictness,
    batch_size: get('batch_size') ?? DEFAULTS.batch_size,
    commit_docs: get('commit_docs') ?? DEFAULTS.commit_docs,
    model_profile: get('model_profile') ?? DEFAULTS.model_profile,
    workflow,
  };
}

/**
 * Save config to config.json.
 */
function saveConfig(root, config) {
  const configPath = path.join(root, 'config.json');
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

// ─── CLI Commands ─────────────────────────────────────────────────────────────

function cmdConfigGet(root, key, raw) {
  const config = loadConfig(root);

  if (!key) {
    output(config, raw);
    return;
  }

  // Support dot-notation: workflow.plan_check
  const parts = key.split('.');
  let value = config;
  for (const part of parts) {
    if (value == null || typeof value !== 'object') {
      value = undefined;
      break;
    }
    value = value[part];
  }

  if (raw) {
    output(null, raw, value !== undefined ? String(value) : '');
  } else {
    output({ key, value: value !== undefined ? value : null }, raw);
  }
}

function cmdConfigSet(root, key, value, raw) {
  if (!key || value === undefined) {
    error('config set requires <key> <value>');
  }

  const configPath = path.join(root, 'config.json');
  let config = {};
  try {
    const existing = safeReadFile(configPath);
    if (existing) config = JSON.parse(existing);
  } catch { /* use empty */ }

  // Support dot-notation: workflow.plan_check
  const parts = key.split('.');
  let target = config;
  for (let i = 0; i < parts.length - 1; i++) {
    if (target[parts[i]] === undefined || typeof target[parts[i]] !== 'object') {
      target[parts[i]] = {};
    }
    target = target[parts[i]];
  }

  // Auto-detect type
  const lastKey = parts[parts.length - 1];
  if (value === 'true') target[lastKey] = true;
  else if (value === 'false') target[lastKey] = false;
  else if (/^\d+$/.test(value)) target[lastKey] = Number.parseInt(value, 10);
  else if (/^\d+\.\d+$/.test(value)) target[lastKey] = Number.parseFloat(value);
  else target[lastKey] = value;

  saveConfig(root, config);
  output({ updated: key, value: target[lastKey] }, raw);
}

module.exports = {
  loadConfig,
  saveConfig,
  cmdConfigGet,
  cmdConfigSet,
  DEFAULTS,
};
