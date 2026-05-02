# Chapter wordcount tool — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `chapter wordcount` subcommand to `ans-tools.cjs` that returns reliable prose-only character counts (single chapter, range, or all), then migrate four workflows (`write-chapter.md`, `polish.md`, `progress.md`, `manager.md`) to use it.

**Architecture:** New `ai-novel-studio/bin/lib/wordcount.cjs` module orchestrates scope-resolution and aggregation, re-using `extractProse / sanitizeProse / countVisibleCharacters` primitives from existing `lib/chapter_budget.cjs` (no algorithm duplication). Routed through `lib/chapter.cjs:cmdChapterWordcount` and `ans-tools.cjs:routeChapter`. Contract tests pin the allowlist + each migrated workflow.

**Tech Stack:** Node ≥20, `node:test` runner, `node:assert/strict`, CommonJS (`.cjs`).

---

## File structure

| File | Status | Responsibility |
|------|--------|----------------|
| `ai-novel-studio/bin/lib/wordcount.cjs` | new | Pure functions: `countSingle`, `countBatch`, `resolveScope`. Imports primitives from `chapter_budget.cjs`. |
| `tests/wordcount.test.cjs` | new | Algorithm tests for the three lib functions + cross-tool agreement with `chapter_budget`. |
| `ai-novel-studio/bin/lib/chapter.cjs` | modify | Add `cmdChapterWordcount` (router-facing); export it from `module.exports`. |
| `ai-novel-studio/bin/ans-tools.cjs` | modify | Add `case 'wordcount':` in `routeChapter`; add `'all'` boolean to `parseNamedArgs`; update `printUsage`. |
| `tests/runtime-contract.test.cjs` | modify | Add `'chapter wordcount'` to allowlist; add new tests for route dispatch + 4 workflow pinning. |
| `ai-novel-studio/workflows/write-chapter.md` | modify | §4.2 — switch from `chapter budget` to `chapter wordcount` + inline budget gate via `state get`. |
| `ai-novel-studio/workflows/polish.md` | modify | §3 single + §4 batch — pre/post `chapter wordcount` calls feeding "原字数 / 修改后" cells. |
| `ai-novel-studio/workflows/progress.md` | modify | Recompute `total_words` for display via `chapter wordcount --all`. |
| `ai-novel-studio/workflows/manager.md` | modify | Same as progress, in `initialize` step. |
| `ai-novel-studio/bin/lib/chapter_budget.cjs` | untouched | Continues exposing `extractProse`, `sanitizeProse`, `countVisibleCharacters`, `analyzeChapter`. |
| `ai-novel-studio/bin/lib/novel_state.cjs` | untouched | `total_words` keeps existing naive computation (display path bypasses it). |
| `ai-novel-studio/workflows/autonomous.md` | untouched | Keeps existing `chapter budget` call. |

---

## Task 1: `lib/wordcount.cjs` — `countSingle()`

**Files:**
- Create: `ai-novel-studio/bin/lib/wordcount.cjs`
- Create: `tests/wordcount.test.cjs`

- [ ] **Step 1: Write the first failing test (happy path)**

Create `tests/wordcount.test.cjs` with:

```javascript
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const wordcount = require(path.join(REPO_ROOT, 'ai-novel-studio', 'bin', 'lib', 'wordcount.cjs'));
const chapterBudget = require(path.join(REPO_ROOT, 'ai-novel-studio', 'bin', 'lib', 'chapter_budget.cjs'));

function makeProjectFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ans-wctest-'));
  fs.mkdirSync(path.join(dir, 'chapters'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'PROJECT.md'),
    '---\nchapter_words: 3000\nchapter_word_ceiling: 4000\n---\n', 'utf8');
  return dir;
}

function writeChapter(root, n, lines) {
  fs.writeFileSync(path.join(root, 'chapters', `chapter-${n}.md`), lines.join('\n'), 'utf8');
}

test('countSingle returns prose_chars, file_path, count_basis for a chapter with prose', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---',
    'chapter: 1',
    'title: 测试',
    '---',
    '',
    '# 第1章 测试',
    '',
    '## 正文',
    '',
    '一段正文，有十个字符。',
  ]);

  const result = wordcount.countSingle(root, 1, 'formal');
  assert.strictEqual(result.chapter, 1);
  assert.strictEqual(result.source, 'formal');
  assert.ok(result.file_path.endsWith('chapters/chapter-1.md'));
  assert.strictEqual(result.prose_chars, 11, '一段正文，有十个字符。 = 11 visible non-whitespace CJK chars');
  assert.strictEqual(result.count_basis, 'visible_non_whitespace_chars_in_prose');
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test --test-name-pattern="countSingle returns" tests/wordcount.test.cjs`
Expected: FAIL — `Cannot find module '.../wordcount.cjs'`

- [ ] **Step 3: Implement `countSingle` (minimal)**

Create `ai-novel-studio/bin/lib/wordcount.cjs`:

```javascript
#!/usr/bin/env node

/**
 * wordcount — Reliable prose-only character counting for chapters.
 *
 * Re-uses extractProse / sanitizeProse / countVisibleCharacters from
 * chapter_budget.cjs (single algorithm source). This module owns scope
 * resolution (single / range / all) and aggregation across multiple chapters.
 */

const path = require('node:path');
const fs = require('node:fs');

const chapterBudget = require('./chapter_budget.cjs');
const { artifactPaths } = require('./chapter_ops.cjs');
const { chapterFiles, chapterNumberFromName, fileExists, readText } = require('./core.cjs');

const COUNT_BASIS = 'visible_non_whitespace_chars_in_prose';

/**
 * Count prose chars for a single chapter. Throws if source file is missing.
 */
function countSingle(root, chapter, source) {
  const paths = artifactPaths(root, chapter);
  const filePath = paths[source];
  if (!filePath) {
    throw new Error(`unknown source: ${source}`);
  }
  if (!fileExists(filePath)) {
    throw new Error(`${source} chapter ${chapter} not found: ${filePath}`);
  }
  const text = readText(filePath);
  const prose = chapterBudget.extractProse(text);
  const proseChars = chapterBudget.countVisibleCharacters(prose);
  return {
    chapter,
    source,
    file_path: path.relative(root, filePath),
    prose_chars: proseChars,
    count_basis: COUNT_BASIS,
  };
}

module.exports = {
  countSingle,
  COUNT_BASIS,
};
```

