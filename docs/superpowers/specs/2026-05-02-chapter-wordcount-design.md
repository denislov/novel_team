# Chapter wordcount tool — design

**Date:** 2026-05-02
**Status:** Approved (pending implementation plan)
**Scope:** Single feature — new `chapter wordcount` subcommand in `ans-tools.cjs` plus migration of four workflows to use it.

## Problem

The repo currently has two divergent word-count algorithms:

1. **Reliable, prose-only count** in `ai-novel-studio/bin/lib/chapter_budget.cjs`: `extractProse → sanitizeProse → countVisibleCharacters`. Strips YAML frontmatter, headings, fenced code, links, tables, list bullets, blockquotes, emphasis tokens, and all whitespace. Used by `chapter budget` (and therefore by `write-chapter` §4.2 and `autonomous` writing-check).

2. **Naive whole-file length** in `ai-novel-studio/bin/lib/novel_state.cjs:231` and `ai-novel-studio/bin/map_base.cjs:160-165`: `chapters.reduce((sum, f) => sum + readText(f).length, 0)`. Counts frontmatter, headings, whitespace, markdown syntax — systematically inflates prose counts. Powers the `total_words` field surfaced by `state load`, `init manager`, `init progress`, and the autonomous dashboard.

Workflows that need word counts today either reach for the budget tool (which packages the count behind budget-gate semantics) or fall back to the inflated `total_words` field. `polish.md` has no reliable counting path at all — its "原字数 [XXXX]" template relies on the editor agent eyeballing the file.

The user wants one canonical, reliable word-count tool that workflows uniformly call when they need to "check word count," without being forced to interpret budget-gate output and without inheriting the inflated `total_words` value.

## Non-goals

- **Do not change `novel_state.cjs:231` or `map_base.cjs:160-165`.** The `total_words` field in `STATE.md` keeps its current naive computation for backward compatibility. Dashboards switch their *display* path to the new tool instead.
- **Do not modify `chapter_budget.cjs`'s public behavior.** It remains the budget-gate authority. The new tool re-uses its prose-extraction primitives but does not absorb its budget logic.
- **Do not migrate `autonomous.md` this round.** It already calls `chapter budget` with reliable counts; redundant migration adds churn.

## Architecture

### Module layering (Approach A)

```
ans-tools.cjs (router)
   └─→ lib/chapter.cjs (cmdChapterWordcount)
         └─→ lib/wordcount.cjs (NEW — orchestration + scope resolution)
               └─→ lib/chapter_budget.cjs (existing — extractProse, sanitizeProse, countVisibleCharacters)
```

`lib/wordcount.cjs` is new and ~80 lines. It re-uses the prose-extraction algorithm from `lib/chapter_budget.cjs` (imports, no duplication) and adds:

- `countSingle(root, chapter, source)` → throws if file missing.
- `countBatch(root, chapterNumbers, source)` → calls `countSingle` per chapter, catches missing-file errors to populate `missing[]`.
- `resolveScope(root, scopeArg, allFlag)` → parses positional arg into a list of chapter numbers; for `--all` walks `chapters/chapter-*.md` via `core.chapterFiles`.

`lib/chapter_budget.cjs` keeps its single concern (does this chapter satisfy its budget?). `lib/wordcount.cjs` owns aggregation + scope resolution.

### CLI surface

```
chapter wordcount <N>            Single chapter; errors if source file missing
chapter wordcount <START-END>    Inclusive range; missing chapters listed in missing[], no error
chapter wordcount --all          All chapters present in chapters/; same skip-missing behavior

Flags:
  --source <draft|formal|quick|polished>   Default: formal (matches `chapter budget`)
  --raw                                    Print just aggregate.total_chars (bare integer)
  --pick <field>                           Dot-path field selector (existing core.cjs machinery)
  --root <dir>                             Project root (default: auto-detect)
```

The router (`parseTopArgs` in `ans-tools.cjs`) needs one targeted change: extract `--all` as a boolean flag before chapter-number parsing, so it does not get mistaken for the positional argument.

### Output schema

