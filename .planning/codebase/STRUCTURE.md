# Codebase Structure

**Analysis Date:** 2026-04-07

## Directory Layout

```text
novel_team/
├── .agents/                     # Legacy local Codex marketplace metadata
│   └── plugins/
├── .claude-plugin/              # Legacy local Claude marketplace metadata
├── .planning/                   # Generated planning artifacts
│   └── codebase/
├── bin/                         # Executable CLI entrypoints
├── plugins/                     # Source bundle that gets materialized into runtimes
│   └── novel/
│       ├── .claude-plugin/      # Source Claude plugin metadata
│       ├── .codex-plugin/       # Source Codex plugin metadata
│       ├── agents/              # Named agent prompts
│       ├── commands/            # Command wrappers / entry assets
│       ├── scripts/             # Python helper CLIs and their tests
│       ├── skills/              # Codex skill wrappers and support skills
│       ├── templates/           # Template-backed project artifacts
│       └── workflows/           # Multi-step workflow definitions
├── tests/                       # Node install and prompt-contract tests
├── package.json                 # Package metadata, bin entry, npm test
└── README.md                    # Top-level install and usage guide
```

## Directory Purposes

**bin/**
- Purpose: executable entrypoints
- Contains: `install.js`
- Key files: `bin/install.js` - install/update/uninstall/validate/help orchestration
- Subdirectories: none

**plugins/novel/**
- Purpose: editable source-of-truth bundle for the Novel tool
- Contains: command markdown, workflow markdown, skill wrappers, agent prompts, templates, helper scripts, plugin manifests
- Key files: `plugins/novel/README.md`, `plugins/novel/.claude-plugin/plugin.json`, `plugins/novel/.codex-plugin/plugin.json`
- Subdirectories:
  - `agents/` - 6 named agent prompts
  - `commands/` - 19 command wrapper markdown files
  - `scripts/` - 3 Python helper CLIs plus 3 co-located Python test modules
  - `skills/` - 20 Codex skill directories
  - `templates/` - 10 template Markdown files
  - `workflows/` - 16 workflow definitions

**tests/**
- Purpose: root Node test surface
- Contains: `*.test.cjs`
- Key files:
  - `tests/install.test.cjs` - installer, conversion, and validation behavior
  - `tests/agent-definition.test.cjs` - agent/workflow metadata contracts
- Subdirectories: none

**.agents/plugins/**
- Purpose: legacy Codex-local marketplace registration for `plugins/novel`
- Contains: `marketplace.json`
- Key files: `.agents/plugins/marketplace.json`
- Subdirectories: none

**.claude-plugin/**
- Purpose: legacy Claude-local marketplace registration for `plugins/novel`
- Contains: `marketplace.json`
- Key files: `.claude-plugin/marketplace.json`
- Subdirectories: none

**.planning/codebase/**
- Purpose: generated codebase reference docs for future GSD planning
- Contains: `STACK.md`, `INTEGRATIONS.md`, `ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`, `CONCERNS.md`
- Key files: all seven map documents
- Subdirectories: none currently

## Key File Locations

**Entry Points:**
- `bin/install.js` - only executable Node CLI in the repo
- `plugins/novel/commands/*.md` - authored command entry assets
- `plugins/novel/skills/*/SKILL.md` - Codex skill entry assets
- `plugins/novel/scripts/novel_state.py` - state/statistics helper CLI
- `plugins/novel/scripts/map_base.py` - import/normalization helper CLI
- `plugins/novel/scripts/chapter_ops.py` - chapter artifact promotion helper CLI

**Configuration:**
- `package.json` - package metadata, Node engine requirement, `bin` mapping, npm test command
- `.gitignore` - ignored local/system files
- `.agents/plugins/marketplace.json` - legacy Codex marketplace descriptor
- `.claude-plugin/marketplace.json` - legacy Claude marketplace descriptor
- `plugins/novel/.claude-plugin/plugin.json` - source Claude plugin metadata
- `plugins/novel/.codex-plugin/plugin.json` - source Codex plugin metadata

**Core Logic:**
- `bin/install.js` - path rewriting, bundle copy, config merge, runtime validation
- `plugins/novel/scripts/*.py` - state, import, and chapter mutation logic
- `plugins/novel/commands/_codex-conventions.md` - runtime-translation rules for Claude-style workflow DSL

**Testing:**
- `tests/` - Node tests
- `plugins/novel/scripts/test_map_base.py` - importer behavior tests
- `plugins/novel/scripts/test_novel_state.py` - state/statistics tests
- `plugins/novel/scripts/test_chapter_ops.py` - chapter artifact tests

**Documentation:**
- `README.md` - repo-level install/use overview
- `plugins/novel/README.md` - source-bundle architecture and runtime split
- `.planning/codebase/*.md` - generated internal reference docs

## Naming Conventions

**Files:**
- `kebab-case.md` for commands, workflows, and most Markdown assets: `plugins/novel/workflows/write-chapter.md`
- `snake_case.py` for Python modules and `test_*.py` for Python tests: `plugins/novel/scripts/novel_state.py`
- `*.test.cjs` for Node tests: `tests/install.test.cjs`
- `novel-*.md` or `novel-*` for agent and skill names: `plugins/novel/agents/novel-writer.md`, `plugins/novel/skills/novel-write-chapter/`
- uppercase template filenames for generated novel project artifacts: `plugins/novel/templates/STATE.md`

**Directories:**
- plural nouns for collections: `agents/`, `commands/`, `workflows/`, `templates/`, `tests/`
- feature-specific directory names under `plugins/novel/skills/`: `novel-new-project/`, `novel-command-center/`

**Special Patterns:**
- `SKILL.md` is the canonical skill entry filename inside each skill directory
- plugin metadata lives in hidden subdirectories like `.claude-plugin/` and `.codex-plugin/`
- runtime compatibility wrappers rely on XML-like section tags such as `<execution_context>` and `<process>`

## Where to Add New Code

**New installer/runtime logic:**
- Primary code: `bin/install.js`
- Tests: `tests/install.test.cjs`
- Docs: `README.md` and `plugins/novel/README.md` if the install contract changes

**New command/workflow:**
- Command wrapper: `plugins/novel/commands/{name}.md`
- Workflow body: `plugins/novel/workflows/{name}.md`
- Codex skill wrapper: `plugins/novel/skills/novel-{name}/SKILL.md`
- Tests: update `tests/agent-definition.test.cjs` if new agent references are introduced

**New Python helper:**
- Implementation: `plugins/novel/scripts/{name}.py`
- Tests: `plugins/novel/scripts/test_{name}.py`
- Workflow call sites: relevant files under `plugins/novel/workflows/` and `plugins/novel/commands/`

**New agent prompt:**
- Implementation: `plugins/novel/agents/novel-{role}.md`
- Registration impact: `bin/install.js` will pick it up via `listSourceAgents()`
- Tests: `tests/agent-definition.test.cjs`

**New template:**
- Implementation: `plugins/novel/templates/{NAME}.md`
- Workflow references: command/workflow/agent assets that consume that template

## Special Directories

**plugins/novel/**
- Purpose: authored source bundle, not generated output
- Source: maintained directly in this repo
- Committed: yes

**.planning/codebase/**
- Purpose: generated codebase map for GSD workflows
- Source: generated during mapping runs like this one
- Committed: optional, but designed to be durable reference material

**Installed runtime directories outside the repo:**
- Purpose: actual live Claude/Codex surfaces after `bin/install.js` runs
- Source: generated from this repo
- Committed: no; they live under user config roots such as `~/.claude/` and `~/.codex/`

---

*Structure analysis: 2026-04-07*
*Update when directory layout or artifact ownership changes*