- [ ] **Step 4: Run test, verify it passes**

Run: `node --test --test-name-pattern="countSingle returns" tests/wordcount.test.cjs`
Expected: PASS (1 test)

- [ ] **Step 5: Add failing test for missing-file behavior**

Append to `tests/wordcount.test.cjs`:

```javascript
test('countSingle throws when source file is missing', () => {
  const root = makeProjectFixture();
  // No chapter file created.
  assert.throws(
    () => wordcount.countSingle(root, 99, 'formal'),
    /not found/,
    'countSingle must throw when the source file does not exist'
  );
});
```

- [ ] **Step 6: Run, verify it passes (already covered)**

Run: `node --test tests/wordcount.test.cjs`
Expected: PASS (2 tests). The throw was implemented in Step 3, so this test passes immediately — it locks in the contract for future refactors.

- [ ] **Step 7: Commit**

```bash
git add ai-novel-studio/bin/lib/wordcount.cjs tests/wordcount.test.cjs
git commit -m "$(cat <<'EOF'
新增 lib/wordcount.cjs:countSingle — 单章 prose 字数统计

复用 chapter_budget 的 extractProse/countVisibleCharacters，
返回 { chapter, source, file_path, prose_chars, count_basis }；
源文件缺失时抛错（供单章 gate 调用）。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `lib/wordcount.cjs` — `countBatch()`

**Files:**
- Modify: `ai-novel-studio/bin/lib/wordcount.cjs`
- Modify: `tests/wordcount.test.cjs`

- [ ] **Step 1: Write failing test for happy-path aggregation**

Append to `tests/wordcount.test.cjs`:

```javascript
test('countBatch aggregates prose_chars across chapters and reports missing', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---', 'chapter: 1', '---', '',
    '# 第1章', '',
    '## 正文', '',
    '十个字符的正文测试',
  ]);
  writeChapter(root, 3, [
    '---', 'chapter: 3', '---', '',
    '# 第3章', '',
    '## 正文', '',
    '另外一段五字',
  ]);
  // chapter 2 deliberately absent

  const result = wordcount.countBatch(root, [1, 2, 3], 'formal');
  assert.strictEqual(result.chapters.length, 2, 'present chapters only in chapters[]');
  assert.strictEqual(result.missing.length, 1, 'absent chapter listed in missing[]');
  assert.strictEqual(result.missing[0].chapter, 2);
  assert.strictEqual(result.aggregate.chapter_count, 2);
  assert.strictEqual(result.aggregate.missing_count, 1);
  assert.strictEqual(
    result.aggregate.total_chars,
    result.chapters[0].prose_chars + result.chapters[1].prose_chars
  );
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --test --test-name-pattern="countBatch aggregates" tests/wordcount.test.cjs`
Expected: FAIL — `wordcount.countBatch is not a function`

- [ ] **Step 3: Implement `countBatch`**

Add to `ai-novel-studio/bin/lib/wordcount.cjs` before `module.exports`:

```javascript
/**
 * Count prose chars for a list of chapters. Missing files are recorded in
 * `missing[]` instead of throwing — callers in batch mode want a partial
 * result over a hard failure.
 */
function countBatch(root, chapterNumbers, source) {
  const chapters = [];
  const missing = [];
  for (const chapter of chapterNumbers) {
    try {
      chapters.push(countSingle(root, chapter, source));
    } catch (e) {
      const paths = artifactPaths(root, chapter);
      missing.push({
        chapter,
        source,
        file_path: paths[source] ? path.relative(root, paths[source]) : null,
      });
    }
  }
  const totalChars = chapters.reduce((sum, c) => sum + c.prose_chars, 0);
  return {
    chapters,
    missing,
    aggregate: {
      chapter_count: chapters.length,
      missing_count: missing.length,
      total_chars: totalChars,
    },
  };
}
```

Update `module.exports`:

```javascript
module.exports = {
  countSingle,
  countBatch,
  COUNT_BASIS,
};
```

- [ ] **Step 4: Run test, verify it passes**

Run: `node --test --test-name-pattern="countBatch aggregates" tests/wordcount.test.cjs`
Expected: PASS

- [ ] **Step 5: Add failing test for empty-input edge case**

Append to `tests/wordcount.test.cjs`:

```javascript
test('countBatch on empty input returns empty arrays and zero aggregate', () => {
  const root = makeProjectFixture();
  const result = wordcount.countBatch(root, [], 'formal');
  assert.deepEqual(result.chapters, []);
  assert.deepEqual(result.missing, []);
  assert.strictEqual(result.aggregate.chapter_count, 0);
  assert.strictEqual(result.aggregate.missing_count, 0);
  assert.strictEqual(result.aggregate.total_chars, 0);
});
```

- [ ] **Step 6: Run, verify it passes**

Run: `node --test --test-name-pattern="empty input" tests/wordcount.test.cjs`
Expected: PASS (covered by the loop running zero iterations)

- [ ] **Step 7: Commit**

```bash
git add ai-novel-studio/bin/lib/wordcount.cjs tests/wordcount.test.cjs
git commit -m "$(cat <<'EOF'
新增 wordcount.countBatch — 多章聚合 + 缺失分离

逐章调用 countSingle，缺失文件归入 missing[]，aggregate 汇总
total_chars/chapter_count/missing_count；空输入返回零聚合。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: `lib/wordcount.cjs` — `resolveScope()`

