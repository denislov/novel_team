---
name: "novel-plan-arc"
description: "Plan a new arc or volume for an existing Novel project."
metadata:
  short-description: "Plan the next arc or volume."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-plan-arc`.
- Treat all user text after `$novel-plan-arc` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:plan-arc`.
</codex_skill_adapter>

<execution_context>
@../../commands/plan-arc.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/plan-arc.md end-to-end.
</process>
