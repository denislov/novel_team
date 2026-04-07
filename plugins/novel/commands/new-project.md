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

**After this command:** Use `/novel:write-chapter 1` for the full flow or `/novel:quick-draft 1` for a fast draft.
</objective>

<execution_context>
@commands/_codex-conventions.md
@workflows/new-project.md
@scripts/novel_state.cjs
@skills/novel-command-center/SKILL.md
@skills/novel-writing/SKILL.md
@skills/novel-writing/references/novel-settings-template.md
@templates/PROJECT.md
@templates/CHARACTERS.md
@templates/TIMELINE.md
@templates/ROADMAP.md
@templates/STATE.md
@templates/CHARACTER-CARD.md
</execution_context>

<context>
**Flags:**
- `--auto` — Skip interactive tuning and use defaults where needed
- `--from-doc @idea.md` — Read project setup from an idea or brief document
- `--skip-research` — Skip background research even if the setting suggests it
- `--quick` — Create the minimum viable project skeleton first
</context>

<process>
Execute the new-project workflow from @workflows/new-project.md end-to-end.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Use @scripts/novel_state.cjs when the workflow needs to initialize or refresh shared project state.
Preserve all workflow gates (existing project check, setup questioning, research decision, architecture generation, state initialization).
</process>
