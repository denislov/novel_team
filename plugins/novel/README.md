# Novel

Structured fiction workflow source bundle for Claude Code and Codex, supporting long-form novels, single short stories, and growing short-story collections.

## What It Provides

- Commands for project setup, planning, drafting, review, research, and routing
- Specialized agents for architecture, planning, writing, editing, review, and research
- Codex skills for natural-language routing and state-aware writing workflow guidance
- Templates for root-level project files
- Workflows for progression, progress reporting, routing, and command-center style control

## Supported Story Shapes

- **Long-form novel** — chapter- and arc-driven planning, existing default path
- **Single short story** — lighter planning for works in roughly the 6k–20k range
- **Short-story collection** — multiple short stories that accumulate over time, with story-level planning as the primary unit

The initialization contract now distinguishes these shapes explicitly so later planning behavior can adapt without breaking the existing long-form workflow.

## Format-Aware Planning Artifacts

Novel now treats story shape as more than metadata:

- `PROJECT.md` records whether the project is long-form, short-story, or collection mode
- `ROADMAP.md` can be interpreted as volume/arc planning for long-form, or story-level planning for short stories and collections
- `STATE.md` can track chapter progress for long-form or story-level progress for short fiction and collections
- `CHAPTER-OUTLINE.md` remains chapter-compatible, but can also serve as a compact story blueprint when `planning_unit = story`

For **short-story collections**, the project memory now distinguishes:
- collection-level growth: completed stories, active story, next story queue
- story-level planning: the currently active story’s own outline and optional chapter decomposition

This keeps one shared workflow surface while making the planning artifacts more appropriate for different fiction lengths.

## Format-Aware Recommendations

`progress` and `next` are now expected to adapt by project format:

- **long_form** keeps chapter/arc-first recommendation behavior
- **short_story** prefers lightweight single-story planning, drafting, review, and finish flow
- **story_collection** prefers story-by-story progression, using collection growth state instead of assuming long-form chapter buffers

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

## Codex Execution Reliability

For Codex, treat **installation correctness** and **execution correctness** as separate checks:

- installation correctness means Novel wrote the public `$novel-*` skills, named agent registrations, and support bundle files
- execution correctness means a workflow that declares `SpawnAgent(...)` stages actually delegates to those named agents instead of silently completing the stage inline

The supported safe path in Codex is the explicit public `$novel-*` skill surface. The internal `novel-command-center` remains a support layer, not the primary public reliability contract.

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

This reliability work complements the format-aware routing changes: `progress` and `next` still adapt by project format, while Codex execution hardening makes delegated workflow behavior more trustworthy.

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
