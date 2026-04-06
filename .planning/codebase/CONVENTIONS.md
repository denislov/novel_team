# Coding Conventions

**Analysis Date:** 2026-04-07

## Naming Patterns

**Files:**
- Use `kebab-case` for JavaScript entrypoints, Markdown command/workflow assets, and agent names. Examples: `bin/install.js`, `plugins/novel/commands/new-project.md`, `plugins/novel/workflows/write-chapter.md`, `plugins/novel/agents/novel-writer.md`.
- Use `snake_case` for Python modules and Python tests. Examples: `plugins/novel/scripts/novel_state.py`, `plugins/novel/scripts/map_base.py`, `plugins/novel/scripts/test_novel_state.py`.
- Use `*.test.cjs` for root Node tests in `tests/`. Examples: `tests/install.test.cjs`, `tests/agent-definition.test.cjs`.
- Use uppercase template filenames for user-facing novel artifacts. Examples: `plugins/novel/templates/PROJECT.md`, `plugins/novel/templates/STATE.md`.

**Functions:**
- Use `camelCase` in CommonJS modules. Examples in `bin/install.js`: `promptPathFor`, `listSourceCommands`, `rewriteRuntimeContent`, `installRuntime`.
- Use `snake_case` in Python scripts. Examples in `plugins/novel/scripts/novel_state.py`: `parse_args`, `compute_stats`, `resolve_write_target`, `refresh_state`.
- Use verb-first helper names for side-effecting operations. Examples: `installSupportBundle` in `bin/install.js`, `refresh_state` in `plugins/novel/scripts/novel_state.py`, `promote` in `plugins/novel/scripts/chapter_ops.py`.

**Variables:**
- Use `UPPER_SNAKE_CASE` for module-level constants. Examples: `NOVEL_CODEX_MARKER`, `RESOURCE_DIRS`, `SUPPORTED_RUNTIMES` in `bin/install.js`; `CORE_FILES`, `IGNORED_DIRS`, `OUTLINE_KEYWORDS` in `plugins/novel/scripts/*.py`.
- Use short, local nouns for transient values inside loops and transformations. Examples: `srcPath`, `destPath`, `skillName`, `agentName` in `bin/install.js`; `root`, `stats`, `rows`, `text` in the Python scripts.

**Types:**
- Use PascalCase for Python dataclasses and test case classes. Examples: `Candidate`, `PlannedAction` in `plugins/novel/scripts/map_base.py`; `NovelStateTests`, `MapBaseTests`, `ChapterOpsTests` in the Python test files.
- Inline Python typing is preferred over separate aliases for simple containers. Examples: `dict[str, object]`, `list[Path]`, `str | None` in `plugins/novel/scripts/novel_state.py` and `plugins/novel/scripts/chapter_ops.py`.

## Code Style

**Formatting:**
- No formatter config is detected at the repo root. No `.prettierrc*`, `eslint.config.*`, `pyproject.toml`, `ruff.toml`, or `pytest.ini` is present.
- Match the existing style manually:
  - JavaScript in `bin/install.js` uses semicolons, single quotes, `const`, and two-space indentation.
  - Python in `plugins/novel/scripts/*.py` uses four-space indentation, type annotations, and double-quoted strings.
  - Markdown assets under `plugins/novel/commands/`, `plugins/novel/workflows/`, and `plugins/novel/agents/` use YAML frontmatter or XML-like section tags such as `<execution_context>`, `<process>`, and `<available_agent_types>`.

**Linting:**
- No lint tool is configured in `package.json` and no standalone lint config is present.
- Quality is enforced through tests and structural helpers rather than lint rules:
  - `tests/agent-definition.test.cjs` checks required agent frontmatter and disallows `skills:` in agent markdown.
  - `tests/install.test.cjs` verifies generated runtime assets, reference rewriting, and config cleanup behavior.

## Import Organization

**Order:**
1. Standard-library or Node built-in imports first.
2. Local project imports second.
3. No wildcard imports and no path aliases.

**Observed patterns:**
- `bin/install.js` starts with built-ins `fs`, `os`, `path`, then imports local `../package.json`.
- `tests/install.test.cjs` starts with `node:*` built-ins, then destructures exports from `../bin/install.js`.
- `plugins/novel/scripts/novel_state.py` and `plugins/novel/scripts/chapter_ops.py` import stdlib modules first and `Path` last with no local package imports.

**Path Aliases:**
- Not detected. Use relative filesystem paths in JavaScript and direct `Path(__file__).with_name(...)` resolution in Python.

## Error Handling

**Patterns:**
- Prefer guard clauses and explicit failures over deep nesting.
- Raise or throw with concrete, user-readable messages.
- Convert CLI failures into exit code `1` and print diagnostics to stderr.

**JavaScript pattern:**
- `bin/install.js` validates generated installs after writing. `installRuntime()` throws if validation fails, and `runCli()` catches errors and sets `process.exitCode = 1`.
- Unknown CLI flags are rejected early in `parseArgs()` with `throw new Error(...)`.

