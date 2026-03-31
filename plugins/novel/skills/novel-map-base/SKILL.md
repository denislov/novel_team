---
name: "novel-map-base"
description: "Import scattered novel materials into the root-level Novel project layout."
metadata:
  short-description: "Import an existing novel directory into Novel."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-map-base`.
- Treat all user text after `$novel-map-base` as workflow arguments.
- For Codex, this skill is the primary replacement for `/novel:map-base`.
</codex_skill_adapter>

<execution_context>
@../../commands/map-base.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/map-base.md end-to-end.
</process>
