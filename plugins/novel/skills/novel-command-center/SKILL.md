---
name: novel-command-center
description: Codex entrypoint for the Novel plugin. Use when the user mentions `/novel:*` commands, wants to initialize or continue a root-level novel project, needs progress/status, or wants natural-language routing to the correct novel workflow.
---

# Novel Command Center

## Overview

Use this skill as the compatibility layer that ports the existing Claude-oriented `novel` tool into Codex. In Codex, the primary entrypoints are `$novel-*` skills, not slash commands.

Load `../../commands/_codex-conventions.md` first, then route to the relevant command or workflow.

## Use This Skill When

- the user mentions `$novel-new-project`, `$novel-write-chapter`, `$novel-progress`, or any other `$novel-*` skill
- the user wants to continue, resume, or inspect a root-level novel project
- the user describes a fiction-writing task in natural language and expects the original `novel` tool behavior inside Codex
- the user needs help deciding which novel workflow to run next

## Routing Rules

1. If the user explicitly names a `$novel-*` skill, honor it and execute the matching skill under `../`.
2. If the user explicitly names a legacy `/novel:*` Claude command while working in Codex, translate it to the corresponding `$novel-*` skill and continue.
3. If the user speaks naturally, route by intent:
   - initialize a project -> `../novel-new-project/SKILL.md`
   - map existing materials into a project -> `../novel-map-base/SKILL.md`
   - plan a new arc -> `../novel-plan-arc/SKILL.md`
   - batch-outline chapters -> `../novel-plan-batch/SKILL.md`
   - write or continue a chapter -> `../novel-write-chapter/SKILL.md`
   - quick draft -> `../novel-quick-draft/SKILL.md`
   - research or fact-check -> `../novel-research/SKILL.md`
   - polish prose -> `../novel-polish/SKILL.md`
   - review or verify consistency -> `../novel-review/SKILL.md` or `../novel-verify/SKILL.md`
   - inspect progress -> `../novel-progress/SKILL.md`
   - auto-route or decide next step -> `../novel-do/SKILL.md` or `../novel-next/SKILL.md`
   - dashboard-style coordination -> `../novel-manager/SKILL.md`
4. If the routed workflow requires an existing structured project and none exists:
   - choose `../novel-map-base/SKILL.md` when the user already has existing notes, drafts, or source materials
   - otherwise choose `../novel-new-project/SKILL.md`

## Command Compatibility

Codex can still use the existing `commands/` directory. When a command refers to older Claude-style workflow primitives, apply the translation rules from `../../commands/_codex-conventions.md`.

## Working Rules

- Prefer maintaining `PROJECT.md`, `CHARACTERS.md`, `TIMELINE.md`, `ROADMAP.md`, and `STATE.md` over answering only in chat.
- Read the smallest useful set of context files before writing.
- If the user asks for help or an overview, use `../../commands/help.md` and `../../workflows/help.md` as the canonical reference.
