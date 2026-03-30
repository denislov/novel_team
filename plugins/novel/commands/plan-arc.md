---
description: "Plan a new story arc or volume and update roadmap, timeline, and cast implications for future chapters"
argument-hint: "[arc name] [--chapters=N] [--goal=\"...\"] [--research=\"...\"]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Task
  - AskUserQuestion
  - WebSearch
  - WebFetch
---
<objective>
Plan a new story arc, volume, or major stage for an existing `.novel/` project.

**Creates/Updates:**
- `.novel/ROADMAP.md`
- `.novel/TIMELINE.md`
- `.novel/CHARACTERS.md`
- `.novel/PROJECT.md` when the new arc expands the setting
- `.novel/research/arc-*.md` when research is requested

Use this command after one arc is stable and you need the next major stage designed before drafting chapters.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/plan-arc.md
@${CLAUDE_PLUGIN_ROOT}/skills/novel-writing/SKILL.md
@${CLAUDE_PLUGIN_ROOT}/templates/PROJECT.md
@${CLAUDE_PLUGIN_ROOT}/templates/ROADMAP.md
@${CLAUDE_PLUGIN_ROOT}/templates/CHARACTERS.md
@${CLAUDE_PLUGIN_ROOT}/templates/TIMELINE.md
@${CLAUDE_PLUGIN_ROOT}/templates/STATE.md
@${CLAUDE_PLUGIN_ROOT}/templates/RESEARCH.md
</execution_context>

<context>
**Arguments:**
- `[arc name]` — Name or label for the new arc

**Flags:**
- `--chapters=N` — Expected chapter count for the arc
- `--goal="..."` — Core conflict or phase objective
- `--research="..."` — Run supporting research before planning the arc
</context>

<process>
Execute the plan-arc workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/plan-arc.md end-to-end.
Preserve all workflow gates (project load, optional research, architect pass, roadmap/timeline/cast updates).
</process>
