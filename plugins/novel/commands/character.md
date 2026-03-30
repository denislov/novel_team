---
description: "Create, inspect, update, check, or delete character records in a structured novel project"
argument-hint: "[--list|--add|--view NAME|--update NAME|--check NAME|--delete NAME]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
  - Task
  - AskUserQuestion
---
<objective>
Manage character records for a `.novel/` project.

**Creates/Updates:**
- `.novel/CHARACTERS.md`
- `.novel/characters/[NAME].md`

Use this command to keep the cast list and single-character cards synchronized as the story evolves.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/character.md
@${CLAUDE_PLUGIN_ROOT}/skills/novel-writing/SKILL.md
@${CLAUDE_PLUGIN_ROOT}/templates/CHARACTERS.md
@${CLAUDE_PLUGIN_ROOT}/templates/CHARACTER-CARD.md
</execution_context>

<context>
**Actions:**
- `--list` — List all current characters
- `--add` — Create a new character record
- `--view NAME` — Show a single character card
- `--update NAME` — Update an existing character
- `--check NAME` — Check character consistency
- `--delete NAME` — Remove a character from the project

If only a name is provided, the workflow defaults to viewing that character.
</context>

<process>
Execute the character workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/character.md end-to-end.
Preserve all workflow gates (project checks, information gathering, character-card generation, total-table synchronization).
</process>
