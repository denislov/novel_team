---
name: "novel-autonomous"
description: "Run autonomous multi-chapter generation in controlled batches."
metadata:
  short-description: "Autonomously generate multiple chapters."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-autonomous`.
- Treat all user text after `$novel-autonomous` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:autonomous`.
</codex_skill_adapter>

<execution_context>
@../../commands/autonomous.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/autonomous.md end-to-end.
</process>