**Files:**
- Modify: `ai-novel-studio/bin/lib/wordcount.cjs`
- Modify: `tests/wordcount.test.cjs`

- [ ] **Step 1: Write failing test for the four scope cases**

Append to `tests/wordcount.test.cjs`:

```javascript
test('resolveScope handles single, range, all, and rejects garbage input', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, ['---', 'chapter: 1', '---', '', '# 第1章', '', '## 正文', '', 'A']);
  writeChapter(root, 2, ['---', 'chapter: 2', '---', '', '# 第2章', '', '## 正文', '', 'B']);
  writeChapter(root, 5, ['---', 'chapter: 5', '---', '', '# 第5章', '', '## 正文', '', 'C']);

  // Single
  const single = wordcount.resolveScope(root, { positional: '5', all: false });
  assert.strictEqual(single.scope, 'single');
  assert.deepEqual(single.requested, { chapters: [5] });

  // Range
  const range = wordcount.resolveScope(root, { positional: '1-3', all: false });
  assert.strictEqual(range.scope, 'range');
  assert.deepEqual(range.requested, { chapters: [1, 2, 3] });

  // All — walks chapters/ directory
  const all = wordcount.resolveScope(root, { positional: null, all: true });
  assert.strictEqual(all.scope, 'all');
  assert.deepEqual(all.requested, { chapters: [1, 2, 5] });

  // Garbage
  assert.throws(
    () => wordcount.resolveScope(root, { positional: 'abc', all: false }),
    /requires <N>, <N-M>, or --all/
  );
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `node --test --test-name-pattern="resolveScope handles" tests/wordcount.test.cjs`
Expected: FAIL — `wordcount.resolveScope is not a function`

- [ ] **Step 3: Implement `resolveScope`**

Add to `ai-novel-studio/bin/lib/wordcount.cjs` before `module.exports`:

```javascript
/**
 * Resolve the user-supplied scope into a list of chapter numbers.
 *
 * Forms:
 *   { positional: 'N',   all: false }  → single
 *   { positional: 'N-M', all: false }  → range (inclusive)
 *   { positional: null|'--all', all: true } → all (walks chapters/chapter-*.md)
 *
 * Throws on malformed input — callers should let this propagate so the user
 * gets a clear error.
 */
function resolveScope(root, { positional, all }) {
  if (all) {
    const files = chapterFiles(root);
    const chapters = files
      .map((f) => chapterNumberFromName(path.basename(f), 'chapter'))
      .filter((n) => Number.isInteger(n))
      .sort((a, b) => a - b);
    return { scope: 'all', requested: { chapters } };
  }
  if (typeof positional === 'string' && /^\d+$/.test(positional)) {
    return { scope: 'single', requested: { chapters: [Number.parseInt(positional, 10)] } };
  }
  if (typeof positional === 'string' && /^\d+-\d+$/.test(positional)) {
    const [startStr, endStr] = positional.split('-');
    const start = Number.parseInt(startStr, 10);
    const end = Number.parseInt(endStr, 10);
    if (end < start) {
      throw new Error(`chapter wordcount range invalid: ${positional} (end < start)`);
    }
    const chapters = [];
    for (let n = start; n <= end; n += 1) chapters.push(n);
    return { scope: 'range', requested: { chapters } };
  }
  throw new Error('chapter wordcount requires <N>, <N-M>, or --all');
}
```

Update `module.exports`:

```javascript
module.exports = {
  countSingle,
  countBatch,
  resolveScope,
  COUNT_BASIS,
};
```

- [ ] **Step 4: Run, verify it passes**

Run: `node --test --test-name-pattern="resolveScope handles" tests/wordcount.test.cjs`
Expected: PASS

- [ ] **Step 5: Add edge-case test — fenced code blocks excluded**

This pins the contract that the imported `chapter_budget` algorithm continues to be applied. Append to `tests/wordcount.test.cjs`:

```javascript
test('countSingle excludes fenced code blocks from prose count', () => {
  const root = makeProjectFixture();
  writeChapter(root, 1, [
    '---', 'chapter: 1', '---', '',
    '# 第1章', '',
    '## 正文', '',
    '正常一段五字',
    '',
    '```',
    '这段代码不算字数因为在围栏内',
    '```',
    '',
    '又一段六个字。',
  ]);

  const result = wordcount.countSingle(root, 1, 'formal');
  // '正常一段五字' (6) + '又一段六个字。' (7) = 13
  assert.strictEqual(result.prose_chars, 13);
});
```

- [ ] **Step 6: Run, verify it passes**

Run: `node --test --test-name-pattern="excludes fenced" tests/wordcount.test.cjs`
Expected: PASS — `chapter_budget.sanitizeProse` already strips fenced code; this test pins that behavior is reachable through the new module.

- [ ] **Step 7: Run the whole suite**

Run: `npm test`
Expected: PASS — all existing tests + 5 new wordcount tests.

- [ ] **Step 8: Commit**

```bash
git add ai-novel-studio/bin/lib/wordcount.cjs tests/wordcount.test.cjs
git commit -m "$(cat <<'EOF'
新增 wordcount.resolveScope — 三种输入形式的范围解析

接受 { positional, all } 输入，返回 { scope, requested.chapters }；
single/range/all 三种 scope，--all 走 core.chapterFiles 扫描目录；
顺带补一个围栏代码块的边界用例。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Cross-tool agreement test

**Files:**
- Modify: `tests/wordcount.test.cjs`

- [ ] **Step 1: Write the cross-tool test**

Append to `tests/wordcount.test.cjs`:

