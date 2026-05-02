# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

`ans-tool` is an installer that distributes a structured fiction-writing workflow into the config directories of eight different AI agent runtimes (Claude Code, OpenCode, Gemini CLI, Codex, GitHub Copilot, Antigravity, Cursor, Windsurf). The repo itself contains no published novel — it ships commands, named subagents, workflow markdown, and a per-project Node CLI that the runtimes invoke after install.

There is no `src/` or build step for the published bundle. Markdown is the source-of-truth artifact; runtime behavior is defined by what the installer copies and how `ans-tools.cjs` routes calls.

## Common commands

```bash
# Run the runtime-contract test suite (fast, ~80ms, 38 contract + 9 algorithm tests).
npm test

# Run a single test by name (Node test runner pattern).
node --test --test-name-pattern="every command has a same-name workflow" tests/runtime-contract.test.cjs

# Install/repair/validate during development (use --local to install into the
# current directory's .claude/ etc. without touching ~/.).
node bin/install.js --claude --local
node bin/install.js --codex --global --validate
node bin/install.js --all --global --repair

# Drive the runtime CLI directly against a novel project (cd into a project that
# has PROJECT.md first, or pass --root).
node ai-novel-studio/bin/ans-tools.cjs init write-chapter
node ai-novel-studio/bin/ans-tools.cjs state load
node ai-novel-studio/bin/ans-tools.cjs chapter normalize 1 --source formal --dry-run
node ai-novel-studio/bin/ans-tools.cjs --help
```

There is no lint/format/build script. `package.json` declares only `test`. Node ≥20 is required.

## The two-root layout

The repository deliberately mirrors itself:

- **Outer root** (`./`) — public, install-time surface:
  - `commands/ans/*.md` — thin command entrypoints
  - `agents/ans-*.md` — 8 named subagent definitions
  - `bin/install.js` — multi-runtime installer (~4600 lines, the heavyweight)
  - `tests/runtime-contract.test.cjs` — contract tests
  - `docs/`, `README.md`, `package.json`
- **Inner support bundle** (`ai-novel-studio/`) — copied verbatim into `<runtime-config>/ai-novel-studio/` at install time:
  - `workflows/*.md` — actual workflow logic referenced by commands
  - `bin/ans-tools.cjs`, `bin/map_base.cjs` — runtime CLI entrypoints invoked by workflows
  - `bin/lib/*.cjs` — shared library (state, chapter, init, config, verify, core, schemas)
  - `bin/map_base/*.cjs` — modules for the "scan existing materials and synthesize project layout" feature
  - `references/`, `templates/` — prose support files agents read

When commands reference `@~/.claude/ai-novel-studio/...`, that path resolves to the support bundle on the user's machine after install. The installer rewrites that prefix to match each runtime (`~/.codex/ai-novel-studio/...`, `~/.config/opencode/ai-novel-studio/...`, etc.) — see `replaceClaudePathReferences` in `bin/install.js`.

For Codex specifically, `bin/install.js`'s `getCodexSkillAdapterHeader()` injects a `<codex_skill_adapter>` block at the head of every installed skill that translates `Task() → spawn_agent`, `AskUserQuestion → request_user_input`, and pins project-root + fail-closed conventions (sections A through D). There is no source-tree `_codex-conventions.md` file — the conventions live in install.js as runtime-specific adapter content.

## The thin-command / fat-workflow contract

This is the most load-bearing convention in the repo, and tests enforce it:

1. Each `commands/ans/<name>.md` is purely a routing shim. Its `<execution_context>` block must contain *exactly one* `@~/.claude/ai-novel-studio/workflows/<same-name>.md` line. The single exception is `do.md`, which also pulls in `references/command-center.md`.
2. All orchestration, file I/O, and agent dispatch lives in `ai-novel-studio/workflows/<name>.md`. Commands must not contain logic.
3. Every command file requires a matching workflow file with the same basename. There is a 1:1 mapping.
4. Workflows are markdown that mixes prose with `bash` blocks and `Task(subagent_type: "ans-x", ...)` invocations. On Claude Code these primitives execute natively; on Codex they are translated by the `<codex_skill_adapter>` block injected by `bin/install.js` at install time.

If you change `commands/ans/foo.md`, you almost always need to change `ai-novel-studio/workflows/foo.md` too — and vice versa. The `runtime-contract.test.cjs` tests will fail loudly if these drift apart.

## Named subagents are part of the runtime contract

The 8 agents in `agents/` are not interchangeable suggestions:

| agent | role |
|---|---|
| `ans-architect` | world/main-line setup — drives `new-project`, `plan-arc` |
| `ans-planner` | chapter-level outlines |
| `ans-plan-checker` | outline consistency review |
| `ans-writer` | chapter prose generation |
| `ans-editor` | line-level polish |
| `ans-verifier` | post-chapter audit + structured verdict |
| `ans-consistency-checker` | cross-chapter consistency |
| `ans-researcher` | background research |

Workflows declare `<codex_execution_policy>` with `delegation: required_named_agents` and `allow_inline_fallback: false`. The intent is fail-closed: if a runtime can't dispatch the named agent, it should stop and tell the user to run `ans-tool --codex --global --validate`, not silently inline the work.

When adding a workflow stage, prefer routing to an existing `ans-*` agent over inlining cognition. When adding a new agent, it must be referenced by at least one workflow (test #9 enforces this).

## Two CLI tiers

Don't confuse them:

- **`bin/install.js`** — runs *once* on the user's machine to copy files into the right config directory and rewrite path references. It knows about all eight runtimes, their config layouts, attribution settings, copilot tool-name remapping, etc. Almost never invoked at workflow runtime.
- **`ai-novel-studio/bin/ans-tools.cjs`** — runs *every* workflow step on a specific novel project. Exposes `state | chapter | init | check | verify | validate | config` subcommands. Workflows shell out to `node bin/ans-tools.cjs init <workflow-name>` to get a JSON payload, then drive the rest of the workflow from that.

The set of `ans-tools` subcommand pairs is whitelisted in `tests/runtime-contract.test.cjs` (the `allowed` Set). Adding a new subcommand requires updating both the router in `ans-tools.cjs` and that allowlist.

## Project layout on the user's machine (the workspace, not this repo)

After install, end users run commands from a directory that contains:

- Root files: `PROJECT.md` (project contract with YAML frontmatter), `CHARACTERS.md`, `TIMELINE.md`, `ROADMAP.md`, `STATE.md`, optional `config.json`
- Subdirectories: `chapters/`, `chapters/outlines/`, `chapters/draft/`, `characters/`, `research/`, `reviews/`

`findProjectRoot` in `ai-novel-studio/bin/lib/core.cjs` walks up looking for `PROJECT.md`. Per-project config defaults live in `ai-novel-studio/bin/lib/config.cjs` (`DEFAULTS`); test #10 enforces that any `config.workflow.<key>` referenced in workflows actually exists in that defaults table.

Three story formats are first-class: `long_form`, `short_story`, `story_collection`. Workflows branch on `story_format` / `planning_unit` / `target_length_band` rather than assuming long-form chapters.

## Verifier ↔ workflow handshake (3 signals)

`ans-verifier` writes a review file containing a `## Structured Verdict` block carrying a JSON payload. The `write-chapter` and `review` workflows run `node bin/ans-tools.cjs verify extract --report reviews/review-N.md` to parse it, then route three independent signals:

| JSON flag | Workflow consumer | Effect |
|-----------|-------------------|--------|
| `gap_type: structure` | `write-chapter` gap-closure | Re-call `ans-planner` (replan) → re-call `ans-writer` (rewrite) |
| `gap_type: content` / `consistency_drift` | `write-chapter` gap-closure | Re-call `ans-writer` against current outline |
| `needs_character_update: true` | `write-chapter` §6.5 + `review` §4.5 | Spawn `ans-architect` in single-card-update mode against the review's `## 人物状态变化` table |
| `needs_state_update: true` + `summary` | `write-chapter` §7.2 + `review` §4.5 | Use the verdict's `summary` as `state refresh --latest-completed` instead of generic "已完成第N章" template |

Both sides of every handshake are pinned by contract tests — see `tests/runtime-contract.test.cjs` for the assertions. Don't add a new flag to verifier's JSON without simultaneously adding the workflow consumer + a contract test.

## Chapter file shape & `chapter normalize`

Chapter files (`chapters/chapter-N.md`) must contain only:

- YAML frontmatter conforming to `bin/lib/schemas.cjs:CHAPTER_FRONTMATTER` — required + optional fields only; forbidden fields (`characters`, `timeline`, `hooks`, `foreshadowing`) are stripped on normalize
- `# 第N章 [标题]` H1
- Optional `> ...` notes (story_date, 承接章节)
- `## 正文\n[prose]`
- Optional `## 章末钩子\n[hook]`

Anything else (`## 章节元数据`, `## 创作备注`, `## 自检清单`, `---` divider before metadata) is metadata leakage from older writer prompts and gets stripped by `node bin/ans-tools.cjs chapter normalize <N>`. The `write-chapter` / `polish` / `quick-draft` workflows all run normalize at the end of their pipelines as a safety net (idempotent — already-clean files report `no_op: true`).

When you change the writer/editor/verifier `<output_format>` block, the contract test `ans-writer <output_format> does not embed metadata trailer in chapter file` will catch any backsliding into trailing-metadata habits.

## Brainstorm-first workflows

Four creative workflows — `new-project`, `plan-arc`, `plan-batch`, `character --add` — share the same minimal-input → brainstorm → review → commit shape. The pattern is:

```
§ Input          —  workflow asks ONE or two questions (idea + format, or seed + role)
§ Brainstorm     —  agent runs in mode:"brainstorm" (+ scope: project|arc|character)
                    and returns a complete proposal as a structured Markdown header
                    (## BRAINSTORM COMPLETE / ## ARC BRAINSTORM COMPLETE /
                     ## BATCH BRAINSTORM COMPLETE / ## CHARACTER BRAINSTORM COMPLETE).
                    Agent writes NO files in this phase.
§ Review/Iterate —  workflow displays the proposal; user picks
                    [确认通过 / 需要调整 / 完全推倒重来 / 取消].
                    On 调整, user's feedback + previous proposal are threaded back into
                    the next brainstorm round via <previous_proposal> + <adjustment_notes>.
                    Capped at MAX_ITERATIONS=10.
§ Commit         —  same agent runs in mode:"commit" with <approved_proposal>;
                    writes files strictly mirroring the approved proposal.
                    Internal contradictions go in a "⚠️ 落地警告" segment, NOT silently fixed.
```

| Workflow | Agent | Scope | Brainstorm header | Files written on commit |
|----------|-------|-------|-------------------|-------------------------|
| new-project | ans-architect | project | `## BRAINSTORM COMPLETE` | PROJECT/CHARACTERS/TIMELINE/ROADMAP/`characters/<主角>.md` |
| plan-arc | ans-architect | arc | `## ARC BRAINSTORM COMPLETE` | ROADMAP/TIMELINE/CHARACTERS (PROJECT only on world expansion) |
| plan-batch | ans-planner | (none) | `## BATCH BRAINSTORM COMPLETE` | per-chapter outline files |
| character --add | ans-architect | character | `## CHARACTER BRAINSTORM COMPLETE` | `characters/<name>.md` + CHARACTERS roster row |

The contract is enforced by ~10 contract tests (search runtime-contract.test.cjs for "brainstorm" / "scope:"). Adding a new brainstorm-first workflow requires: (1) the workflow markdown follows the four-phase template, (2) the agent prompt declares both modes + the structured-return schema + an explicit "no file writes in brainstorm mode" line, (3) contract tests pin both sides.

`mode:` and `scope:` are sibling fields on `Task(...)` — they're not Codex-specific syntax. Workflows pass them as part of the Task input; both Claude Code and the install.js-injected `<codex_skill_adapter>` Section C ("Task() → spawn_agent") preserve them.

## Argument placeholder convention

Every command in `commands/ans/*.md` has its `<context>` block start with `ARGUMENTS: $ARGUMENTS` (canonical placeholder, not `$ARGUMENT` singular). The runtime substitution pipeline:

- Claude Code: substitutes `$ARGUMENTS` natively
- Codex: `bin/install.js:1013` rewrites `$ARGUMENTS` → `{{ANS_ARGS}}` at install time
- OpenCode / Gemini / Copilot / etc.: their per-runtime conversion functions handle equivalents

Without this line, workflow `bash` blocks like `for arg in "$ARGUMENTS"; do ...` get an empty string on some runtimes. The contract test `every command <context> block exposes ARGUMENTS: $ARGUMENTS` keeps this in sync.

## When you change something, run the tests

`npm test` is the canonical guard. The 38 contract tests (`tests/runtime-contract.test.cjs`) cover: command/workflow pairing, `execution_context` shape, agent reference validity, `ans-tools` allowlist + path form, support-bundle file presence, verifier handshake, config key registry, parser-hostile placeholder detection, frontmatter alignment between agent output_format blocks and `bin/lib/schemas.cjs`, brainstorm/commit mode contracts for all four brainstorm-first workflows, and the routing of `needs_character_update` / `needs_state_update` from verifier into architect / state refresh.

The 9 algorithm tests (`tests/chapter-normalize.test.cjs`) cover the `chapter normalize` core: legacy-body stripping, hook preservation, forbidden-field removal, idempotence, default-filling, dry-run, backup, canonical field order.

Both suites run in under a second; there is no excuse to skip them when touching `commands/`, `workflows/`, `agents/`, `ans-tools.cjs`, or `bin/lib/`.

Empty directories `hooks/` and `scripts/` exist in the tree; the README references `scripts/build-hooks.js` and `hooks/dist/` but those aren't present yet — treat them as planned, not extant.
