# Codebase Concerns

**Analysis Date:** 2026-04-07

## Tech Debt

**Split test harness with no single gate:**
- Issue: `npm test` only runs the Node installer tests from `tests/install.test.cjs` and `tests/agent-definition.test.cjs`, while the Python workflow helpers are covered separately by `plugins/novel/scripts/test_map_base.py`, `plugins/novel/scripts/test_novel_state.py`, and `plugins/novel/scripts/test_chapter_ops.py`.
- Files: `package.json`, `tests/install.test.cjs`, `tests/agent-definition.test.cjs`, `plugins/novel/scripts/test_map_base.py`, `plugins/novel/scripts/test_novel_state.py`, `plugins/novel/scripts/test_chapter_ops.py`
- Impact: local and CI-style verification can report green while regressions in `plugins/novel/scripts/map_base.py`, `plugins/novel/scripts/novel_state.py`, or `plugins/novel/scripts/chapter_ops.py` still ship.
- Fix approach: make `package.json` run both suites or add a single wrapper command and CI job that executes `node --test tests/*.test.cjs` plus `python3 -m unittest discover -s plugins/novel/scripts -p 'test_*.py'`.

**Undocumented Python runtime requirement:**
- Issue: the public install docs in `README.md` present the project as a Node CLI, but the runtime workflows call `python3` repeatedly and the scripts use Python 3.10+ syntax such as `int | None` and `list[str]`.
- Files: `README.md`, `package.json`, `plugins/novel/scripts/map_base.py`, `plugins/novel/scripts/novel_state.py`, `plugins/novel/scripts/chapter_ops.py`, `plugins/novel/workflows/progress.md`, `plugins/novel/workflows/next.md`, `plugins/novel/workflows/write-chapter.md`
- Impact: installation can appear successful on machines that satisfy the Node engine in `package.json` but still fail at first workflow execution if Python is missing or older than 3.10.
- Fix approach: document Python 3.10+ explicitly in `README.md`, validate `python3 --version` during `bin/install.js install`, and fail early with a concrete remediation message.

**Monolithic importer with mixed responsibilities:**
- Issue: `plugins/novel/scripts/map_base.py` is a 1341-line script that mixes classification heuristics, file-copy planning, document generation, reporting, and CLI behavior in one module.
- Files: `plugins/novel/scripts/map_base.py`, `plugins/novel/scripts/test_map_base.py`
- Impact: changes to classification rules can unintentionally break file moves or generated document content because the seams between parsing, planning, and writing are not isolated.
- Fix approach: split `map_base.py` into pure classification/parsing helpers, planning logic, and write/report layers, then add unit tests around the pure functions instead of only end-to-end subprocess tests.

## Known Bugs

**`map_base.py --dry-run` still mutates the source tree:**
- Symptoms: a dry run creates `chapters/`, `characters/`, `research/`, and `reviews/` directories even when no write should happen.
- Files: `plugins/novel/scripts/map_base.py`
- Trigger: run `python3 plugins/novel/scripts/map_base.py --from <dir> --dry-run` on an unstructured folder.
- Workaround: use a disposable copy of the source directory before dry-running, or manually remove the created directories afterward.

**Chapter promotion is non-atomic when state refresh fails:**
- Symptoms: `use-draft`, `use-quick`, or `apply-polish` can exit with an error after copying the formal chapter, leaving content changed while `STATE.md` remains stale.
- Files: `plugins/novel/scripts/chapter_ops.py`, `plugins/novel/scripts/novel_state.py`
- Trigger: run a promotion command when `STATE.md` is missing or when `plugins/novel/scripts/novel_state.py refresh` fails for any reason.
- Workaround: ensure the core project files exist before promotion, or back up `chapters/chapter-*.md` manually before running the command.

**`refresh` can point the next goal at the wrong chapter:**
- Symptoms: `STATE.md` can say `下一目标 | 第4章规划或核对 |` even when chapter 2 is the next unwritten outline.
- Files: `plugins/novel/scripts/novel_state.py`
- Trigger: a project has outlines ahead of the current chapter, for example `chapters/chapter-1.md` plus `chapters/outlines/outline-2.md` and `chapters/outlines/outline-3.md`, then `python3 plugins/novel/scripts/novel_state.py refresh --root <dir>` is run without `--next-goal`.
- Workaround: pass `--next-goal` explicitly from callers until `next_chapter` is derived from the first unwritten outline instead of `latest_outline + 1`.