```javascript
test('wordcount.countSingle and chapter_budget.analyzeChapter return identical prose_chars', () => {
  const root = makeProjectFixture();
  writeChapter(root, 7, [
    '---', 'chapter: 7', 'title: 综合测试', '---', '',
    '# 第7章 综合测试',
    '',
    '> 故事时间：1980年',
    '',
    '## 正文',
    '',
    '一段正文 *带强调* 和 [链接文字](https://example.com)。',
    '',
    '- 列表项一',
    '- 列表项二',
    '',
    '> 引文也算字数。',
    '',
    '```',
    '代码块不算',
    '```',
    '',
    '最后一段正文。',
  ]);

  const wc = wordcount.countSingle(root, 7, 'formal');
  const budget = chapterBudget.analyzeChapter(root, 7, 'formal');

  assert.strictEqual(
    wc.prose_chars, budget.prose_chars,
    'wordcount and chapter_budget MUST return the same prose_chars for the same input ' +
    '(they share the underlying extractProse/countVisibleCharacters algorithm; this test ' +
    'fails immediately if a future refactor lets them diverge)'
  );
});
```

- [ ] **Step 2: Run, verify it passes**

Run: `node --test --test-name-pattern="identical prose_chars" tests/wordcount.test.cjs`
Expected: PASS — both tools call the same `chapter_budget` primitives, so the values match by construction.

- [ ] **Step 3: Commit**

```bash
git add tests/wordcount.test.cjs
git commit -m "$(cat <<'EOF'
新增跨工具一致性测试 — wordcount 与 chapter_budget 字数应严格相等

锁定两者共享 extractProse/countVisibleCharacters 算法的承诺；
未来如有人独立改写，会立即被这条测试拦截。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Wire the CLI route — `cmdChapterWordcount` + `routeChapter`

**Files:**
- Modify: `ai-novel-studio/bin/lib/chapter.cjs`
- Modify: `ai-novel-studio/bin/ans-tools.cjs`

- [ ] **Step 1: Add `cmdChapterWordcount` to `lib/chapter.cjs`**

In `ai-novel-studio/bin/lib/chapter.cjs`, add after `cmdChapterPaths` (around line 127):

```javascript
/**
 * chapter wordcount <N|N-M|--all> — Reliable prose-only character count.
 *
 * Single-form errors when the source file is missing; range/--all forms list
 * absent chapters in `missing[]`. Output schema is the same across all three
 * forms so workflows do not need to branch on scope.
 */
function cmdChapterWordcount(root, scopeInput, source, raw, pick) {
  const wordcount = require('./wordcount.cjs');
  const resolved = wordcount.resolveScope(root, scopeInput);
  const sourceKey = source || 'formal';

  let result;
  if (resolved.scope === 'single') {
    // Single-form must throw on missing — let countSingle's error propagate.
    const single = wordcount.countSingle(root, resolved.requested.chapters[0], sourceKey);
    result = {
      scope: 'single',
      source: sourceKey,
      requested: resolved.requested,
      chapters: [single],
      missing: [],
      aggregate: { chapter_count: 1, missing_count: 0, total_chars: single.prose_chars },
    };
  } else {
    const batch = wordcount.countBatch(root, resolved.requested.chapters, sourceKey);
    result = {
      scope: resolved.scope,
      source: sourceKey,
      requested: resolved.requested,
      chapters: batch.chapters,
      missing: batch.missing,
      aggregate: batch.aggregate,
    };
  }

  // --raw with no --pick prints aggregate.total_chars (most useful one-liner).
  // --raw with --pick prints the picked field as a string.
  if (raw && !pick) {
    core.output(result, true, result.aggregate.total_chars);
    return;
  }
  if (pick) {
    const picked = pick.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), result);
    core.output(result, raw, picked);
    return;
  }
  core.output(result, false);
}
```

Add `cmdChapterWordcount` to the module's `exports`:

```javascript
module.exports = {
  cmdChapterInspect,
  cmdChapterList,
  cmdChapterBudget,
  cmdChapterBudgetSync,
  cmdChapterNormalize,
  cmdChapterPromote,
  cmdChapterPaths,
  cmdChapterWordcount,
};
```

- [ ] **Step 2: Wire the route in `ans-tools.cjs:routeChapter`**

In `ai-novel-studio/bin/ans-tools.cjs`, replace the `routeChapter` function body (currently lines 190–213) so it adds `'all'` to boolean flags and a `wordcount` case:

```javascript
function routeChapter(root, sub, rest, raw, pick) {
  const chapter = require('./lib/chapter.cjs');
  const named = parseNamedArgs(rest, ['source', 'chapter'], ['force', 'dry-run', 'all']);
  const chapterNum = rest[0] && /^\d+$/.test(rest[0]) ? rest[0] : null;

  switch (sub) {
    case 'inspect':
      return chapter.cmdChapterInspect(root, chapterNum, raw);
    case 'list':
      return chapter.cmdChapterList(root, raw);
    case 'budget':
      return chapter.cmdChapterBudget(root, chapterNum, named.source, raw);
    case 'budget-sync':
      return chapter.cmdChapterBudgetSync(root, chapterNum, named.source, raw);
    case 'normalize':
      return chapter.cmdChapterNormalize(root, chapterNum, named.source, named['dry-run'], raw);
    case 'promote':
      return chapter.cmdChapterPromote(root, chapterNum, named.source, named.force, named['dry-run'], raw);
    case 'paths':
      return chapter.cmdChapterPaths(root, chapterNum, raw);
    case 'wordcount': {
      const positional = rest[0] && !rest[0].startsWith('--') ? rest[0] : null;
      return chapter.cmdChapterWordcount(
        root,
        { positional, all: named.all },
        named.source,
        raw,
        pick
      );
    }
    default:
      error(`unknown chapter subcommand: ${sub}. Try: inspect, list, budget, budget-sync, normalize, promote, paths, wordcount`);
  }
}
```

Update the call site in `main()` (around line 121) so `pick` is forwarded:

```javascript
case 'chapter':
  return routeChapter(root, subcommand, rest, raw, pick);
```

- [ ] **Step 3: Update `printUsage()` in `ans-tools.cjs`**

In the `printUsage()` template string, add a line under `chapter ...` group (after `chapter promote`):

