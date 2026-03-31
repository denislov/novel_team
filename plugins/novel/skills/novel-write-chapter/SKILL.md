---
name: "novel-write-chapter"
description: "Run the full chapter pipeline: outline, draft, polish, review, and state refresh."
metadata:
  short-description: "Write a chapter through the full pipeline."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-write-chapter`.
- Treat all user text after `$novel-write-chapter` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:write-chapter`.
</codex_skill_adapter>

<execution_context>
@../../commands/write-chapter.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/write-chapter.md end-to-end.
</process>
