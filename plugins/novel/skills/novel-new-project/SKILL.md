---
name: "novel-new-project"
description: "Initialize a new root-level novel project with PROJECT.md, CHARACTERS.md, TIMELINE.md, ROADMAP.md, STATE.md, chapters, characters, research, and reviews."
metadata:
  short-description: "Initialize a new root-level novel project."
---

<codex_skill_adapter>
- This skill is invoked by mentioning `$novel-new-project`.
- Treat all user text after `$novel-new-project` as workflow arguments.
- For Codex, this skill is the primary replacement for the Claude-only slash command `/novel:new-project`.
</codex_skill_adapter>

<execution_context>
@../../commands/new-project.md
</execution_context>

<process>
Execute the command wrapper from @../../commands/new-project.md end-to-end.
</process>
