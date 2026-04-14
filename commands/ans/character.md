---
description: "Create, inspect, update, check, or delete character records in a structured novel project"
argument-hint: "[--list|--add|--view NAME|--update NAME|--check NAME|--delete NAME]"
allowed-tools:
  - Read
  - Write
  - Edit
  - Bash
  - Glob
  - Grep
---
<objective>
Manage character records for a root-level novel project.

**Creates/Updates:**
- `CHARACTERS.md`
- `characters/[NAME].md`

Use this command to keep the cast list and single-character cards synchronized as the story evolves.
</objective>

<execution_context>
@~/.claude/ai-novel-studio/commands/ans/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/character.md
@~/.claude/ai-novel-studio/references/command-center.md
@~/.claude/ai-novel-studio/references/writing-guide.md
@~/.claude/ai-novel-studio/templates/CHARACTERS.md
@~/.claude/ai-novel-studio/templates/CHARACTER-CARD.md
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
Execute the character workflow from @~/.claude/ai-novel-studio/workflows/character.md end-to-end.
Interpret Claude-style workflow primitives using @~/.claude/ai-novel-studio/commands/ans/_codex-conventions.md.
Preserve all workflow gates (project checks, information gathering, character-card generation, total-table synchronization).
</process>
