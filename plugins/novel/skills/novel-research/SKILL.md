---
name: "novel-research"
description: "Research historical, technical, or setting-specific questions for a Novel project."
metadata:
  short-description: "Research setting and fact details."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-research`.
- Treat all user text after `$novel-research` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:research`.
</codex_skill_adapter>

<execution_context>
@../../commands/research.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/research.md end-to-end.
</process>
