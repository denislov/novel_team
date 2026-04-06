# Testing Patterns

**Analysis Date:** 2026-04-07

## Test Framework

**Runner:**
- Node built-in test runner via `node --test` for root installer/runtime tests.
  - Config: `package.json`
- Python standard-library `unittest` for script-level CLI tests.
  - Config: Not applicable. No `pytest.ini`, `tox.ini`, or `pyproject.toml` is present.

**Assertion Library:**
- Node: `node:assert`
- Python: `unittest.TestCase` assertions

**Run Commands:**
```bash
npm test
python3 -m unittest discover -s plugins/novel/scripts -p 'test_*.py'
# Coverage is not configured in this repo
```

**Verified current state:**
- `npm test` passes and runs 31 tests from `tests/install.test.cjs` and `tests/agent-definition.test.cjs`.
- `python3 -m unittest discover -s plugins/novel/scripts -p 'test_*.py'` passes and runs 17 tests from the Python script test files.

## Test File Organization

**Location:**
- Root Node tests live in `tests/` and target `bin/install.js`.
- Python tests are co-located beside the scripts they exercise in `plugins/novel/scripts/`.

**Naming:**
- Node tests use `*.test.cjs`.
- Python tests use `test_*.py`.

**Structure:**
```text
tests/
  agent-definition.test.cjs
  install.test.cjs

plugins/novel/scripts/
  chapter_ops.py
  map_base.py
  novel_state.py
  test_chapter_ops.py
  test_map_base.py
  test_novel_state.py
```

## Test Structure

**Suite Organization:**
```javascript
describe('installRuntime', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('installs Codex skills, config.toml, and agent toml files', () => {
    const result = installRuntime({ runtime: 'codex', isGlobal: true, explicitConfigDir: tmpDir });
    assert.ok(result.ok);
  });
});
```
Pattern from `tests/install.test.cjs`.

```python
class NovelStateTests(unittest.TestCase):
    def run_script(self, root: Path, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *args, "--root", str(root)],
            text=True,
            capture_output=True,
            check=False,
        )

    def test_stats_prefers_formal_chapters(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            self.make_project(root)
            result = self.run_script(root, "stats", "--json")
            self.assertEqual(result.returncode, 0, result.stderr)
```
Pattern from `plugins/novel/scripts/test_novel_state.py`.

**Patterns:**
- Set up real temporary directories, not in-memory fixtures.
- Exercise public CLI entrypoints and exported helper functions rather than private internals.
- Assert both success paths and failure paths.
- Verify file contents, rewritten references, and generated metadata, not just existence.

## Mocking

**Framework:** None

**Patterns:**
```javascript
const result = installRuntime({
  runtime: 'codex',
  isGlobal: true,
  explicitConfigDir: tmpDir,
});

assert.ok(fs.existsSync(skillPath));
assert.ok(read(skillPath).includes('{{NOVEL_ARGS}}'));
```
From `tests/install.test.cjs`.

```python
result = self.run_script(root, "apply-polish", "--chapter", "2", "--force")
self.assertEqual(result.returncode, 0, result.stderr)
data = json.loads(result.stdout)
self.assertTrue(Path(data["backup_path"]).exists())
```
From `plugins/novel/scripts/test_chapter_ops.py`.

**What to Mock:**
- Nothing by default. Existing tests prefer real filesystem interactions and real subprocess execution.

**What NOT to Mock:**
- Do not mock `fs`, `path`, or Python `Path` when testing installer and script behavior.
- Do not mock subprocess execution for the Python CLIs unless the goal is to isolate a narrow failure path. Current tests intentionally execute the actual scripts.

## Fixtures and Factories

**Test Data:**
```javascript
function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'novel-tool-'));
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}
```
From `tests/install.test.cjs`.

```python
def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(textwrap.dedent(content).strip() + "\n", encoding="utf-8")
```
Used in `plugins/novel/scripts/test_novel_state.py`, `plugins/novel/scripts/test_map_base.py`, and `plugins/novel/scripts/test_chapter_ops.py`.

