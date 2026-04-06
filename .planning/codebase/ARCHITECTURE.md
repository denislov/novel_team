# Architecture

**Analysis Date:** 2026-04-07

## Pattern Overview

**Overall:** Monolithic local installer plus source-bundle architecture for AI-authoring workflows

**Key Characteristics:**
- One Node CLI entrypoint in `bin/install.js`
- One source-of-truth content bundle under `plugins/novel/`
- Runtime-specific materialization for Claude Code and Codex
- File-based novel project state managed through Markdown and helper CLIs
- No service tier, no database, and no background workers

## Layers

**Installer Layer:**
- Purpose: Parse CLI input, choose target directories, copy the support bundle, generate runtime-specific surfaces, and validate the result
- Contains: `parseArgs()`, `installRuntime()`, `installSupportBundle()`, `installClaudeRuntime()`, `installCodexRuntime()`, `validateRuntime()` in `bin/install.js`
- Depends on: Node built-in filesystem/path APIs and the content bundle under `plugins/novel/`
- Used by: direct CLI execution via `node bin/install.js ...` and tests in `tests/install.test.cjs`

**Source Bundle Layer:**
- Purpose: Hold the authored command, workflow, agent, skill, and template assets that define the Novel tool behavior
- Contains: `plugins/novel/commands/`, `plugins/novel/workflows/`, `plugins/novel/agents/`, `plugins/novel/skills/`, and `plugins/novel/templates/`
- Depends on: relative prompt-path conventions and runtime adapter rewriting
- Used by: the installer during materialization and the host AI runtime after installation

**Runtime Helper Layer:**
- Purpose: Provide deterministic local logic for project-state refresh, chapter-artifact promotion, and old-material import/mapping
- Contains: `plugins/novel/scripts/novel_state.py`, `plugins/novel/scripts/chapter_ops.py`, and `plugins/novel/scripts/map_base.py`
- Depends on: the filesystem layout of a novel project and Python stdlib modules only
- Used by: installed workflows such as `plugins/novel/workflows/progress.md`, `plugins/novel/workflows/write-chapter.md`, and `plugins/novel/workflows/map-base.md`

**Contract/Test Layer:**
- Purpose: Keep install surfaces and prompt assets structurally valid across runtimes
- Contains: `tests/install.test.cjs`, `tests/agent-definition.test.cjs`, and `plugins/novel/scripts/test_*.py`
- Depends on: exported helpers from `bin/install.js` and public CLI behavior of the Python scripts
- Used by: contributors modifying installer logic or workflow assets

## Data Flow

**Install / Update Flow:**

1. User runs `node bin/install.js install ...` or `update ...`
2. `parseArgs()` resolves the command, runtime selection, and target root
3. `installSupportBundle()` copies `plugins/novel/` content into `novel/` under the chosen runtime root and rewrites internal references
4. Runtime-specific generation runs:
   - Claude: command markdown and agent markdown are written directly into the Claude config tree
   - Codex: command markdown is converted into `skills/novel-*/SKILL.md`, agent markdown is converted into `agents/*.toml`, and `config.toml` is merged
5. `validateRuntime()` rescans the generated output and fails the install if counts or config markers are missing
6. CLI output reports success or failure through stdout/stderr

**Codex Conversion Flow:**

1. A command source file such as `plugins/novel/commands/new-project.md` is read
2. `convertNovelCommandToCodexSkill()` injects a Codex adapter header and rewrites Claude-specific references
3. A Claude agent file such as `plugins/novel/agents/novel-writer.md` is read
4. `convertClaudeAgentToCodexAgent()` converts its frontmatter to Codex-compatible instructions
5. `generateCodexAgentToml()` emits per-agent TOML, and `mergeCodexConfig()` registers those agents in `config.toml`

**Novel Workflow Execution Flow:**

1. The host runtime invokes an installed command or skill
2. That wrapper reads the corresponding workflow and compatibility instructions
3. The workflow may delegate writing/planning/review work to named agents declared in `plugins/novel/agents/*.md`
4. For deterministic local actions, workflows shell out to Python helper CLIs
5. Those scripts inspect or mutate the novel project's Markdown state files and chapter/review directories

