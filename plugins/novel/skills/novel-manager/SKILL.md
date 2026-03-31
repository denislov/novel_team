---
name: "novel-manager"
description: "Open the Novel command center for project-wide routing and oversight."
metadata:
  short-description: "Open the Novel command center."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-manager`.
- Treat all user text after `$novel-manager` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:manager`.
</codex_skill_adapter>

<execution_context>
@../../commands/manager.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/manager.md end-to-end.
</process>
