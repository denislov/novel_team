---
description: "Route freeform text to the right novel command automatically"
argument-hint: "<describe what you want to do>"
allowed-tools:
  - Read
  - Bash
  - AskUserQuestion
---
<objective>
Analyze freeform natural language input and dispatch to the most appropriate `/novel:*` command.

This is a smart router. It does not do the work itself.
</objective>

<execution_context>
@${CLAUDE_PLUGIN_ROOT}/workflows/do.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
Execute the do workflow from @${CLAUDE_PLUGIN_ROOT}/workflows/do.md end-to-end.
Route user intent to the best novel command and invoke it.
</process>