**Python pattern:**
- `plugins/novel/scripts/novel_state.py` raises `FileNotFoundError` and `ValueError` from pure helpers, then handles them in `main()`.
- `plugins/novel/scripts/chapter_ops.py` uses `ensure_exists()` and explicit runtime checks before promotion, then catches `(FileNotFoundError, RuntimeError)` in `main()`.

**Use this pattern for new code:**
```python
try:
    result = promote(root, args.chapter, "draft", args.force, args.dry_run)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0
except (FileNotFoundError, RuntimeError) as exc:
    print(str(exc), file=sys.stderr)
    return 1
```
From `plugins/novel/scripts/chapter_ops.py`.

## Logging

**Framework:** console / stdout-stderr printing

**Patterns:**
- JavaScript CLI output is human-oriented and colorized in `bin/install.js` with ANSI constants such as `cyan`, `green`, and `red`.
- Python scripts emit either structured JSON or simple `key=value` lines. See `plugins/novel/scripts/novel_state.py` and `plugins/novel/scripts/chapter_ops.py`.
- Do not add a separate logging dependency unless there is an explicit need. Current code keeps CLI feedback minimal and deterministic for tests.

## Comments

**When to Comment:**
- Code comments are sparse in executable code. Prefer small, well-named helpers instead of inline commentary.
- Explanatory prose lives mainly in Markdown assets, not in JavaScript or Python source.

**Observed usage:**
- `plugins/novel/workflows/new-project.md` contains operational comments inside fenced shell examples to guide the workflow.
- `bin/install.js` and the Python scripts rely on function names and data structure names rather than internal comments.

**JSDoc/TSDoc:**
- Not used.

## Function Design

**Size:**
- Keep helpers focused and composable.
- `bin/install.js` is a large orchestrator module, but it is still broken into small pure helpers like `extractFrontmatterField`, `rewriteSupportReferences`, and `generateCodexAgentToml`.
- Python scripts follow a similar split: parsing helpers, filesystem helpers, pure inference helpers, then `main()`.

**Parameters:**
- Prefer explicit scalar arguments over opaque option bags in Python.
- Prefer option objects for public JavaScript orchestration functions. Example: `installRuntime({ runtime, isGlobal, explicitConfigDir, cwd })` in `bin/install.js`.

**Return Values:**
- Use plain objects and dictionaries for CLI results instead of custom classes.
- Use JSON-safe shapes because many call sites print the result directly with `json.dumps(...)` or inspect fields in tests.

**Representative patterns:**
```javascript
function installRuntime(options) {
  const { runtime, isGlobal = true, explicitConfigDir = null, cwd = process.cwd() } = options;
  const targetDir = getTargetDir(runtime, isGlobal, explicitConfigDir, cwd);
  // ...
  return validation;
}
```
From `bin/install.js`.

```python
def inspect_chapter(root: Path, chapter: int) -> dict[str, object]:
    paths = artifact_paths(root, chapter)
    return {
        "chapter": chapter,
        "formal_exists": paths["formal"].exists(),
        "paths": {key: str(value) for key, value in paths.items()},
    }
```
Pattern from `plugins/novel/scripts/chapter_ops.py`.

## Module Design

**Exports:**
- `bin/install.js` exports reusable helpers through `module.exports` and keeps CLI execution behind `if (require.main === module)`.
- Python scripts are standalone CLIs. Keep reusable logic above `main()` and preserve the `if __name__ == "__main__": raise SystemExit(main())` guard.

**Barrel Files:**
- Not used.

**Mixed asset conventions:**
- Agent markdown under `plugins/novel/agents/` must keep Claude frontmatter fields `name`, `description`, `tools`, and `color`. `tests/agent-definition.test.cjs` enforces that contract.
- Workflow markdown under `plugins/novel/workflows/` uses XML-like sections and must keep `<available_agent_types>` synchronized with any `SpawnAgent` usage. `tests/agent-definition.test.cjs` enforces that contract.
- Skill markdown under `plugins/novel/skills/*/SKILL.md` wraps command execution via `<execution_context>` and `<process>` blocks. Use the same structure as `plugins/novel/skills/novel-new-project/SKILL.md`.

## Practical Examples

**CommonJS helper module pattern:**
```javascript
const fs = require('fs');
const os = require('os');
const path = require('path');

const pkg = require('../package.json');
```
From `bin/install.js`.

**Python CLI parser pattern:**
```python
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(...)
    sub = parser.add_subparsers(dest="command", required=True)
```
From `plugins/novel/scripts/novel_state.py` and `plugins/novel/scripts/chapter_ops.py`.

**Agent frontmatter contract:**
```markdown
---
name: novel-writer
description: ...
tools: Read, Write
color: green
---
```
From `plugins/novel/agents/novel-writer.md`.

**Workflow section contract:**
```markdown
<required_reading>
Read all files referenced by the invoking prompt's execution_context before starting.
</required_reading>
```
From `plugins/novel/workflows/new-project.md`.

---

*Convention analysis: 2026-04-07*
