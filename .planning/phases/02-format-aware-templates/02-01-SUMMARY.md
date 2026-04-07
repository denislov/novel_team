# Phase 2 / Plan 01 Summary

**Plan:** `02-01-PLAN.md`  
**Completed:** 2026-04-07  
**Status:** Done

## Objective

Make Novel’s planning templates behave more appropriately for:

- long-form novels
- single short stories
- short-story collections

without breaking the existing long-form default path.

## What Changed

### Core templates
Updated the following templates with explicit format-aware guidance:

- `plugins/novel/templates/PROJECT.md`
- `plugins/novel/templates/ROADMAP.md`
- `plugins/novel/templates/STATE.md`
- `plugins/novel/templates/CHAPTER-OUTLINE.md`

### Template behavior improvements

#### `PROJECT.md`
- Added mode-aware explanation for:
  - `long_form`
  - `short_story`
  - `story_collection`
- Clarified how “全书弧线” should be interpreted in short-story and collection modes

#### `ROADMAP.md`
- Added explicit “规划模式” explanation
- Clarified how roadmap structure changes by story format
- Added story-first interpretation for `planning_unit = story`
- Added collection-specific guidance for future queue / growth structure

#### `STATE.md`
- Clarified how state is read in short-story and collection projects
- Added collection-aware guidance around active story and completed story count
- Clarified that “接下来 3 章” can become story-level planning when needed

#### `CHAPTER-OUTLINE.md`
- Clarified that the template may act as a story blueprint when `planning_unit = story`
- Preserved chapter-oriented long-form behavior
- Made story-first usage explicit for short-story and collection modes

### Documentation
- Updated `plugins/novel/README.md`
- Added explanation that planning artifacts now adapt by story format, not only initialization metadata

### Tests
- Updated `tests/install.test.cjs`
- Added checks that installed support artifacts preserve:
  - `story_collection`
  - `planning_unit`
  - format-aware template language

## Verification

- `npm test` ✅
- Format-aware strings verified in:
  - `PROJECT.md`
  - `ROADMAP.md`
  - `STATE.md`
  - `CHAPTER-OUTLINE.md`
  - `plugins/novel/README.md`

## Requirements Addressed

- `PLAN-01`
- `PLAN-02`
- `TMPL-01`
- `TMPL-02`

## Notes

- This phase improved **template interpretation**, not routing logic.
- Long-form remains the strongest/default path.
- Short-story and collection modes now read as intentional planning modes instead of accidental long-form variants.

## Recommended Next Step

Proceed to Phase 3: collection-aware planning and growth model.

---
*Generated after executing Phase 2 / Plan 01 on 2026-04-07*
