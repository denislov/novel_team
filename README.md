# Novel

Structured long-form fiction workflow for Claude Code and Codex, now installed through a CLI instead of plugin marketplace registration.

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

If you prefer `npx`, this repo now exposes the `novel-tool` binary via `package.json`.

## Installed Layout

The source of truth still lives under `plugins/novel/`, but the installer materializes runtime-specific surfaces:

- Claude Code: `~/.claude/commands/novel/*.md`, `~/.claude/agents/novel-*.md`, `~/.claude/novel/*`
- Codex: `~/.codex/skills/novel-*`, `~/.codex/agents/novel-*.toml`, `~/.codex/config.toml`, `~/.codex/novel/*`

The extra `novel/` support bundle is intentional. It keeps command, workflow, template, script, and skill references stable after install instead of depending on plugin-root-relative paths.

## Documentation

- [User Guide](docs/GETTING-STARTED.md) — formal usage guide for installing, initializing, planning, writing, reviewing, and troubleshooting Novel
- [Plugin Source Guide](plugins/novel/README.md) — runtime split, supported story shapes, and source-bundle architecture

## Why This Changed

The old local-plugin install flow had three reliability problems:

- installation depended on plugin marketplace registration instead of a reproducible CLI entrypoint
- command and skill files used plugin-root-relative paths that broke once materialized outside the repo
- Codex and Claude do not recognize agents the same way, so one shared manifest was not enough

The new installer fixes that by:

- writing Claude slash commands and Claude agent markdown directly into Claude's config tree
- writing Codex skills plus per-agent `.toml` configs and the matching `config.toml` sections for named agents
- rewriting internal references to installed absolute paths
- exposing `validate` so incomplete installs fail visibly

## Repository Layout

```text
novel_team/
├── bin/install.js
├── package.json
├── plugins/novel/
└── tests/
```

`plugins/novel/` remains the editable source bundle for commands, workflows, templates, scripts, skills, and agent prompts.

## Legacy Plugin Files

The old marketplace manifests are still in the repo for reference and source continuity:

- `.claude-plugin/marketplace.json`
- `.agents/plugins/marketplace.json`
- `plugins/novel/.claude-plugin/plugin.json`
- `plugins/novel/.codex-plugin/plugin.json`

They are no longer the primary install path.
