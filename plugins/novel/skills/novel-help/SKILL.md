---
name: "novel-help"
description: "Show the complete Novel command and skill reference."
metadata:
  short-description: "Show Novel usage reference."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-help`.
- Treat all user text after `$novel-help` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:help`.
</codex_skill_adapter>

<execution_context>
@../../commands/help.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/help.md end-to-end.
</process>
