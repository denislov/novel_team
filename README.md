# AI Novel Studio

Structured fiction workflow for Claude Code, Codex, OpenCode, Gemini, Copilot, Cursor, Windsurf, and Antigravity.

The repo uses a top-level, source-first layout:

- `commands/` defines the public command surface
- `agents/` defines named specialist subagents
- `ai-novel-studio/` is the support bundle copied into the runtime config directory
- `hooks/` contains runtime hooks, built into `hooks/dist/` before publish
- `scripts/` contains packaging and verification helpers

## Install

From the repo:

```bash
node bin/install.js --all --global
```

With `npx`:

```bash
npx ans-tool@latest --all --global
```

Common operations:

```bash
node bin/install.js --claude --global
node bin/install.js --codex --global
node bin/install.js --codex --global --validate
node bin/install.js --codex --global --repair
node bin/install.js --codex --global --uninstall
```

## Runtime Layout

- Claude Code: `~/.claude/skills/ans-*`, `~/.claude/agents/ans-*.md`, `~/.claude/ai-novel-studio/*`
- Codex: `~/.codex/skills/ans-*`, `~/.codex/agents/ans-*.toml`, `~/.codex/config.toml`, `~/.codex/ai-novel-studio/*`
- OpenCode: `~/.config/opencode/command/ans-*.md`, `~/.config/opencode/agent/ans-*.md`, `~/.config/opencode/ai-novel-studio/*`

The source repo does not keep a checked-in `skills/` tree. Skills are generated from `commands/ans/*.md` during install.

## Entry Points

Codex:

- `$ans-new-project`
- `$ans-map-base`
- `$ans-plan-arc`
- `$ans-plan-batch`
- `$ans-write-chapter`
- `$ans-review`
- `$ans-polish`
- `$ans-progress`
- `$ans-next`
- `$ans-help`

Claude Code:

- `ans-new-project`
- `ans-map-base`
- `ans-plan-arc`
- `ans-plan-batch`
- `ans-write-chapter`
- `ans-review`
- `ans-polish`
- `ans-progress`
- `ans-next`
- `ans-help`

## Source Layout

```text
ai-novel-studio/
├── agents/
├── commands/
├── hooks/
├── scripts/
├── ai-novel-studio/
│   ├── bin/
│   ├── commands/
│   ├── references/
│   ├── templates/
│   └── workflows/
├── bin/install.js
├── docs/
├── package.json
└── tests/
```

## Design Notes

- Public commands stay thin; real execution logic lives in `ai-novel-studio/workflows/`.
- Named agents are part of the runtime contract. If a workflow declares a named delegated stage, it should use the matching `ans-*` agent rather than silently inlining the work.
- Runtime hooks are packaged explicitly through `scripts/build-hooks.js` so npm releases do not miss required hook files.

## Documentation

- [Getting Started](docs/GETTING-STARTED.md)