**State Management:**
- Installer state is effectively stateless between runs; source data is always reread from disk
- Novel project state is file-based:
  - root files: `PROJECT.md`, `CHARACTERS.md`, `TIMELINE.md`, `ROADMAP.md`, `STATE.md`
  - content directories: `chapters/`, `characters/`, `research/`, `reviews/`
- `plugins/novel/scripts/novel_state.py` is the intended source of truth for many counters and next-step decisions

## Key Abstractions

**Support Bundle:**
- Purpose: Stable installed copy of the `plugins/novel/` source tree
- Examples: `~/.codex/novel/` and `~/.claude/novel/`
- Pattern: copy-on-install with prompt-path rewriting

**Runtime Adapter:**
- Purpose: Translate the same authored bundle into Claude- and Codex-specific surfaces
- Examples: `installClaudeRuntime()`, `installCodexRuntime()`, `rewriteRuntimeContent()`
- Pattern: adapter/translation layer

**Prompt Asset Contract:**
- Purpose: Keep commands, workflows, skills, and agent prompts structurally compatible with runtime expectations
- Examples: `<execution_context>` blocks in command/skill markdown and required frontmatter in `plugins/novel/agents/*.md`
- Pattern: convention-driven document protocol backed by tests

**State Helper CLI:**
- Purpose: Encapsulate filesystem-derived project logic outside of the prompt text
- Examples: `compute_stats()` in `plugins/novel/scripts/novel_state.py`, `promote()` in `plugins/novel/scripts/chapter_ops.py`, classification/planning logic in `plugins/novel/scripts/map_base.py`
- Pattern: standalone CLI with JSON/text output modes

## Entry Points

**Primary CLI Entry:**
- Location: `bin/install.js`
- Triggers: `node bin/install.js install|update|uninstall|validate|help`
- Responsibilities: parse flags, generate install surfaces, and validate the result

**Workflow Entry Assets:**
- Location: `plugins/novel/commands/*.md` and `plugins/novel/skills/*/SKILL.md`
- Triggers: host AI runtime invoking a Novel command or `$novel-*` skill
- Responsibilities: route to workflow files and preserve the artifact contract

**Script Entries:**
- Location: `plugins/novel/scripts/map_base.py`, `plugins/novel/scripts/novel_state.py`, `plugins/novel/scripts/chapter_ops.py`
- Triggers: workflow shell commands
- Responsibilities: perform deterministic local analysis and mutation against the novel project tree

## Error Handling

**Strategy:** Fail fast at boundaries, then convert exceptions into CLI-friendly messages

**Patterns:**
- `bin/install.js` throws on malformed input and failed validation, then catches at `runCli()` to report the error and set `process.exitCode = 1`
- Python scripts raise `ValueError`, `FileNotFoundError`, or `RuntimeError` internally and catch them in `main()` to print a concrete message and exit with code `1`
- Validation is explicit rather than implicit:
  - install surfaces are counted and rescanned after generation
  - agent/workflow metadata is asserted by tests
  - Python scripts frequently check for missing files before mutating outputs

## Cross-Cutting Concerns

**Path Rewriting:**
- `rewriteSupportReferences()` and `rewriteRuntimeContent()` in `bin/install.js` are central to the architecture; they keep prompt references valid after install

**Runtime Compatibility:**
- The repo preserves one authored bundle but emits different runtime shapes for Claude and Codex
- Codex-specific compatibility guidance is centralized in `plugins/novel/commands/_codex-conventions.md`

**Filesystem Safety:**
- Install and uninstall operations rely on recursive directory replacement and targeted cleanup
- Blast radius is controlled mostly by path selection and validation rather than transactions

**Test-Enforced Contracts:**
- `tests/agent-definition.test.cjs` ensures spawned agents are declared and required frontmatter fields remain present
- `tests/install.test.cjs` protects the install-time transformation layer

---

*Architecture analysis: 2026-04-07*
*Update when install/runtime patterns or state-management boundaries change*