```
  chapter wordcount <N|N-M|--all>   Reliable prose-only char count
                                    [--source s] [--raw] [--pick <field>]
```

Keep the rest of the help text unchanged.

- [ ] **Step 4: Smoke test the CLI manually**

Build a temp project and run:

```bash
TMPROOT=$(mktemp -d)
mkdir -p "$TMPROOT/chapters"
cat > "$TMPROOT/PROJECT.md" <<'EOF'
---
chapter_words: 3000
chapter_word_ceiling: 4000
---
EOF
cat > "$TMPROOT/chapters/chapter-1.md" <<'EOF'
---
chapter: 1
title: 测试
---

# 第1章 测试

## 正文

一段正文，有十一个字符。
EOF

# Single-form
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount 1 --source formal --root "$TMPROOT"
# Single-form raw
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount 1 --source formal --raw --root "$TMPROOT"
# Range with one missing
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount 1-3 --source formal --root "$TMPROOT"
# All
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount --all --source formal --root "$TMPROOT"
# Pick aggregate.total_chars raw
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount --all --source formal --pick aggregate.total_chars --raw --root "$TMPROOT"

rm -rf "$TMPROOT"
```

Expected:
- Single-form prints JSON with `"scope": "single"`, exactly one entry in `chapters`, an `aggregate.chapter_count` of 1, and an integer `aggregate.total_chars` (the exact CJK char count of the prose body, with all whitespace stripped — should match what `countVisibleCharacters` would return).
- Single-form raw prints the same integer as `aggregate.total_chars` and nothing else.
- Range-form prints `"scope": "range"`, two entries in `missing` (chapters 2 and 3), `"aggregate": { "chapter_count": 1, "missing_count": 2 }`.
- `--all` matches single-form aggregate (only chapter 1 exists in this fixture).
- `--pick aggregate.total_chars --raw` prints the same bare integer as the single-form raw output.

If any output does not match, fix the offending code in `cmdChapterWordcount` or `routeChapter` before continuing.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: All previously-passing tests still pass; new wordcount tests pass; runtime-contract tests do NOT yet fail (the new subcommand is not yet referenced by any workflow, so the existing workflow allowlist test does not see it).

- [ ] **Step 6: Commit**

```bash
git add ai-novel-studio/bin/lib/chapter.cjs ai-novel-studio/bin/ans-tools.cjs
git commit -m "$(cat <<'EOF'
ans-tools: 接入 chapter wordcount 路由

routeChapter 新增 'wordcount' case 与 --all 布尔旗；cmdChapterWordcount
负责 single/range/all 三种形态的统一输出 schema；--raw 默认输出
aggregate.total_chars，配合 --pick 可挑任意字段；printUsage 同步更新。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Update runtime-contract allowlist + add dispatch test

**Files:**
- Modify: `tests/runtime-contract.test.cjs`

- [ ] **Step 1: Add `'chapter wordcount'` to the allowlist**

In `tests/runtime-contract.test.cjs`, locate the `allowed` Set in test #4 (line 207). Insert `'chapter wordcount'` alphabetically after `'chapter promote'`:

```javascript
const allowed = new Set([
  'chapter budget',
  'chapter normalize',
  'chapter promote',
  'chapter wordcount',
  'check budget',
  // ... rest unchanged
]);
```

- [ ] **Step 2: Add new contract test for route dispatch presence**

Append to `tests/runtime-contract.test.cjs` (anywhere in the test list — convention is to add new tests at the end of the file):

```javascript
test('ans-tools.cjs routeChapter dispatches the wordcount subcommand', () => {
  const ansToolsContent = fs.readFileSync(ANS_TOOLS_PATH, 'utf-8');
  assert.match(
    ansToolsContent,
    /case 'wordcount':/,
    'ans-tools.cjs routeChapter must contain a wordcount case so the subcommand reaches lib/chapter.cjs'
  );
  assert.match(
    ansToolsContent,
    /'all'/,
    'parseNamedArgs in routeChapter must include --all in its boolean flags so it is parsed correctly'
  );
});
```

- [ ] **Step 3: Run, verify it passes**

Run: `npm test`
Expected: PASS — all 38 existing contract tests + 9 algorithm tests + 5 wordcount tests + 1 cross-tool + 1 new dispatch test.

- [ ] **Step 4: Commit**

```bash
git add tests/runtime-contract.test.cjs
git commit -m "$(cat <<'EOF'
runtime-contract: 把 chapter wordcount 加入 ans-tools 允许清单

更新 test #4 allowed Set；新增一条 dispatch 测试确保
ans-tools.cjs 的 routeChapter 真正声明了 wordcount case
并把 --all 当布尔旗解析。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Migrate `write-chapter.md` §4.2

**Files:**
- Modify: `ai-novel-studio/workflows/write-chapter.md` (around lines 168–174)
- Modify: `tests/runtime-contract.test.cjs` (add a pinning test BEFORE editing the workflow)

- [ ] **Step 1: Add a failing pinning test**

Append to `tests/runtime-contract.test.cjs`:

```javascript
test('write-chapter workflow invokes chapter wordcount for the budget gate', () => {
  const wf = fs.readFileSync(
    path.join(SUPPORT_ROOT, 'workflows', 'write-chapter.md'),
    'utf-8'
  );
  assert.match(
    wf,
    /node bin\/ans-tools\.cjs chapter wordcount/,
    'write-chapter §4.2 must invoke `node bin/ans-tools.cjs chapter wordcount` so the count comes from the canonical tool, not from chapter budget'
  );
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `node --test --test-name-pattern="write-chapter workflow invokes chapter wordcount" tests/runtime-contract.test.cjs`
Expected: FAIL — workflow does not yet contain `chapter wordcount`.

- [ ] **Step 3: Replace §4.2 in `write-chapter.md`**

Edit `ai-novel-studio/workflows/write-chapter.md`. Locate this block (around lines 168–174):

```bash
### 4.2 字数闸门核查

