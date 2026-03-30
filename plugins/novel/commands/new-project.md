---
description: "Initialize a structured `.novel/` project with project contract, cast, timeline, roadmap, and state"
argument-hint: "[--auto] [--from-doc @idea.md] [--skip-research] [--quick]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
---
<objective>
Initialize a new novel project end-to-end from concept to a working `.novel/` workspace.

**Creates:**
- `.novel/PROJECT.md`
- `.novel/CHARACTERS.md`
- `.novel/TIMELINE.md`
- `.novel/ROADMAP.md`
- `.novel/STATE.md`
- `.novel/chapters/`
- `.novel/characters/`
- `.novel/research/`
- `.novel/reviews/`

**After this command:** Use `/novel:write-chapter 1` for the full flow or `/novel:quick-draft 1` for a fast draft.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/new-project.md
@${CLAUDE_PLUGIN_ROOT}/skills/novel-writing/SKILL.md
@${CLAUDE_PLUGIN_ROOT}/skills/novel-writing/references/novel-settings-template.md
@${CLAUDE_PLUGIN_ROOT}/templates/PROJECT.md
@${CLAUDE_PLUGIN_ROOT}/templates/CHARACTERS.md
@${CLAUDE_PLUGIN_ROOT}/templates/TIMELINE.md
@${CLAUDE_PLUGIN_ROOT}/templates/ROADMAP.md
@${CLAUDE_PLUGIN_ROOT}/templates/STATE.md
@${CLAUDE_PLUGIN_ROOT}/templates/CHARACTER-CARD.md
</execution_context>

<context>
**Flags:**
- `--auto` — Skip interactive tuning and use defaults where needed
- `--from-doc @idea.md` — Read project setup from an idea or brief document
- `--skip-research` — Skip background research even if the setting suggests it
- `--quick` — Create the minimum viable project skeleton first
</context>

<process>
Execute the new-project workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/new-project.md end-to-end.
Preserve all workflow gates (existing project check, setup questioning, research decision, architecture generation, state initialization).
</process>
