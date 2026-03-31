# Novel

Structured long-form fiction workflow packaged for both Claude Code and Codex plugin marketplaces.

## Included Plugin

- `novel`

## Purpose

This marketplace packages a structured long-form fiction workflow for Claude Code and Codex:

- project initialization
- existing-material import and normalization
- arc planning
- batch chapter outlining
- chapter drafting
- polish and review
- research and fact-checking
- cast, timeline, roadmap, and state tracking

## Repository Layout

```text
novel/
├── .claude-plugin/marketplace.json
├── .agents/plugins/marketplace.json
└── plugins/
    └── novel/
```

Edit the actual plugin under `plugins/novel/`.

## Plugin Surfaces

- Claude marketplace entry: `.claude-plugin/marketplace.json`
- Codex marketplace entry: `.agents/plugins/marketplace.json`
- Claude plugin manifest: `plugins/novel/.claude-plugin/plugin.json`
- Codex plugin manifest: `plugins/novel/.codex-plugin/plugin.json`
- Shared commands, workflows, templates, and most skills live under `plugins/novel/`

## Update Flow

When the local plugin source changes:

```bash
claude plugin marketplace update novel-local-marketplace
claude plugin update novel@novel-local-marketplace
```

For Codex, add this repo as a local plugin marketplace and then install `novel` from that marketplace. In Codex, the plugin is intended to be used through `$novel-*` skills rather than custom slash commands.

## Install

### Codex

Inside Codex:

```text
/plugin marketplace add /home/wh/novel_team
/plugin install novel@novel-local-marketplace
```

If your Codex build exposes plugin installation through UI instead of slash commands, use this repo root as the local marketplace path:

- `/home/wh/novel_team`

Codex will read:

- [marketplace.json](/home/wh/novel_team/.agents/plugins/marketplace.json)
- [plugin.json](/home/wh/novel_team/plugins/novel/.codex-plugin/plugin.json)

After install, use skills such as:

- `$novel-new-project`
- `$novel-map-base`
- `$novel-write-chapter`
- `$novel-progress`

### Claude Code

```bash
claude plugin marketplace add /home/adrian/dev_workspace/novel --scope user
claude plugin install novel@novel-local-marketplace --scope user
```

## Notes

- The plugin name is `novel`.
- The current local marketplace name is `novel-local-marketplace`.
- The structured project layout now lives at the working-directory root, not in a `.novel/` subdirectory.
- Use `/novel:map-base` when the user already has scattered novel materials that need to be normalized.
- Codex compatibility is implemented in-place on the same plugin source rather than a separate fork.
- If you later publish this repo, you can rename the marketplace before distribution if needed.