**`total_words` is a character count, not a word count:**
- Symptoms: dashboard and state values labeled as words are computed with `len(read_text(...))`, so the metric tracks characters including markdown syntax.
- Files: `plugins/novel/scripts/novel_state.py`, `plugins/novel/scripts/map_base.py`
- Trigger: any call to `python3 plugins/novel/scripts/novel_state.py stats` or any `map_base.py` import that populates `STATE.md`.
- Workaround: treat the current field as an approximate text-length metric, not an actual word count, until tokenization or whitespace-based counting is implemented consistently.

**`--config-dir` accepts missing or flag-like values without validation:**
- Symptoms: `parseArgs()` accepts `--config-dir` with no path, or consumes the next flag as the path, e.g. `--config-dir --codex` becomes `explicitConfigDir="--codex"`.
- Files: `bin/install.js`
- Trigger: run `node bin/install.js install --config-dir`, or `node bin/install.js install --config-dir --codex`.
- Workaround: always pass an explicit path immediately after `--config-dir`; avoid relying on the parser to reject malformed CLI input.

## Security Considerations

**Installer and uninstaller perform recursive deletes in user-selected config trees:**
- Risk: `removeIfExists()` and `fs.rmSync(..., { recursive: true, force: true })` delete managed directories under whatever target path is derived from `--config-dir`, `CODEX_HOME`, `CLAUDE_CONFIG_DIR`, or the local working directory.
- Files: `bin/install.js`
- Current mitigation: operations are scoped to known subpaths such as `novel/`, `commands/novel`, `skills/novel-*`, and `agents/novel-*.toml`, and post-install validation checks for missing managed files.
- Recommendations: validate that target directories look like actual Codex or Claude config roots before deleting, reject flag-like `--config-dir` values, and add optional backup or transaction-style staging before destructive operations.

**Codex config rewriting can silently drop user config appended after the managed marker:**
- Risk: `stripNovelFromCodexConfig()` truncates everything after `# Novel Agent Configuration — managed by novel installer`, so any manual config placed below that marker is lost on install, update, or uninstall.
- Files: `bin/install.js`, `tests/install.test.cjs`
- Current mitigation: the managed block is tagged with a clear marker and `tests/install.test.cjs` verifies that unrelated config before the marker survives.
- Recommendations: rewrite only the exact managed section, preserve trailing content after the Novel block, and add a regression test for user-defined sections placed after the marker.

## Performance Bottlenecks

**`map_base.py` repeatedly rereads and rescans the same files:**
- Problem: candidate scanning reads every text file once in `scan_candidates()`, then later phases reread many of the same files for source excerpts, chapter queues, character mentions, timeline rows, and word counts.
- Files: `plugins/novel/scripts/map_base.py`
- Cause: the script recomputes content-derived values from disk instead of caching parsed text or intermediate metadata.
- Improvement path: cache file contents and lightweight parsed metadata during the initial scan, then pass those records through planning and document-generation steps.

**Project status workflows spawn `novel_state.py` many times per command:**
- Problem: `progress.md` executes `python3 scripts/novel_state.py stats --field ...` 13 times in one step, and `next.md` executes it 6 more times for a smaller snapshot.
- Files: `plugins/novel/workflows/progress.md`, `plugins/novel/workflows/next.md`, `plugins/novel/scripts/novel_state.py`
- Cause: each field request recomputes stats from disk, including chapter scans and `total_words`.
- Improvement path: call `stats --json` once per workflow and extract fields from one payload, or cache state results inside the workflow step.

## Fragile Areas

**Managed install surfaces are treated as disposable output, not editable state:**
- Files: `bin/install.js`, `README.md`
- Why fragile: install and update replace `~/.claude/commands/novel`, `~/.claude/novel`, `~/.codex/skills/novel-*`, `~/.codex/agents/novel-*.toml`, and `~/.codex/novel` wholesale. Any manual edits made in installed destinations are removed on the next install/update cycle.
- Safe modification: change the source bundle under `plugins/novel/` and reinstall; do not patch files directly in runtime config directories.
- Test coverage: `tests/install.test.cjs` verifies generated outputs exist, but it does not protect user-edited installed files from being overwritten.

