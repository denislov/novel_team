---
name: "novel-verify"
description: "Run the review workflow in verification mode."
metadata:
  short-description: "Verify chapter consistency."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-verify`.
- Treat all user text after `$novel-verify` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:verify`.
</codex_skill_adapter>

<execution_context>
@../../commands/verify.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/verify.md end-to-end.
</process>
