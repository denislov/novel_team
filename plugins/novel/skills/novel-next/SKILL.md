---
name: "novel-next"
description: "Compute and run the next logical action in the Novel workflow."
metadata:
  short-description: "Automatically advance to the next action."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-next`.
- Treat all user text after `$novel-next` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:next`.
</codex_skill_adapter>

<execution_context>
@../../commands/next.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/next.md end-to-end.
</process>
