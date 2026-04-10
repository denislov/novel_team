---
description: "Map an existing directory of novel materials into a root-level structured project"
argument-hint: "[--from=DIR] [--merge] [--force] [--dry-run]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---
<objective>
Normalize an existing directory of scattered novel materials into Novel's root-level structured project layout.

**Creates/Updates:**
- `PROJECT.md`
- `CHARACTERS.md`
- `TIMELINE.md`
- `ROADMAP.md`
- `STATE.md`
- `chapters/`
- `characters/`
- `research/`
- `reviews/map-base-report.md`

Use this command when the current directory already contains notes, drafts, chapter files,人物设定,时间线文档, or other小说资料, but has not yet been整理成 Novel 的标准结构。
</objective>

<execution_context>
@commands/_codex-conventions.md
@workflows/map-base.md
@scripts/map_base.cjs
@references/command-center.md
@references/writing-guide.md
@templates/PROJECT.md
@templates/CHARACTERS.md
@templates/TIMELINE.md
@templates/ROADMAP.md
@templates/STATE.md
@templates/CHARACTER-CARD.md
@templates/CHAPTER.md
@templates/CHAPTER-OUTLINE.md
@templates/RESEARCH.md
@templates/REVIEW.md
</execution_context>

<context>
**Flags:**
- `--from=DIR` — Scan a specific directory instead of the current directory
- `--merge` — Merge into an already structured project instead of failing
- `--force` — Overwrite existing normalized targets when needed
- `--dry-run` — Only report what would be mapped, do not write files
</context>

<process>
Execute the map-base workflow from @workflows/map-base.md end-to-end.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Use @scripts/map_base.cjs as the primary implementation for scanning, classification, normalization, and report generation.
Preserve all workflow gates (source scan, material classification, root-level normalization, core-file synthesis, import report generation).
</process>
