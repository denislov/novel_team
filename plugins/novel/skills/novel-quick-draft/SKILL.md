---
name: "novel-quick-draft"
description: "Produce a fast draft for a chapter without the full planning and review pipeline."
metadata:
  short-description: "Quick-draft a chapter."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-quick-draft`.
- Treat all user text after `$novel-quick-draft` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:quick-draft`.
</codex_skill_adapter>

<execution_context>
@../../commands/quick-draft.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/quick-draft.md end-to-end.
</process>
