# Novel Codex Conventions

This plugin was originally authored as a Claude Code plugin. In Codex, keep the same workflow intent and artifact contract, but translate the old workflow DSL into normal Codex behavior.

## Path Rules

- Treat `commands/`, `workflows/`, `references/`, `templates/`, `scripts/`, and `agents/` as paths relative to the Novel source root.
- When a command says `@workflows/foo.md`, read that file plus any directly referenced reference or template files before executing.
- Treat the working directory root as the novel project root.
- Core files live directly in the current directory: `PROJECT.md`, `CHARACTERS.md`, `TIMELINE.md`, `ROADMAP.md`, `STATE.md`.
- Structured content lives under `chapters/`, `characters/`, `research/`, and `reviews/`.

## Workflow Translation

- `AskUserQuestion(...)`
  Ask a concise plain-text question only when you are actually blocked. Otherwise make a reasonable default choice, state the assumption briefly, and continue.
- `SpawnAgent(...)`
  Use Codex named agents by default.
  Map `SpawnAgent(agent: ans-x, input: Y, output: Z)` to `spawn_agent(agent_type="ans-x", message=...)`.
  Treat `input` as the agent brief and required context.
  Treat `output` as the file path the sub-agent should write directly if the workflow specifies one.
  Use `fork_context: false` by default because the agent instructions already tell the sub-agent what project files to load.
  Wait for the agent result, then continue the parent workflow.
  If a public workflow declares named `SpawnAgent(...)` stages, those delegated stages are mandatory.
  Do not inline delegated stages.
  If required named agents are unavailable, the install looks incomplete, or execution drifts away from the declared agent contract, stop and tell the user to validate the Codex install before continuing:
  - Installed CLI path: `ans-tool validate --codex --global`
  - Source checkout path: `node bin/install.js validate --codex --global`
  Only inline work that the workflow itself does not declare as a delegated stage.
- `SlashCommand`
  Treat it as routing to the corresponding file under `commands/`.
- `Task`
  Treat it as normal work decomposition, not a special tool requirement.

## Artifact Contract

- Preserve the root-level project layout and file names used by the existing workflows.
- Prefer updating structured project memory files over leaving important state only in chat.
- If a workflow says to produce or update a template-backed file, align with the matching file in `templates/`.

## Scope

- Commands are the compatibility layer for users who already know `/ans:*`.
- Skills are the natural-language entrypoints for users working in Codex without explicit slash commands.