**Location:**
- Node helpers are defined inline inside each test file.
- Python helper writers and project builders are defined inside each test module as local utilities and `make_project(...)` methods.

## Coverage

**Requirements:** None enforced

**View Coverage:**
```bash
# Not configured in package.json and no coverage tool config is present
```

**Observed coverage focus:**
- `tests/install.test.cjs` covers install, uninstall, validation, Codex conversion helpers, and source inventory.
- `tests/agent-definition.test.cjs` covers Markdown metadata integrity and workflow-to-agent reference consistency.
- `plugins/novel/scripts/test_novel_state.py` covers stats, refresh, target resolution, field output, and invalid range handling.
- `plugins/novel/scripts/test_chapter_ops.py` covers inspect, draft/polish promotion, backup creation, and overwrite rejection.
- `plugins/novel/scripts/test_map_base.py` covers import classification, merge mode, dry-run behavior, and false-positive avoidance.

## Test Types

**Unit Tests:**
- Pure helper tests exist mainly on the Node side by importing functions from `bin/install.js` directly. Examples: `convertNovelCommandToCodexSkill`, `convertClaudeAgentToCodexAgent`, `stripNovelFromCodexConfig` in `tests/install.test.cjs`.

**Integration Tests:**
- Most tests are filesystem integration tests:
  - Node tests create temp config directories, run installer helpers, then inspect generated commands, skills, agents, and config files.
  - Python tests create temp novel projects and invoke scripts through `subprocess.run(...)`.

**E2E Tests:**
- Not used. There is no CI config, browser automation, or end-user shell transcript test harness in the repo.

## Common Patterns

**Async Testing:**
```javascript
test('installs Claude commands, agents, and support bundle with rewritten references', () => {
  const result = installRuntime({
    runtime: 'claude',
    isGlobal: true,
    explicitConfigDir: tmpDir,
  });

  assert.ok(result.ok);
});
```
Current Node tests stay synchronous and rely on sync filesystem APIs in `bin/install.js`.

**Subprocess Testing:**
```python
return subprocess.run(
    [sys.executable, str(SCRIPT), *args, "--root", str(root)],
    text=True,
    capture_output=True,
    check=False,
)
```
This is the standard pattern for Python CLI tests in `plugins/novel/scripts/test_novel_state.py` and `plugins/novel/scripts/test_chapter_ops.py`.

**Error Testing:**
```javascript
const validation = validateRuntime({
  runtime: 'codex',
  isGlobal: true,
  explicitConfigDir: tmpDir,
});

assert.ok(!validation.ok);
assert.ok(validation.issues.some((issue) => issue.includes('missing support directory')));
```
From `tests/install.test.cjs`.

```python
result = self.run_script(root, "use-draft", "--chapter", "1")
self.assertNotEqual(result.returncode, 0)
```
From `plugins/novel/scripts/test_chapter_ops.py` and `plugins/novel/scripts/test_novel_state.py`.

## Practical Guidance For New Tests

- Put new installer or runtime-conversion tests in `tests/install.test.cjs` when they exercise `bin/install.js` exports directly.
- Add structural contract tests for Markdown assets in `tests/agent-definition.test.cjs` when changing `plugins/novel/agents/` or `plugins/novel/workflows/`.
- Put new Python CLI tests next to the script under `plugins/novel/scripts/test_<module>.py`.
- Reuse the existing `write(...)` helper and temporary-directory setup instead of introducing fixture libraries.
- Prefer assertions on generated file contents, JSON payloads, and exit codes over snapshot files.
- Add at least one negative-path test for every new CLI flag or file-transform rule.

## Current Gaps

- The root `npm test` command does not run the Python `unittest` suites; they must be invoked separately.
- No coverage reporting or threshold enforcement is configured.
- No test automation is defined for the Markdown skills under `plugins/novel/skills/` beyond structural checks that flow through installer and workflow tests.

---

*Testing analysis: 2026-04-07*
