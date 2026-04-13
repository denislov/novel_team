---
description: "Route freeform text to the right novel command automatically"
argument-hint: "<describe what you want to do>"
allowed-tools:
  - Read
  - Bash
---
<objective>
Analyze freeform natural language input and dispatch to the most appropriate `/ans:*` command.

This is a smart router. It does not do the work itself.
</objective>

<execution_context>
@~/.claude/ai-novel-studio/commands/_codex-conventions.md
@~/.claude/ai-novel-studio/workflows/do.md
@~/.claude/ai-novel-studio/references/command-center.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
Execute the do workflow from @workflows/do.md end-to-end.
Interpret Claude-style workflow primitives using @~/.claude/ai-novel-studio/commands/_codex-conventions.md.
Route user intent to the best novel command and invoke it.
</process>
