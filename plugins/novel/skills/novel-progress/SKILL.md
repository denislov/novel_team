---
name: "novel-progress"
description: "Show Novel project progress and recommend the next action."
metadata:
  short-description: "Show project progress and next action."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-progress`.
- Treat all user text after `$novel-progress` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:progress`.
</codex_skill_adapter>

<execution_context>
@../../commands/progress.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/progress.md end-to-end.
</process>
