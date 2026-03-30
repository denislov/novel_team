# Novel

Structured long-form fiction workflow packaged as a Claude Code marketplace repo.

## Included Plugin

- `novel`

## Purpose

This marketplace packages a structured long-form fiction workflow for Claude Code:

- project initialization
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
└── plugins/
    └── novel/
```

Edit the actual plugin under `plugins/novel/`.

## Update Flow

When the local plugin source changes:

```bash
claude plugin marketplace update novel-local-marketplace
claude plugin update novel@novel-local-marketplace
```

## Install

```bash
claude plugin marketplace add /home/adrian/dev_workspace/novel --scope user
claude plugin install novel@novel-local-marketplace --scope user
```

## Notes

- The plugin name is `novel`.
- The current local marketplace name is `novel-local-marketplace`.
- If you later publish this repo, you can rename the marketplace before distribution if needed.