Single canonical JSON shape across all three input forms; workflows do not branch on scope:

```json
{
  "scope": "single|range|all",
  "source": "formal",
  "requested": { "chapters": [5] },
  "chapters": [
    {
      "chapter": 5,
      "source": "formal",
      "file_path": "chapters/chapter-5.md",
      "prose_chars": 3127,
      "count_basis": "visible_non_whitespace_chars_in_prose"
    }
  ],
  "missing": [
    { "chapter": 7, "source": "formal", "file_path": "chapters/chapter-7.md" }
  ],
  "aggregate": {
    "chapter_count": 1,
    "total_chars": 3127,
    "missing_count": 0
  }
}
```

Notes:
- `count_basis` matches the existing string used by `chapter budget`, preserving semantic compatibility for any downstream code/tests that grep for it.
- Single-form: `chapters` length 1, `aggregate.chapter_count = 1`, `missing` empty (single-form errors out on missing file).
- Range/`--all`: `chapters` is the present subset, `missing` is the absent subset, `aggregate.chapter_count` counts only present chapters.
- `--raw` prints just `aggregate.total_chars` as a bare integer — the most useful one-liner for `WORD_COUNT=$(... --raw)` in workflow bash.
- `--pick` uses existing dot-path machinery (e.g. `--pick aggregate.total_chars`).

## Workflow migration

### `write-chapter.md` §4.2 — replace budget call with wordcount + inline gate

Current:
```bash
node bin/ans-tools.cjs chapter budget ${CHAPTER_NUMBER} --source formal
```

New:
```bash
PROSE_CHARS=$(node bin/ans-tools.cjs chapter wordcount "$CHAPTER_NUMBER" --source formal --raw)
HARD_CEILING=$(node bin/ans-tools.cjs state get chapter_word_ceiling --raw)
TARGET_WORDS=$(node bin/ans-tools.cjs state get chapter_words --raw)
if [ "$PROSE_CHARS" -gt "$HARD_CEILING" ]; then
  # workflow handles split / rewrite branch
fi
```

