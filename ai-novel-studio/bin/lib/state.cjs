/**
 * State — Project state management for ANS
 *
 * Thin wrapper around novel_state.cjs exports, exposed via CLI subcommands.
 * Adds structured JSON output and atomic(ish) state updates.
 */

const path = require('node:path');
const core = require('./core.cjs');
const novelState = require('../novel_state.cjs');

// ─── CLI Commands ─────────────────────────────────────────────────────────────

/**
 * state load — Load full project stats as JSON.
 */
function cmdStateLoad(root, raw) {
  const stats = novelState.computeStats(root);
  core.output(stats, raw);
}

/**
 * state json — Output STATE.md frontmatter values as JSON.
 */
function cmdStateJson(root, raw) {
  const statePath = path.join(root, 'STATE.md');
  const text = core.safeReadFile(statePath);
  if (!text) {
    core.error('STATE.md not found');
  }
  const obj = core.parseFrontmatterToObject(text);
  core.output(obj, raw);
}

/**
 * state get [field] — Get a specific field or full stats.
 */
function cmdStateGet(root, field, raw) {
  const stats = novelState.computeStats(root);
  if (field) {
    const value = stats[field];
    if (raw) {
      core.output(null, raw, value !== undefined ? String(value) : '');
    } else {
      core.output({ field, value: value !== undefined ? value : null }, raw);
    }
  } else {
    core.output(stats, raw);
  }
}

/**
 * state update <field> <value> — Update a single field in STATE.md.
 */
function cmdStateUpdate(root, field, value) {
  if (!field || value === undefined) {
    core.error('state update requires <field> <value>');
  }

  const statePath = path.join(root, 'STATE.md');
  let text = core.safeReadFile(statePath);
  if (!text) {
    core.error('STATE.md not found');
  }

  text = core.replaceOrAppendLine(text, `${field}: `, value);
  core.writeText(statePath, text);
  core.output({ updated: field, value });
}

/**
 * state patch --field1 val1 --field2 val2 — Batch update STATE.md fields.
 */
function cmdStatePatch(root, patches, raw) {
  const statePath = path.join(root, 'STATE.md');
  let text = core.safeReadFile(statePath);
  if (!text) {
    core.error('STATE.md not found');
  }

  const updated = {};
  for (const [key, value] of Object.entries(patches)) {
    text = core.replaceOrAppendLine(text, `${key}: `, value);
    updated[key] = value;
  }

  core.writeText(statePath, text);
  core.output({ updated }, raw);
}

/**
 * state refresh — Full state refresh (recompute from filesystem).
 */
function cmdStateRefresh(root, args, raw) {
  const result = novelState.refreshState(
    root,
    args.status || '',
    args['current-arc'] || '',
    args['latest-completed'] || '',
    args['next-goal'] || '',
    false
  );
  core.output({ refreshed: true, path: path.join(root, 'STATE.md') }, raw);
}

/**
 * state write-target — Resolve the next chapter to write.
 */
function cmdStateWriteTarget(root, chapter, useNext, raw) {
  const result = novelState.resolveWriteTarget(root, chapter, useNext);
  core.output(result, raw);
}

/**
 * state range-target — Resolve a chapter range for plan/review/polish.
 */
function cmdStateRangeTarget(root, kind, rangeText, raw) {
  const result = novelState.resolveRangeTarget(root, kind, rangeText);
  core.output(result, raw);
}

module.exports = {
  cmdStateLoad,
  cmdStateJson,
  cmdStateGet,
  cmdStateUpdate,
  cmdStatePatch,
  cmdStateRefresh,
  cmdStateWriteTarget,
  cmdStateRangeTarget,
};