```bash
node bin/ans-tools.cjs chapter budget ${CHAPTER_NUMBER} --source formal

# 如果超出预算，ans-tools 将拦截。后续可在这里实现自主裁切与重新规划。
```
```

Replace with:

```bash
### 4.2 字数闸门核查

```bash
# 字数从 chapter wordcount 取（reliable prose-only count），闸门逻辑在工作流内显式执行
PROSE_CHARS=$(node bin/ans-tools.cjs chapter wordcount "${CHAPTER_NUMBER}" --source formal --raw)
HARD_CEILING=$(node bin/ans-tools.cjs state get chapter_word_ceiling --raw)
TARGET_WORDS=$(node bin/ans-tools.cjs state get chapter_words --raw)

echo "【字数】${PROSE_CHARS} 字（目标 ${TARGET_WORDS} / 上限 ${HARD_CEILING}）"

if [ "$PROSE_CHARS" -gt "$HARD_CEILING" ]; then
  echo "⚠️  超出硬上限：${PROSE_CHARS} > ${HARD_CEILING}。要求 writer 分割或缩减。"
  # 后续可在这里实现自主裁切与重新规划。
fi
```
```

- [ ] **Step 4: Run the new test, verify it passes**

Run: `node --test --test-name-pattern="write-chapter workflow invokes chapter wordcount" tests/runtime-contract.test.cjs`
Expected: PASS.

- [ ] **Step 5: Run the full test suite**

Run: `npm test`
Expected: PASS — including allowlist check on the new `chapter wordcount` and `state get` invocations (both already in the allowlist).

- [ ] **Step 6: Commit**

```bash
git add ai-novel-studio/workflows/write-chapter.md tests/runtime-contract.test.cjs
git commit -m "$(cat <<'EOF'
write-chapter §4.2: 改用 chapter wordcount + 显式闸门

字数从 chapter wordcount 取（取代 chapter budget 间接读 prose_chars），
闸门比较显式写在 bash 里，gate 逻辑可审计；契约测试钉住该工作流
今后必须含 chapter wordcount 调用。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Migrate `polish.md` (single + batch sections)

**Files:**
- Modify: `ai-novel-studio/workflows/polish.md`
- Modify: `tests/runtime-contract.test.cjs`

- [ ] **Step 1: Add a failing pinning test**

Append to `tests/runtime-contract.test.cjs`:

```javascript
test('polish workflow invokes chapter wordcount for pre/post counts', () => {
  const wf = fs.readFileSync(
    path.join(SUPPORT_ROOT, 'workflows', 'polish.md'),
    'utf-8'
  );
  const matches = wf.match(/node bin\/ans-tools\.cjs chapter wordcount/g) || [];
  assert.ok(
    matches.length >= 2,
    'polish.md must invoke `chapter wordcount` at least twice (pre and post). Found ' + matches.length
  );
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `node --test --test-name-pattern="polish workflow invokes chapter wordcount" tests/runtime-contract.test.cjs`
Expected: FAIL — `Found 0`.

- [ ] **Step 3: Update single-polish section (§3.2)**

Edit `ai-novel-studio/workflows/polish.md`. Locate §3.2 "调用 Editor" (around line 139). Insert a "pre count" block BEFORE the `Task(...)` invocation:

```bash
### 3.2 调用 Editor

```bash
# Pre-polish 字数（润色前）
PRE_CHARS=$(node bin/ans-tools.cjs chapter wordcount "${CHAPTER_NUMBER}" --source formal --raw)
```

```
Task(
  subagent_type: "ans-editor",
  ...
)
```

```bash
# Post-polish 字数（润色后；polished 文件由 editor 产出）
POST_CHARS=$(node bin/ans-tools.cjs chapter wordcount "${CHAPTER_NUMBER}" --source polished --raw)
if [ -n "$PRE_CHARS" ] && [ "$PRE_CHARS" -gt 0 ]; then
  CHANGE_RATE=$(awk "BEGIN { printf \"%.1f\", (($POST_CHARS - $PRE_CHARS) / $PRE_CHARS) * 100 }")
else
  CHANGE_RATE="0.0"
fi
```
```

Then in §3.3 "展示润色结果", replace the `[XXXX]` placeholders in the template:

```
【修改统计】
- 原字数：${PRE_CHARS} 字
- 修改后：${POST_CHARS} 字
- 修改率：${CHANGE_RATE}%
```

- [ ] **Step 4: Update batch-polish section (§4.1, §4.2)**

In §4.1 "逐章润色", change the `for` loop body so it captures pre/post counts per chapter:

```bash
### 4.1 逐章润色

```bash
RESULTS=()
TOTAL_PRE=0
TOTAL_POST=0
for chapter in $CHAPTER_LIST; do
  PRE=$(node bin/ans-tools.cjs chapter wordcount "$chapter" --source formal --raw 2>/dev/null || echo 0)
  TOTAL_PRE=$((TOTAL_PRE + PRE))

  # 调用 editor，传递完整的上下文
  result=$(Task(
    subagent_type: "ans-editor",
    objective: "润色第 ${chapter} 章",
    files_to_read: [
      "PROJECT.md",
      "CHARACTERS.md",
      "chapters/chapter-${chapter}.md",
      "$ANS_WRITING_GUIDE",
      "$ANS_REVIEW_TEMPLATE",
      "$ANS_CHAPTER_TEMPLATE"
    ],
    input: {
      chapter_number: chapter,
      mode: MODE
    }
  ))

  POST=$(node bin/ans-tools.cjs chapter wordcount "$chapter" --source polished --raw 2>/dev/null || echo "$PRE")
  TOTAL_POST=$((TOTAL_POST + POST))

  RESULTS+=("$chapter|$PRE|$POST")
done
```

In §4.2 "汇总报告", replace the hard-coded sample row data with renderings driven by `RESULTS` (which now carries pipe-separated `chapter|pre|post` per row):

