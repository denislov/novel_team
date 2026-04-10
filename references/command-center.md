# Novel Command Center Reference

This reference documents how Novel routes user intent to the correct command and installed `$novel-*` skill surface.

## Public Entry Points

- In Codex, use the explicit public `$novel-*` skills.
- In Claude Code, use the matching `novel-*` skill names.
- Legacy `/novel:*` command names are compatibility aliases and should be translated to the matching public skill.

## Routing Rules

1. If the user explicitly names a Novel entrypoint, honor it.
2. If the user describes the task naturally, route by intent:
   - initialize a project -> `commands/new-project.md`
   - import existing materials -> `commands/map-base.md`
   - plan a new arc -> `commands/plan-arc.md`
   - batch-outline chapters -> `commands/plan-batch.md`
   - write or continue a chapter -> `commands/write-chapter.md`
   - quick draft -> `commands/quick-draft.md`
   - research or fact-check -> `commands/research.md`
   - polish prose -> `commands/polish.md` or `commands/quick-polish.md`
   - review or verify consistency -> `commands/review.md` or `commands/verify.md`
   - inspect progress -> `commands/progress.md`
   - auto-route or decide next step -> `commands/do.md` or `commands/next.md`
   - dashboard-style coordination -> `commands/manager.md`
3. If the task requires an existing structured project and none exists:
   - choose `map-base` when source notes or drafts already exist
   - otherwise choose `new-project`

## Reliability Rules

- Treat the explicit public `$novel-*` skills as the stable Codex surface.
- If a workflow declares named `SpawnAgent(...)` stages, those delegated stages are mandatory.
- Do not silently inline delegated work that the workflow marks for named agents.
- If named-agent execution is unavailable or drifted, validate the install before continuing:
  - `novel-tool validate --codex --global`
  - `node bin/install.js validate --codex --global`
