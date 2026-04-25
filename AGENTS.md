# AGENTS.md — AI Novel Studio

## Project identity
- npm package: `ans-tool` (CLI installer), version from `package.json`
- This is a **CLI installer** that generates skill/agent/command definitions for 8+ AI coding assistants
- The structured fiction workflow itself is called "AI Novel Studio" (`ans-*` namespace)
- No TypeScript — everything is plain Node.js CommonJS (`.cjs` for support libs, `.js` for top-level scripts)

## Commands

```bash
npm test                              # runs build:hooks first, then node --test tests/*.test.cjs
npm run build:hooks                   # copies hooks/*.js → hooks/dist/ (validates JS syntax first)
node bin/install.js --all --global    # install to all runtimes globally
node bin/install.js --claude --global # install for a single runtime
```

- `npm test` is the only test command; uses Node.js built-in test runner (`node:test` + `node:assert/strict`), **not** Jest/Mocha/Vitest
- See `bin/install.js` for full flag list (`--validate`, `--repair`, `--uninstall`, `--local`, `--config-dir`, etc.)

## Architecture: thin commands, fat workflows

```
commands/ans/*.md          ← thin public surface (frontmatter + <execution_context> delegating to workflow)
ai-novel-studio/workflows/ ← real execution logic (one .md per command)
agents/ans-*.md            ← named specialist subagents (writer, editor, verifier, planner, etc.)
ai-novel-studio/bin/       ← runtime support binaries (ans-tools.cjs, map_base.cjs, lib/*.cjs)
ai-novel-studio/references/← shared reference docs (writing-guide.md, common-pitfalls.md, etc.)
ai-novel-studio/templates/ ← project file templates (PROJECT.md, CHARACTERS.md, etc.)
bin/install.js             ← monolithic 2000+ line installer (handles 8 runtimes)
```

- Every command in `commands/ans/<name>.md` **must** have a matching `ai-novel-studio/workflows/<name>.md`
- Command `execution_context` blocks should be thin: only `ai-novel-studio/commands/ans/_codex-conventions.md` + the matching workflow
- If a workflow declares a named delegated stage (via `Task`/`SpawnAgent`), it must use the matching `ans-*` agent — never inline the work
- The source repo does **not** keep a checked-in `skills/` tree; skills are generated from `commands/ans/*.md` during install

## Runtime targets

The installer supports 8 AI coding environments:
Claude Code, OpenCode, Gemini, Codex, Copilot, Cursor, Windsurf, Antigravity

Each has different path conventions, config formats, and tool mappings. The installer converts between them. When modifying installer logic, all runtime converters live in `bin/install.js`.

## Key constraints (enforced by tests)

- Command → workflow mapping is 1:1
- All agent references in workflows must resolve to a shipped `agents/ans-*.md` file
- Never use `novel-*` prefixed agent names — only `ans-*`
- `ai-novel-studio/bin/` top-level must only contain `ans-tools.cjs` and `map_base.cjs`
- Support bundle relative refs (`@workflows/...`, `@commands/...`) are rewritten to absolute `@~/.<runtime>/ai-novel-studio/...` paths during install
- The `verify extract` contract must be declared on both sides of the workflow boundary (workflow and verifier agent)
