---
description: "Initialize a root-level structured novel project with project contract, cast, timeline, roadmap, and state"
argument-hint: "[--auto] [--from-doc @idea.md] [--skip-research] [--quick]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
---
<objective>
Initialize a new novel project end-to-end from concept to a working root-level project layout.

**Creates:**
- `PROJECT.md`
- `CHARACTERS.md`
- `TIMELINE.md`
- `ROADMAP.md`
- `STATE.md`
- `chapters/`
- `characters/`
- `research/`
- `reviews/`

**After this command:** Use `/ans:write-chapter 1` for the full flow or `/ans:quick-draft 1` for a fast draft.
</objective>

<execution_context>
@~/.claude/ai-novel-studio/commands/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/new-project.md
</execution_context>

<context>
**Flags:**
- `--auto` — Skip interactive tuning and use defaults where needed
- `--from-doc @idea.md` — Read project setup from an idea or brief document
- `--skip-research` — Skip background research even if the setting suggests it
- `--quick` — Create the minimum viable project skeleton first

**Initialization contract:**
- The workflow now captures `story_format` as one of: `long_form`, `short_story`, `story_collection`
- It also persists `planning_unit` and `target_length_band` so later planning can adapt without breaking current long-form defaults
</context>

<process>
Execute the workflow `workflows/new-project.md` using the exact arguments provided in `<context>`.
This command is purely an entry point; DO NOT execute any logic directly. All orchestration and initialization MUST be handled by the logic inside the workflow file.
</process>
