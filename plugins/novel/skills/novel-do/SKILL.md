---
name: "novel-do"
description: "Natural-language router for the Novel tool."
metadata:
  short-description: "Route freeform requests to the right Novel workflow."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-do`.
- Treat all user text after `$novel-do` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:do`.
</codex_skill_adapter>

<execution_context>
@../../commands/do.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/do.md end-to-end.
</process>