**`map_base.py` classification is heuristic-heavy and easy to regress:**
- Files: `plugins/novel/scripts/map_base.py`, `plugins/novel/scripts/test_map_base.py`
- Why fragile: file kinds are inferred from filename fragments and shallow content previews, with many overlapping keyword buckets such as `OUTLINE_KEYWORDS`, `REVIEW_NAME_KEYWORDS`, `PROJECT_KEYWORDS`, and character-related keywords.
- Safe modification: add fixture-driven tests for every new heuristic branch and for conflict cases where one file can match multiple categories.
- Test coverage: the current test file covers a few happy paths plus one misclassification guard, but not mixed-language, duplicate-number, or ambiguous keyword cases.

**State refresh depends on markdown section replacement, not structured parsing:**
- Files: `plugins/novel/scripts/novel_state.py`, `plugins/novel/scripts/test_novel_state.py`
- Why fragile: `replace_or_append_line()` and `replace_section()` update `STATE.md` with regexes against frontmatter and `##` headings, so unusual formatting or duplicate headings can break refresh output.
- Safe modification: keep `STATE.md` close to the generated structure or move state storage to a structured sidecar file with a renderer.
- Test coverage: `plugins/novel/scripts/test_novel_state.py` checks the default template shape but does not cover user-edited variants of `STATE.md`.

## Scaling Limits

**Importer and status commands scale poorly with manuscript size:**
- Current capacity: the repo’s own tests exercise tiny temporary projects, typically 1-3 chapters and a handful of metadata files.
- Limit: as chapter count and character-card count grow, `plugins/novel/scripts/map_base.py` incurs repeated full-file reads plus O(chapters × characters) mention scans, and `plugins/novel/scripts/novel_state.py` recomputes aggregate stats for each CLI call.
- Scaling path: introduce cached metadata, single-pass parsing, and batched workflow calls that reuse one stats payload instead of spawning the same script repeatedly.

## Dependencies at Risk

**Python availability is an implicit runtime dependency:**
- Risk: the installer succeeds with only Node 20+, but the actual authoring workflows depend on `python3` plus Python 3.10+ syntax support.
- Impact: the installed workflow looks healthy until the first script-backed command fails in the user environment.
- Migration plan: either add Python version validation to `bin/install.js` and the docs, or reimplement the state/import helpers in Node to match the advertised CLI runtime.

## Missing Critical Features

**No automated cross-runtime verification pipeline:**
- Problem: there is no visible CI config under `.github/`, and the repo has no single command that validates Node installer behavior plus Python workflow helpers together.
- Blocks: safe refactors of `bin/install.js`, `plugins/novel/scripts/map_base.py`, `plugins/novel/scripts/novel_state.py`, and `plugins/novel/scripts/chapter_ops.py` because regressions depend on contributors remembering multiple manual commands.

## Test Coverage Gaps

**CLI argument validation paths are untested:**
- What's not tested: malformed `--config-dir` usage, mixed flag ordering edge cases, and suspicious target directories in `bin/install.js`.
- Files: `bin/install.js`, `tests/install.test.cjs`
- Risk: destructive file operations can run against the wrong target path without an automated guard.
- Priority: High

**Failure handling around promotion and refresh is untested:**
- What's not tested: refresh failure after file copy, missing `STATE.md` during promotion, and rollback behavior in `plugins/novel/scripts/chapter_ops.py`.
- Files: `plugins/novel/scripts/chapter_ops.py`, `plugins/novel/scripts/test_chapter_ops.py`
- Risk: users can lose consistency between formal chapter files and state tracking with no test catching partial writes.
- Priority: High

**Dry-run purity and ambiguous importer heuristics are under-tested:**
- What's not tested: `--dry-run` filesystem side effects, duplicate chapter-number collisions, and ambiguous classification inputs in `plugins/novel/scripts/map_base.py`.
- Files: `plugins/novel/scripts/map_base.py`, `plugins/novel/scripts/test_map_base.py`
- Risk: exploratory imports can still mutate a project, and heuristic changes can silently reroute source files.
- Priority: High

**State formatting variants are untested:**
- What's not tested: `STATE.md` files with reordered headings, repeated sections, user-added subsections, or missing tables.
- Files: `plugins/novel/scripts/novel_state.py`, `plugins/novel/scripts/test_novel_state.py`
- Risk: regex-based refresh logic can corrupt or partially update real-world state files that diverge from the template.
- Priority: Medium

---

*Concerns audit: 2026-04-07*
