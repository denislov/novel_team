---
name: "novel-quick-polish"
description: "Run a fast polish pass over one or more chapters."
metadata:
  short-description: "Quickly polish chapter prose."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-quick-polish`.
- Treat all user text after `$novel-quick-polish` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:quick-polish`.
</codex_skill_adapter>

<execution_context>
@../../commands/quick-polish.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/quick-polish.md end-to-end.
</process>