Replace:
```
【总体统计】
- 润色章节：${COUNT} 章
- 总修改：${TOTAL_CHANGES} 处
- 平均修改率：${AVG_RATE}%
```

with:
```
【总体统计】
- 润色章节：${#RESULTS[@]} 章
- 总字数：${TOTAL_PRE} → ${TOTAL_POST}
- 整体修改率：$(awk "BEGIN { if ($TOTAL_PRE > 0) printf \"%.1f\", (($TOTAL_POST - $TOTAL_PRE) / $TOTAL_PRE) * 100; else printf \"0.0\" }")%
```

And keep the per-chapter table template — the workflow's downstream agent text is responsible for filling its rows from `RESULTS`. (The placeholder rows in the original were illustrative; we leave the template unchanged but the data now comes from real counts.)

- [ ] **Step 5: Run the new test, verify it passes**

Run: `node --test --test-name-pattern="polish workflow invokes chapter wordcount" tests/runtime-contract.test.cjs`
Expected: PASS — at least 4 invocations total (2 in single, 2 in batch).

- [ ] **Step 6: Run the full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add ai-novel-studio/workflows/polish.md tests/runtime-contract.test.cjs
git commit -m "$(cat <<'EOF'
polish: 单章/批量都接入 chapter wordcount 取真实 pre/post 字数

editor agent 不再靠目测填 [XXXX]；单章 §3 调用 chapter wordcount
formal/polished 各一次，批量 §4 在 for 循环内对每章抓 pre/post，
汇总段直接给真实总字数与修改率。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Migrate `progress.md`

**Files:**
- Modify: `ai-novel-studio/workflows/progress.md`
- Modify: `tests/runtime-contract.test.cjs`

- [ ] **Step 1: Add a failing pinning test**

Append to `tests/runtime-contract.test.cjs`:

```javascript
test('progress workflow uses chapter wordcount for total_words display', () => {
  const wf = fs.readFileSync(
    path.join(SUPPORT_ROOT, 'workflows', 'progress.md'),
    'utf-8'
  );
  assert.match(
    wf,
    /node bin\/ans-tools\.cjs chapter wordcount --all/,
    'progress.md must compute its dashboard total_words via `chapter wordcount --all` rather than relying on init progress\'s naive value'
  );
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `node --test --test-name-pattern="progress workflow uses" tests/runtime-contract.test.cjs`
Expected: FAIL.

- [ ] **Step 3: Update `progress.md`**

Edit `ai-novel-studio/workflows/progress.md`. Replace the `<step name="init">` block (lines 7–13):

```
<step name="init">
通过系统工具注入项目全貌上下文，读取为统一上下文 JSON：
```bash
node bin/ans-tools.cjs init progress --raw
```
若返回报错或者 `project_exists` 为 false，告知用户未检测到有效项目（建议 `/ans:new-project` 或 `/ans:map-base`），并终止。
</step>
```

with:

```
<step name="init">
通过系统工具注入项目全貌上下文，读取为统一上下文 JSON：
```bash
node bin/ans-tools.cjs init progress --raw
```
若返回报错或者 `project_exists` 为 false，告知用户未检测到有效项目（建议 `/ans:new-project` 或 `/ans:map-base`），并终止。

仪表盘上的 `total_words` 字段不使用 init progress 返回的 naive 计数（包含 frontmatter/标题/markdown 语法），改用 chapter wordcount 重新计算可靠的 prose 字数：

```bash
TOTAL_WORDS=$(node bin/ans-tools.cjs chapter wordcount --all --source formal --pick aggregate.total_chars --raw 2>/dev/null || echo 0)
```

