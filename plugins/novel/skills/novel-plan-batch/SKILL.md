---
name: "novel-plan-batch"
description: "Generate a contiguous batch of chapter outlines for a target range."
metadata:
  short-description: "Batch-plan chapter outlines."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-plan-batch`.
- Treat all user text after `$novel-plan-batch` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:plan-batch`.
</codex_skill_adapter>

<execution_context>
@../../commands/plan-batch.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/plan-batch.md end-to-end.
</process>
