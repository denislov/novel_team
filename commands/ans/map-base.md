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
@~/.claude/ai-novel-studio/commands/ans/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/map-base.md
</execution_context>

<context>
**Flags:**
- `--from=DIR` — Scan a specific directory instead of the current directory
- `--merge` — Merge into an already structured project instead of failing
- `--force` — Overwrite existing normalized targets when needed
- `--dry-run` — Only report what would be mapped, do not write files
</context>

<process>
Execute the workflow `workflows/map-base.md` using the exact arguments provided in `<context>`.
This command is purely an entry point; DO NOT execute any logic directly. All orchestration and initialization MUST be handled by the logic inside the workflow file.
</process>
