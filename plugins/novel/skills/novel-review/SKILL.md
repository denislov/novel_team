---
name: "novel-review"
description: "Review one or more chapters for consistency, timeline accuracy, logic gaps, and web-novel pitfalls."
metadata:
  short-description: "Review chapter consistency and quality."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-review`.
- Treat all user text after `$novel-review` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:review`.
</codex_skill_adapter>

<execution_context>
@../../commands/review.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/review.md end-to-end.
</process>
