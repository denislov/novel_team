# Phase 1 / Plan 01 Summary

**Plan:** `01-01-PLAN.md`  
**Completed:** 2026-04-07  
**Status:** Done

## Objective

Establish the explicit story-format contract used by Novel initialization so the product can distinguish:

- long-form novel
- single short story
- short-story collection

while preserving the current long-form workflow as the compatibility baseline.

## What Changed

### Initialization flow
- Updated `plugins/novel/workflows/new-project.md`
- Added a new `story_format` question to basic project setup
- Defined the internal mapping:
  - `long_form`
  - `short_story`
  - `story_collection`
- Added derived metadata guidance for:
  - `planning_unit`
  - `target_length_band`
- Updated architect input contract so downstream planning can consume these fields

### Command wrapper
- Updated `plugins/novel/commands/new-project.md`
- Documented the new initialization contract in the command context

### Templates
- Updated `plugins/novel/templates/PROJECT.md`
  - Added `story_format`
  - Added `planning_unit`
  - Added `target_length_band`
- Updated `plugins/novel/templates/ROADMAP.md`
  - Added format-aware roadmap metadata and guidance
- Updated `plugins/novel/templates/STATE.md`
  - Added format-aware state metadata and progress snapshot fields

### Documentation
- Updated `plugins/novel/README.md`
- Documented the three supported story shapes and the intent of the format contract

### Tests
- Updated `tests/install.test.cjs`
  - Verifies installed workflow/command/template surfaces include story-format contract content
- Updated `tests/novel-state.test.cjs`
  - Ensures the state helper remains compatible when project/state frontmatter includes new format fields

## Verification

- `npm test` ✅
- Story-format contract strings present in:
  - `plugins/novel/workflows/new-project.md`
  - `plugins/novel/commands/new-project.md`
  - `plugins/novel/templates/PROJECT.md`
  - `plugins/novel/templates/ROADMAP.md`
  - `plugins/novel/templates/STATE.md`
  - `plugins/novel/README.md`

## Requirements Addressed

- `FORMAT-01`
- `FORMAT-02`
- `FORMAT-03`
- `FLOW-01`

## Notes

- This phase intentionally stops at the **contract** layer.
- It does **not** fully redesign all templates or routing behavior yet.
- Long-form remains the default-compatible baseline when no explicit format is set.

## Recommended Next Step

Proceed to Phase 2: make templates and planning artifacts behave more intelligently for:

- short stories
- short-story collections
- long-form novels

---
*Generated after executing Phase 1 / Plan 01 on 2026-04-07*
