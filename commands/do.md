---
description: "Route freeform text to the right novel command automatically"
argument-hint: "<describe what you want to do>"
allowed-tools:
  - Read
  - Bash
---
<objective>
Analyze freeform natural language input and dispatch to the most appropriate `/novel:*` command.

This is a smart router. It does not do the work itself.
</objective>

<execution_context>
@commands/_codex-conventions.md
@workflows/do.md
@references/command-center.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
Execute the do workflow from @workflows/do.md end-to-end.
Interpret Claude-style workflow primitives using @commands/_codex-conventions.md.
Route user intent to the best novel command and invoke it.
</process>
