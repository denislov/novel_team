# Novel Codex Conventions

This plugin was originally authored as a Claude Code plugin. In Codex, keep the same workflow intent and artifact contract, but translate the old workflow DSL into normal Codex behavior.

## Path Rules

- Treat `commands/`, `workflows/`, `skills/`, `templates/`, and `agents/` as paths relative to the plugin root.
- When a command says `@workflows/foo.md`, read that file plus any directly referenced skill or template files before executing.
- Treat the working directory root as the novel project root.
- Core files live directly in the current directory: `PROJECT.md`, `CHARACTERS.md`, `TIMELINE.md`, `ROADMAP.md`, `STATE.md`.
- Structured content lives under `chapters/`, `characters/`, `research/`, and `reviews/`.

## Workflow Translation

- `AskUserQuestion(...)`
  Ask a concise plain-text question only when you are actually blocked. Otherwise make a reasonable default choice, state the assumption briefly, and continue.
- `SpawnAgent(...)`
  Execute inline by default. Only use sub-agents if the user explicitly asks for delegation or parallel agent work. When delegation is allowed, use the matching file under `agents/` as the role reference.
- `SlashCommand`
  Treat it as routing to the corresponding file under `commands/`.
- `Task`
  Treat it as normal work decomposition, not a special tool requirement.

## Artifact Contract

- Preserve the root-level project layout and file names used by the existing workflows.
- Prefer updating structured project memory files over leaving important state only in chat.
- If a workflow says to produce or update a template-backed file, align with the matching file in `templates/`.

## Scope

- Commands are the compatibility layer for users who already know `/novel:*`.
- Skills are the natural-language entrypoints for users working in Codex without explicit slash commands.
