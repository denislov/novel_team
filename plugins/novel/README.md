# Novel Plugin

Structured long-form fiction workflow plugin for Claude Code.

## What It Provides

- Commands for project setup, planning, drafting, review, research, and routing
- Specialized agents for architecture, planning, writing, editing, review, and research
- A `novel-writing` skill for style, structure, and state-aware workflow guidance
- Templates for `.novel/` project files
- Workflows for progression, progress reporting, routing, and command-center style control

## Key Commands

- `/novel:new-project`
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

The plugin is built around a structured `.novel/` workspace:

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

If this plugin is installed from the local marketplace:

```bash
claude plugin marketplace update novel-local-marketplace
claude plugin update novel@novel-local-marketplace
```

This plugin is intended to live under:

- `plugins/novel/`

inside the repository root that contains `.claude-plugin/marketplace.json`.
