# Novel

Structured fiction workflow for Claude Code and Codex, installed through a CLI and sourced from top-level project directories in the same style as `get-shit-done`.

## Install

Use the installer directly from this repo:

```bash
node bin/install.js install --all --global
```

Common operations:

```bash
node bin/install.js install --claude --global
node bin/install.js install --codex --global
node bin/install.js update --all --global
node bin/install.js uninstall --codex --global
node bin/install.js validate --all --global
```

If you prefer `npx`, this repo exposes the `novel-tool` binary via `package.json`.

## Installed Layout

The installer materializes runtime-specific surfaces from the top-level source tree:

- Claude Code: `~/.claude/skills/novel-*/SKILL.md`, `~/.claude/agents/novel-*.md`, `~/.claude/novel/*`
- Codex: `~/.codex/skills/novel-*`, `~/.codex/agents/novel-*.toml`, `~/.codex/config.toml`, `~/.codex/novel/*`

Important:

- Claude installs Novel as top-level `skills/novel-*`.
- Codex installs the public `$novel-*` skill surface plus named agent configs.
- The source repo no longer keeps a `skills/` tree. Runtime skills are generated from command markdown during install.
- The extra `novel/` support bundle is intentional. It keeps command, workflow, reference, template, and script paths stable after install.

## Source Layout

The editable source now lives at the repo top level:

```text
novel_team/
├── agents
├── commands
├── references
├── scripts
├── templates
├── workflows
├── bin/install.js
├── package.json
└── tests
```

`references` replaces the old source-only internal skills. Shared writing guidance, routing guidance, and reusable reference material now live there directly.

## What It Provides

- Commands for project setup, planning, drafting, review, research, and routing
- Specialized agents for architecture, planning, writing, editing, review, and research
- References for routing, project memory, writing quality, immersion, and common pitfalls
- Templates for root-level project files
- Workflows for progression, progress reporting, routing, and command-center style control

## Supported Story Shapes

- **Long-form novel**: chapter- and arc-driven planning, existing default path
- **Single short story**: lighter planning for works in roughly the 6k–20k range
- **Short-story collection**: story-by-story planning with collection growth tracking

The initialization contract distinguishes these shapes explicitly so later planning behavior can adapt without breaking the existing long-form workflow.

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

In Claude Code, use the same skill names without the `$` prefix:

- `novel-new-project`
- `novel-map-base`
- `novel-plan-arc`
- `novel-plan-batch`
- `novel-write-chapter`
- `novel-review`
- `novel-progress`
- `novel-next`
- `novel-help`

## Codex Execution Reliability

For Codex, treat **installation correctness** and **execution correctness** as separate checks:

- installation correctness means Novel wrote the public `$novel-*` skills, named agent registrations, and support bundle files
- execution correctness means a workflow that declares `SpawnAgent(...)` stages actually delegates to those named agents instead of silently completing the stage inline

The supported safe path in Codex is the explicit public `$novel-*` skill surface.
The internal command-center reference is support material, not the public runtime contract.

When a public Novel workflow declares named `SpawnAgent(...)` stages:

- those named agents are part of the expected runtime contract
- delegated stages should not be silently inlined
- long-form compatibility remains the baseline while this contract is hardened

If a Codex install looks incomplete, or a run is not respecting the declared named-agent stages, validate and repair the install before retrying:

```bash
novel-tool validate --codex --global
node bin/install.js validate --codex --global
novel-tool update --codex --global
```

## Documentation

- [User Guide](docs/GETTING-STARTED.md)

## Legacy Manifests

Marketplace compatibility files remain at the repo root for continuity:

- `.claude-plugin/marketplace.json`
- `.agents/plugins/marketplace.json`
- `.claude-plugin/plugin.json`
- `.codex-plugin/plugin.json`
