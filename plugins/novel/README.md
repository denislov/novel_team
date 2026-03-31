# Novel Plugin

Structured long-form fiction workflow plugin for Claude Code and Codex.

## What It Provides

- Commands for project setup, planning, drafting, review, research, and routing
- Specialized agents for architecture, planning, writing, editing, review, and research
- Codex skills for natural-language routing and state-aware writing workflow guidance
- Templates for root-level project files
- Workflows for progression, progress reporting, routing, and command-center style control

## Codex Compatibility

This plugin now includes a Codex manifest and marketplace entry:

- `plugins/novel/.codex-plugin/plugin.json`
- `.agents/plugins/marketplace.json`

The Codex port keeps the existing `commands/`, `workflows/`, `templates/`, and `agents/` directories, then adds a small compatibility layer:

- `commands/_codex-conventions.md` translates Claude-oriented workflow primitives such as `AskUserQuestion`, `SpawnAgent`, and `SlashCommand`
- `skills/novel-command-center/SKILL.md` acts as the Codex router for `$novel-*` skills and natural-language requests
- `skills/novel-writing/SKILL.md` remains the core writing/style/project-memory skill
- `scripts/map_base.py` provides a real import/normalization implementation for `/novel:map-base`
- `scripts/novel_state.py` provides shared state, target, and range resolution used across the core workflows

## Codex Entry Pattern

In Codex, use skills rather than custom slash commands. The primary entrypoints are:

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

The `/novel:*` forms remain in the repo as Claude compatibility aliases.

## Key Commands

- `/novel:new-project`
- `/novel:map-base`
- `/novel:plan-arc`
- `/novel:plan-batch`
- `/novel:write-chapter`
- `/novel:quick-draft`
- `/novel:research`
- `/novel:review`
- `/novel:verify`
- `/novel:progress`
- `/novel:next`
- `/novel:do`
- `/novel:manager`

## Core Files

The plugin is built around a root-level project layout:

- `PROJECT.md`
- `CHARACTERS.md`
- `TIMELINE.md`
- `ROADMAP.md`
- `STATE.md`
- `chapters/outlines/`
- `chapters/`
- `reviews/`
- `research/`

## Update Flow

If this plugin is installed from the Claude local marketplace:

```bash
claude plugin marketplace update novel-local-marketplace
claude plugin update novel@novel-local-marketplace
```

This plugin is intended to live under:

- `plugins/novel/`

inside the repository root that contains `.claude-plugin/marketplace.json` and `.agents/plugins/marketplace.json`.

## Install In Codex

From Codex, add this repo as a local marketplace and install the plugin:

```text
/plugin marketplace add /home/wh/novel_team
/plugin install novel@novel-local-marketplace
```

If your Codex build uses a plugins UI instead of slash commands, use the repo root as the local marketplace path:

- `/home/wh/novel_team`

After installation, invoke the plugin through skills such as `$novel-new-project` or `$novel-map-base`.
