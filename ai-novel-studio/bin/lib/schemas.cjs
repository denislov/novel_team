/**
 * Schemas — Canonical frontmatter contracts for ANS artifacts.
 *
 * Each artifact type declares:
 *   - required:  fields that MUST be present after normalize. Missing values
 *                are filled from `defaults`.
 *   - optional:  fields preserved when present, but never auto-added.
 *   - forbidden: fields that are stripped during normalize. Used for keys
 *                whose values are typically arrays/objects that don't
 *                round-trip safely through agent-generated YAML — those
 *                belong in body tables, not frontmatter.
 *   - defaults:  fallback values used by `chapter normalize` when a required
 *                field is missing.
 *   - bodySectionsKeep: (chapter only) the only `## ` H2 sections that
 *                survive `chapter normalize`. Everything else (incl.
 *                `## 章节元数据`, `## 创作备注`, `## 自检清单`) is dropped.
 *
 * Consumers:
 *   - bin/lib/chapter_ops.cjs `normalizeChapter()` — enforces this schema.
 *   - tests/runtime-contract.test.cjs — asserts that ans-writer / ans-editor /
 *     ans-verifier output_format frontmatter matches.
 *   - agents/ans-{writer,editor,verifier}.md — should advertise the same
 *     fields in their `<output_format>` blocks.
 */

const CHAPTER_FRONTMATTER = {
  required: [
    'chapter',
    'title',
    'status',
    'target_words',
    'hard_ceiling',
    'words',
    'budget_result',
    'created',
    'updated',
  ],
  optional: ['arc', 'pov', 'story_date', 'version'],
  forbidden: ['characters', 'timeline', 'hooks', 'foreshadowing'],
  defaults: {
    status: 'draft',
    target_words: 2500,
    hard_ceiling: 4000,
    words: 0,
    budget_result: 'within_target',
    version: 'v1',
  },
  bodySectionsKeep: ['正文', '章末钩子'],
};

const OUTLINE_FRONTMATTER = {
  required: [
    'chapter',
    'title',
    'arc',
    'pov',
    'target_words',
    'hard_ceiling',
    'story_date',
    'status',
    'created',
    'updated',
  ],
  optional: [],
  forbidden: [],
  defaults: {
    status: 'outline',
    target_words: 2500,
    hard_ceiling: 4000,
  },
};

const REVIEW_FRONTMATTER = {
  required: [
    'review_type',
    'chapter',
    'reviewer',
    'verdict',
    'created',
    'updated',
  ],
  optional: [],
  forbidden: [],
  defaults: {
    review_type: 'full',
    verdict: 'pass',
  },
};

module.exports = {
  CHAPTER_FRONTMATTER,
  OUTLINE_FRONTMATTER,
  REVIEW_FRONTMATTER,
};
