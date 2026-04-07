# Novel

## What This Is

Novel is a local fiction-writing workflow toolkit for Claude Code and Codex. It installs runtime-specific commands, skills, agents, and templates so authors can initialize projects, plan story arcs, draft chapters, review consistency, and manage project memory from Markdown files.

The current brownfield focus is to evolve Novel from a “long-form novel workflow” into a story-planning system that can intentionally support three delivery shapes: single short story, short-story collection, and medium/long-form fiction.

## Core Value

Authors can choose the right planning structure for the story length they actually want to write, without fighting templates or workflows designed for only one narrative scale.

## Requirements

### Validated

- ✓ Root-level fiction project memory works (`PROJECT.md`, `CHARACTERS.md`, `TIMELINE.md`, `ROADMAP.md`, `STATE.md`) — existing shipped behavior
- ✓ Multi-runtime install model works for Claude Code and Codex — existing shipped behavior
- ✓ Core workflow surfaces exist for project setup, planning, drafting, review, and routing — existing shipped behavior

### Active

- [ ] Support explicit project/story formats: long-form fiction, single short story, and short-story collection
- [ ] Make planning depth and generated structure adapt to target length rather than assuming long serialization
- [ ] Ensure short-story projects do not require unnecessary arc/chapter scaffolding
- [ ] Ensure short-story collections can grow incrementally as one-story-per-volume or one-story-per-unit structures
- [ ] Keep existing long-form workflows stable while adding the new planning modes

### Out of Scope

- Mobile reading or publishing platform integration — not core to planning/workflow value
- Real-time collaboration/editor presence — useful later, but unrelated to story-length planning
- Replacing Markdown project memory with a database — unnecessary for current scope

## Context

- The repo is a Node-based installer plus source-bundle architecture under `plugins/novel/`
- Recent work already migrated runtime helper scripts from Python to Node and substantially refactored `map_base`
- Existing templates and workflows strongly reflect long-form / serialized assumptions:
  - chapter-oriented pacing
  - arc/volume roadmaps
  - chapter queue/state focus
- The product should now support:
  1. **中长篇小说**: 20,000+ words, multi-chapter/multi-arc planning
  2. **短故事**: 6,000–20,000 words, lighter planning with fewer structural layers
  3. **短故事集**: multiple short stories collected over time, where each new story extends the overall project

## Constraints

- **Compatibility**: Existing long-form users must not lose current workflows — backwards compatibility matters
- **Runtime**: Node.js-only project runtime — new planning logic should stay in JavaScript/CommonJS-compatible surfaces
- **Interface**: Must work through existing command/skill/template architecture rather than requiring a separate UI app
- **Project Memory**: Markdown remains the source of truth — structure should evolve, not be replaced

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Story length support will be modeled as an explicit project/story format choice | Length is not just metadata; it changes planning shape, required artifacts, and workflow defaults | — Pending |
| Existing long-form path remains the default baseline, not a removed feature | Current shipped value already serves long-form writing | ✓ Good |
| Short story and short-story collection support should reuse the same core memory files where possible | Avoid forking the product into separate tools | — Pending |

---
*Last updated: 2026-04-07 after brownfield project initialization for multi-length story planning*
