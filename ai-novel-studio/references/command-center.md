# Novel Command Center Reference

This reference documents how Novel routes user intent to the correct command and installed `$ans-*` skill surface.

## Public Entry Points

- In Codex, use the explicit public `$ans-*` skills.
- In Claude Code, use the matching `ans-*` skill names.
- Legacy `/ans:*` command names are compatibility aliases and should be translated to the matching public skill.

## Routing Rules

1. If the user explicitly names a Novel entrypoint, honor it.
2. If the user describes the task naturally, route by intent:
   - initialize a project -> `commands/ans/new-project.md`
   - import existing materials -> `commands/ans/map-base.md`
   - plan a new arc -> `commands/ans/plan-arc.md`
   - batch-outline chapters -> `commands/ans/plan-batch.md`
   - write or continue a chapter -> `commands/ans/write-chapter.md`
   - quick draft -> `commands/ans/quick-draft.md`
   - research or fact-check -> `commands/ans/research.md`
   - polish prose -> `commands/ans/polish.md` or `commands/ans/quick-polish.md`
   - review or verify consistency -> `commands/ans/review.md` or `commands/ans/verify.md`
   - inspect progress -> `commands/ans/progress.md`
   - auto-route or decide next step -> `commands/ans/do.md` or `commands/ans/next.md`
   - dashboard-style coordination -> `commands/ans/manager.md`
3. If the task requires an existing structured project and none exists:
   - choose `map-base` when source notes or drafts already exist
   - otherwise choose `new-project`

## Reliability Rules

- Treat the explicit public `$ans-*` skills as the stable Codex surface.
- If a workflow declares named `SpawnAgent(...)` stages, those delegated stages are mandatory.
- Do not silently inline delegated work that the workflow marks for named agents.
- If named-agent execution is unavailable or drifted, validate the install before continuing:
  - `ans-tool validate --codex --global`
  - `node bin/install.js validate --codex --global`