后续模板里的 `[total_words]` 占位符使用这个变量。
</step>
```

- [ ] **Step 4: Run, verify it passes**

Run: `node --test --test-name-pattern="progress workflow uses" tests/runtime-contract.test.cjs`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add ai-novel-studio/workflows/progress.md tests/runtime-contract.test.cjs
git commit -m "$(cat <<'EOF'
progress: total_words 改由 chapter wordcount --all 重新计算

init progress 返回的 total_words 仍是 naive readText.length 累加
（含 frontmatter / 标题 / markdown 语法），只是为了 STATE.md 兼容。
仪表盘的展示路径改用可靠的 chapter wordcount aggregate.total_chars。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Migrate `manager.md`

**Files:**
- Modify: `ai-novel-studio/workflows/manager.md`
- Modify: `tests/runtime-contract.test.cjs`

- [ ] **Step 1: Add a failing pinning test**

Append to `tests/runtime-contract.test.cjs`:

```javascript
test('manager workflow uses chapter wordcount for total_words display', () => {
  const wf = fs.readFileSync(
    path.join(SUPPORT_ROOT, 'workflows', 'manager.md'),
    'utf-8'
  );
  assert.match(
    wf,
    /node bin\/ans-tools\.cjs chapter wordcount --all/,
    'manager.md must compute its dashboard total_words via `chapter wordcount --all` rather than relying on init manager\'s naive value'
  );
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `node --test --test-name-pattern="manager workflow uses" tests/runtime-contract.test.cjs`
Expected: FAIL.

- [ ] **Step 3: Update `manager.md`**

Edit `ai-novel-studio/workflows/manager.md`. In `<step name="initialize">` (around lines 12–31), append after the `if [[ -z "$INIT" ...` block:

```bash
<step name="initialize">
通过 ans-tools.cjs 获取完整项目状态（替代 grep 拼凑）：

```bash
INIT=$(node bin/ans-tools.cjs init manager 2>/dev/null) || INIT=""

if [[ -z "$INIT" || "$INIT" == *"Error"* ]]; then
  echo "未检测到结构化小说项目。空目录先运行 /ans:new-project；已有资料先运行 /ans:map-base"
  exit 0
fi

# total_words 的展示值用可靠的 chapter wordcount 重新计算（不取 init 的 naive 累加）
TOTAL_WORDS=$(node bin/ans-tools.cjs chapter wordcount --all --source formal --pick aggregate.total_chars --raw 2>/dev/null || echo 0)
```

从 `$INIT` JSON 中提取所有面板数据：
- `title`, `story_format`, `status`, `current_arc`
- `total_chapters`, `total_outlines`, `total_reviews`
- `completed_count`, `total_count`
- `chapter_grid[]` — 每章的 outline/chapter/review 状态
- `recommended_actions[]` — 推荐动作列表
- `all_complete` — 是否全部完成

`total_words` 不再从 `$INIT` 取，改用上面计算出的 `$TOTAL_WORDS`。
</step>
```

(Note the prose at end of step changed: explicit instruction to use `$TOTAL_WORDS` instead of `INIT.total_words`.)

In the `<step name="dashboard">` template, change `总字数 {total_words}` to `总字数 ${TOTAL_WORDS}` so it picks up the bash variable, not the JSON field.

- [ ] **Step 4: Run, verify it passes**

Run: `node --test --test-name-pattern="manager workflow uses" tests/runtime-contract.test.cjs`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add ai-novel-studio/workflows/manager.md tests/runtime-contract.test.cjs
git commit -m "$(cat <<'EOF'
manager: total_words 改由 chapter wordcount --all 重新计算

与 progress 同源处理：init manager 返回的 naive total_words 留作
STATE.md 兼容字段，仪表盘只显示 chapter wordcount aggregate.total_chars。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Final smoke verification + sanity check

**Files:** _(none — verification only)_

- [ ] **Step 1: Run the full test suite one more time**

Run: `npm test`
Expected: All 38 prior contract tests + 9 chapter-normalize tests + 6 wordcount tests + 4 new contract tests for the migrated workflows + 1 new dispatch test = original counts + 11 new passing tests.

If anything fails, fix before continuing.

- [ ] **Step 2: Run the spec's manual verification commands**

Build a temp project with three chapters and a missing one:

```bash
TMPROOT=$(mktemp -d)
mkdir -p "$TMPROOT/chapters"
cat > "$TMPROOT/PROJECT.md" <<'EOF'
---
chapter_words: 3000
chapter_word_ceiling: 4000
---
EOF
for n in 1 2 4; do
  cat > "$TMPROOT/chapters/chapter-$n.md" <<EOF
---
chapter: $n
title: 第${n}章
---

# 第${n}章

## 正文

第${n}章的正文内容，大约二十个字符的样子。
EOF
done

# Single chapter
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount 1 --source formal --root "$TMPROOT"

# Single chapter raw
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount 1 --source formal --raw --root "$TMPROOT"

# Range that includes a missing chapter (3)
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount 1-4 --source formal --root "$TMPROOT"

# All chapters
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount --all --source formal --root "$TMPROOT"

# Pick aggregate.total_chars raw
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount --all --source formal --pick aggregate.total_chars --raw --root "$TMPROOT"

# Missing single chapter (must error)
node ai-novel-studio/bin/ans-tools.cjs chapter wordcount 99 --source formal --root "$TMPROOT" 2>&1 | grep -q "not found" && echo "OK: single-form errors on missing"

rm -rf "$TMPROOT"
```

Expected output shape per the spec's "Output schema" section. The `OK: single-form errors on missing` line confirms the gate-style behavior.

- [ ] **Step 3: Verify nothing under "Untouched" was changed**

Run:

```bash
git diff --stat HEAD~11 -- ai-novel-studio/bin/lib/chapter_budget.cjs ai-novel-studio/bin/lib/novel_state.cjs ai-novel-studio/bin/map_base.cjs ai-novel-studio/workflows/autonomous.md
```

Expected: empty output. If any of these four files have changes, that violates the design's "Untouched" contract — investigate and revert.

- [ ] **Step 4: Final commit (if any cleanup is needed)**

If the verification surfaced a fix, commit it. Otherwise no-op.

```bash
git status
# If clean: nothing to commit. If changes exist, fix the underlying issue and commit.
```

- [ ] **Step 5: Report summary**

State to the user:
- New files: `ai-novel-studio/bin/lib/wordcount.cjs`, `tests/wordcount.test.cjs`.
- Modified files: `ai-novel-studio/bin/ans-tools.cjs`, `ai-novel-studio/bin/lib/chapter.cjs`, `tests/runtime-contract.test.cjs`, four workflows.
- Untouched (per contract): `chapter_budget.cjs`, `novel_state.cjs`, `map_base.cjs`, `autonomous.md`.
- Test counts before / after.
- The new subcommand's invocation forms.

---

## Self-review notes

(I ran this against the spec on 2026-05-02 — gaps fixed inline.)

- **Spec coverage:** Every section of the design doc maps to at least one task. CLI surface → Task 5; Output schema → Tasks 1–5; Workflow migration (4 workflows) → Tasks 7–10; Contract tests → Tasks 6 + 7–10 pinning tests; Algorithm tests → Tasks 1–3 + Task 4 cross-tool; Manual verification → Task 11.
- **Placeholders:** none. Each step has the actual code or shell command an engineer needs to type.
- **Type/method consistency:** `countSingle`, `countBatch`, `resolveScope`, `cmdChapterWordcount`, `COUNT_BASIS` are spelled the same way in every task that mentions them. The `{ positional, all }` shape is identical between Task 3 and Task 5. The output schema's keys (`scope`, `source`, `requested`, `chapters`, `missing`, `aggregate`) are identical between Task 5 and the spec.
- **Risks:**
  - Tests in Task 5 (smoke) and Task 11 (final smoke) build their fixtures in `mktemp` directories outside the repo so `findProjectRoot` correctly walks up to the temp dir's PROJECT.md. The `--root` flag is passed explicitly.
  - The `core.output(result, raw, rawValue)` call in `cmdChapterWordcount` uses the existing 3-arg form (`raw=true, rawValue=...`) which `core.cjs:17` supports — verified against the source.
