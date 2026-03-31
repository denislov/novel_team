---
name: "novel-character"
description: "Inspect, add, update, and manage character records in a Novel project."
metadata:
  short-description: "Manage character records."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-character`.
- Treat all user text after `$novel-character` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:character`.
</codex_skill_adapter>

<execution_context>
@../../commands/character.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/character.md end-to-end.
</process>
