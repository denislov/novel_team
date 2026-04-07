# Novel

Structured long-form fiction workflow source bundle for Claude Code and Codex.

## What It Provides

- Commands for project setup, planning, drafting, review, research, and routing
- Specialized agents for architecture, planning, writing, editing, review, and research
- Codex skills for natural-language routing and state-aware writing workflow guidance
- Templates for root-level project files
- Workflows for progression, progress reporting, routing, and command-center style control

## Install Model

The current install path is the repo CLI:

```bash
node bin/install.js install --all --global
```

The runtime materialization logic now follows the same principle as `get-shit-done`: keep one source bundle here, then generate the correct installed surface for each runtime.

## Runtime Split

This source tree is shared, but the installed output is intentionally different:

- Claude Code installs slash commands to `commands/novel/` and raw agent markdown to `agents/`
- Codex installs top-level skills to `skills/`, support files to `novel/`, and named agent registrations to `config.toml` plus `agents/*.toml`

That split is required because Claude discovers agents from markdown frontmatter, while Codex discovers named agents from its config and per-agent TOML files.

## Codex Compatibility Layer

The Codex port keeps the existing `commands/`, `workflows/`, `templates/`, and `agents/` directories, then adds a compatibility layer:

- `commands/_codex-conventions.md` translates Claude-oriented workflow primitives such as `AskUserQuestion`, `SpawnAgent`, and `SlashCommand`
- `skills/novel-command-center/SKILL.md` acts as the Codex router for `$novel-*` skills and natural-language requests
- `skills/novel-writing/SKILL.md` remains the core writing/style/project-memory skill
- `scripts/map_base.cjs` provides a real import/normalization implementation for `/novel:map-base`
- `scripts/novel_state.cjs` provides shared state, target, and range resolution used across the core workflows

## Primary Entry Points

In Codex, use skills rather than slash commands:

- `$novel-new-project`
- `$novel-map-base`
- `$novel-plan-arc`
- `$novel-plan-batch`
- `$novel-write-chapter`
- `$novel-review`
- `$novel-polish`
- `$novel-progress`
- `$novel-next`
- `$novel-help`

In Claude Code, use slash commands such as:

- `/novel:new-project`
- `/novel:map-base`
- `/novel:plan-arc`
- `/novel:plan-batch`
- `/novel:write-chapter`
- `/novel:review`
- `/novel:progress`

## Core Files

The installed workflow is built around a root-level project layout:

- `PROJECT.md`
- `CHARACTERS.md`
- `TIMELINE.md`
- `ROADMAP.md`
- `STATE.md`
- `chapters/outlines/`
- `chapters/`
- `reviews/`
- `research/`
