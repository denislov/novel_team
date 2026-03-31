---
name: "novel-polish"
description: "Polish one or more completed chapters and optionally replace the formal manuscript."
metadata:
  short-description: "Polish chapter prose."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-polish`.
- Treat all user text after `$novel-polish` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:polish`.
</codex_skill_adapter>

<execution_context>
@../../commands/polish.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/polish.md end-to-end.
</process>