The gate logic moves from inside `chapter budget` to the workflow itself, making it explicit and auditable. `state get chapter_word_ceiling` and `state get chapter_words` are already supported (test #4 allowlist permits `state get`). The narrative section ("【字数】[XXXX] 字") fills from `$PROSE_CHARS`.

### `polish.md` — pre/post counts

Add two `chapter wordcount $N --source formal --raw` calls bracketing the polish step. The "原字数" / "修改后" / "修改率" cells in the polish report template fill from these values rather than relying on the editor agent's manual estimate.

### `progress.md` and `manager.md` — switch `total_words` to the new tool

Replace dashboard reliance on `state load → total_words` with:

```bash
TOTAL_WORDS=$(node bin/ans-tools.cjs chapter wordcount --all --source formal --pick aggregate.total_chars --raw)
```

`state load` continues to return its `total_words` field (computed the old naive way) for backward compatibility — only the dashboard display path switches.

### `autonomous.md` — no change

Already uses `chapter budget` for the post-write gate, which is reliable. Per scope decision, this round leaves it untouched.

## Tests

### Contract test updates (`tests/runtime-contract.test.cjs`)

1. **Update test #4 allowlist** — add `'chapter wordcount'` to the allowed Set at line 207.

2. **New: `chapter wordcount appears in chapter route dispatch`** — verify `ans-tools.cjs` `routeChapter` switch contains a `wordcount` case.

3. **New: `write-chapter / polish / progress / manager workflows invoke chapter wordcount`** — grep for `node bin/ans-tools.cjs chapter wordcount` in each of those four workflow files. Pins the migration; future drift fails the suite.

4. **New: `wordcount and chapter budget agree on prose_chars for a shared input`** — algorithmic test that builds a temp project (via `fs.mkdtempSync`, matching the `chapter-normalize.test.cjs:16` convention) with one chapter file containing varied markdown (frontmatter, headings, prose, fenced code, lists, blockquotes, emphasis), then asserts `wordcount.countSingle(...).prose_chars === chapter_budget.analyzeChapter(...).prose_chars`. Locks in the shared-algorithm promise so future refactors cannot let them diverge silently.

### New algorithm tests (`tests/wordcount.test.cjs` — new file)

Mirrors the style of `tests/chapter-normalize.test.cjs`. Each test uses a temp project directory.

1. **Single-chapter happy path** — returns expected schema fields including `count_basis = 'visible_non_whitespace_chars_in_prose'`.
2. **Range with one missing chapter** — present chapters in `chapters[]`, missing in `missing[]`, `aggregate.chapter_count` counts only present.
3. **`--all` walks `chapters/chapter-*.md`** and aggregates correctly.
4. **`--raw` prints bare integer** equal to `aggregate.total_chars`.
5. **Single-chapter form throws on missing file** (gate-style behavior).
6. **Edge case: empty prose section** — `prose_chars = 0`, no error.
7. **Edge case: prose containing only whitespace** — `prose_chars = 0`.
8. **Edge case: prose containing fenced code blocks** — code block content excluded from count (verifies `sanitizeProse` is being applied via the imported algorithm).

### Manual verification commands

After implementation:

```bash
npm test                                                                                  # all 38 contract + 9 algorithm + new wordcount tests
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount 1 --source formal                # single chapter JSON
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount 1 --source formal --raw          # bare integer
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount 1-3 --source formal              # range
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount --all --source formal            # all chapters
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount --all --pick aggregate.total_chars --raw  # one-liner total
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount 999 --source formal              # missing chapter (single → error)
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount 1-999 --source formal            # missing chapter (range → listed in missing[])
```

## Files touched

**New:**
- `ai-novel-studio/bin/lib/wordcount.cjs`
- `tests/wordcount.test.cjs`

(No checked-in fixture files. Tests use `fs.mkdtempSync` inline, matching the `chapter-normalize.test.cjs` convention.)

**Modified:**
- `ai-novel-studio/bin/ans-tools.cjs` — add `wordcount` case in `routeChapter`; extract `--all` flag in `parseTopArgs`; update `printUsage` text.
- `ai-novel-studio/bin/lib/chapter.cjs` — add `cmdChapterWordcount`, export it.
- `ai-novel-studio/workflows/write-chapter.md` — §4.2 update.
- `ai-novel-studio/workflows/polish.md` — pre/post wordcount calls.
- `ai-novel-studio/workflows/progress.md` — `total_words` source switch.
- `ai-novel-studio/workflows/manager.md` — `total_words` source switch.
- `tests/runtime-contract.test.cjs` — allowlist + new contract tests.

**Untouched:**
- `ai-novel-studio/bin/lib/chapter_budget.cjs` — algorithm primitives are imported, not modified.
- `ai-novel-studio/bin/lib/novel_state.cjs` — `total_words` keeps its current computation.
- `ai-novel-studio/bin/map_base.cjs` — same.
- `ai-novel-studio/workflows/autonomous.md` — keeps existing `chapter budget` call.

## Risks and mitigations

1. **`--all` flag clashes with positional arg parsing.** The router currently treats the first non-`--` rest arg as a possible chapter number. Mitigation: extract `--all` as a boolean *before* positional parsing, in `parseTopArgs`. Add a parser test that confirms `chapter wordcount --all` is not interpreted as `chapter wordcount` with an unset positional.

2. **Workflow migration could silently drop a script that other tools depend on.** Mitigation: contract test #3 above pins each migrated workflow; if `chapter wordcount` is removed from any of them, the suite fails.

3. **Dashboard total drifts away from `STATE.md`'s `total_words` field.** This is the *intended* effect (the new total is the trustworthy one), but reviewers might be confused. Mitigation: brief inline comment in `progress.md` and `manager.md` explaining why the dashboard ignores `state.total_words` and recomputes via `chapter wordcount --all`.

4. **Empty `chapters/` directory + `--all`.** `aggregate.total_chars = 0`, `chapter_count = 0`, `missing_count = 0`. Should not error. Covered by an edge-case algorithm test.
