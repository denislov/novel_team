---
phase: 04-routing-compatibility-docs
verified: 2026-04-08T13:34:34Z
status: human_needed
score: 5/5 must-haves verified
human_verification:
  - test: "Run a public Codex skill that declares named-agent delegation"
    expected: "`$novel-write-chapter` or `$novel-review` uses the declared named agents, or stops with `validate --codex --global` repair guidance before any delegated stage is inlined"
    why_human: "The generated skills, config, and repo tests prove the contract text and installed surface, but actual Codex named-agent execution is external to this repository and was not executed here"
---

# Phase 4: Routing, Compatibility, Tests, Docs Verification Report

**Phase Goal:** Make the new planning modes production-safe. Update routing, compatibility, tests, and docs.
**Verified:** 2026-04-08T13:34:34Z
**Status:** human_needed
**Re-verification:** No — initial execution verification replacing the earlier planning-only report

The local `gsd-tools` roadmap parser returned no structured phase JSON in this workspace, so roadmap truths were derived directly from the Phase 4 Goal and Exit Criteria in `ROADMAP.md`, then merged with `04-01-PLAN.md` and `04-02-PLAN.md` must-haves.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Long-form projects keep the compatibility baseline | ✓ VERIFIED | `plugins/novel/scripts/novel_state.cjs:168-171` defaults to `long_form` and `chapter`; `plugins/novel/scripts/novel_state.cjs:277-296` preserves the chapter/outline/review buffer logic; `tests/novel-state.test.cjs:97-104` asserts `plan-batch 1-10`; direct spot-check returned `plan-batch 1-10` for a fresh long-form project. |
| 2 | Short-story and collection projects receive distinct format-aware routing | ✓ VERIFIED | `plugins/novel/scripts/novel_state.cjs:237-276` branches separately for `short_story` and `story_collection`; `tests/novel-state.test.cjs:106-138` covers both modes; direct spot-checks returned `plan-batch 1-1` with short-story and collection-specific reasons. |
| 3 | `progress` and `next` present the format-aware model instead of assuming chapter-only flow | ✓ VERIFIED | `plugins/novel/workflows/progress.md:38-52` reads `story_format`, `planning_unit`, and `recommended_*` from `novel_state.cjs`; `plugins/novel/workflows/progress.md:103-109` explains the mode-aware model; `plugins/novel/workflows/next.md:51-81` shows the same fields and explicitly distinguishes `long_form`, `short_story`, and `story_collection`. |
| 4 | Codex public Novel skills fail closed for workflow-declared named-agent stages and expose a repair path | ✓ VERIFIED | `plugins/novel/commands/_codex-conventions.md:17-29` removes permissive inline fallback and routes failures to `validate --codex --global`; agent-heavy workflows such as `plugins/novel/workflows/write-chapter.md:9-21`, `plugins/novel/workflows/new-project.md:10-20`, `plugins/novel/workflows/review.md:9-18`, `plugins/novel/workflows/plan-batch.md:9-18`, and `plugins/novel/workflows/autonomous.md:9-20` declare `<codex_execution_policy>` metadata; `bin/install.js:291-331`, `bin/install.js:405-423`, and `bin/install.js:608-618` propagate that metadata into generated public skills; direct install spot-check confirmed the required-agent blocks, no-inline text, and validation guidance. |
| 5 | Tests and docs cover routing, the public safe path, and the Codex repair contract | ✓ VERIFIED | `plugins/novel/README.md:36-42` documents format-aware recommendations; `plugins/novel/README.md:98-121` documents installation-vs-execution correctness and the repair path; `plugins/novel/skills/novel-command-center/SKILL.md:48-52` and `plugins/novel/skills/novel-writing/SKILL.md:48-54` reinforce the same contract; `tests/install.test.cjs:81-161`, `tests/agent-definition.test.cjs:61-106`, `tests/codex-execution-contract.test.cjs:27-49`, `tests/codex-routing-contract.test.cjs:27-44`, and `tests/readme-contract.test.cjs:10-18` lock the surface down; `npm test` passed. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `plugins/novel/scripts/novel_state.cjs` | Format-aware recommendation engine with long-form fallback baseline | ✓ VERIFIED | Implements `story_format` / `planning_unit` loading and separate routing branches for long-form, short-story, and collection projects. |
| `plugins/novel/workflows/progress.md` | Format-aware reporting surface | ✓ VERIFIED | Reads shared state from `novel_state.cjs` and renders recommendation context using `story_format` and `planning_unit`. |
| `plugins/novel/workflows/next.md` | Format-aware auto-routing surface | ✓ VERIFIED | Reads the shared state contract and explains why routing differs by story shape. |
| `plugins/novel/commands/_codex-conventions.md` | Fail-closed Codex named-agent execution rule | ✓ VERIFIED | Requires named-agent delegation for public workflows, forbids inline replacement of declared stages, and points to validation commands. |
| `bin/install.js` | Generated public Codex skill contracts and install validation | ✓ VERIFIED | Extracts workflow agent metadata, emits required-agent contract text into generated `$novel-*` skills, writes agent TOML/config, and validates the installed surface. |
| `plugins/novel/workflows/write-chapter.md` and other agent-heavy workflows | Explicit execution-policy metadata | ✓ VERIFIED | Workflow files with named agents now declare `<codex_execution_policy>` alongside `<available_agent_types>`. |
| `plugins/novel/README.md` | User-facing routing, compatibility, and repair docs | ✓ VERIFIED | Explains supported story shapes, format-aware recommendations, explicit Codex public safe path, and install/repair commands. |
| `plugins/novel/skills/novel-command-center/SKILL.md` and `plugins/novel/skills/novel-writing/SKILL.md` | Internal Codex guidance aligned to the public contract | ✓ VERIFIED | Both skills direct Codex to explicit `$novel-*` entrypoints and forbid absorbing declared delegated stages inline. |
| `tests/novel-state.test.cjs` | Routing regression tests | ✓ VERIFIED | Covers long-form compatibility baseline, short-story routing, collection routing, and state refresh behavior. |
| `tests/install.test.cjs`, `tests/agent-definition.test.cjs`, `tests/codex-execution-contract.test.cjs`, `tests/codex-routing-contract.test.cjs`, `tests/readme-contract.test.cjs` | Install/runtime/docs contract tests | ✓ VERIFIED | Cover generated skill text, workflow metadata, public safe path, and README repair guidance. |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `plugins/novel/workflows/progress.md` | `plugins/novel/scripts/novel_state.cjs` | `node scripts/novel_state.cjs stats --field ...` | ✓ WIRED | `progress.md` treats `novel_state.cjs` as the source of truth for counters, format, and next-step recommendation. |
| `plugins/novel/workflows/next.md` | `plugins/novel/scripts/novel_state.cjs` | `node scripts/novel_state.cjs stats --field ...` | ✓ WIRED | `next.md` consumes the same shared state contract before routing to the next command. |
| Agent-heavy workflow files | `bin/install.js` | `extractPrimaryWorkflowPath()` + `extractWorkflowAgentNames()` + `buildRequiredAgentContractBlock()` | ✓ WIRED | Workflow metadata is parsed from source files and converted into generated required-agent contracts. |
| `bin/install.js` | installed public `$novel-*` skills | `installCodexRuntime()` | ✓ WIRED | Public Codex skills are generated from command sources and written to `skills/<novel-*>/SKILL.md` during install. |
| README/internal skills | Codex repair path | `validate --codex --global` guidance | ✓ WIRED | Docs and internal skills consistently point users to the same validation flow when named-agent execution drifts. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `plugins/novel/scripts/novel_state.cjs` | `recommended_command`, `recommended_args`, `recommended_reason` | `PROJECT.md`, `STATE.md`, `ROADMAP.md`, and real filesystem state under `chapters/` and `reviews/` | Yes | ✓ FLOWING |
| `plugins/novel/workflows/progress.md` | `STORY_FORMAT`, `PLANNING_UNIT`, `RECOMMENDED_*` | `node scripts/novel_state.cjs stats` | Yes | ✓ FLOWING |
| `plugins/novel/workflows/next.md` | `STORY_FORMAT`, `PLANNING_UNIT`, `RECOMMENDED_*` | `node scripts/novel_state.cjs stats` | Yes | ✓ FLOWING |
| `bin/install.js` | `requiredAgentContract` | Workflow `execution_context` -> workflow file -> `<available_agent_types>`, `SpawnAgent(...)`, `<codex_execution_policy>` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| Long-form compatibility baseline | `node - <<'NODE' ... computeStats(long_form) ... NODE` | Returned `recommended_command: "plan-batch"` and `recommended_args: "1-10"` | ✓ PASS |
| Short-story routing | `node -e "..."` using `computeStats()` on a fresh `short_story` temp project | Returned `plan-batch 1-1` with short-story-specific reason text | ✓ PASS |
| Story-collection routing | `node -e "..."` using `computeStats()` on a fresh `story_collection` temp project | Returned `plan-batch 1-1` with collection-specific reason text | ✓ PASS |
| Generated Codex skill contract | `node - <<'NODE' ... installRuntime({ runtime: 'codex' }) ... NODE` | Confirmed required-agent block, named agents, no-inline text, validation guidance, and removal of the old permissive fallback sentence | ✓ PASS |
| New Codex contract tests | `node --test tests/install.test.cjs tests/agent-definition.test.cjs tests/codex-execution-contract.test.cjs tests/codex-routing-contract.test.cjs tests/readme-contract.test.cjs` | 5/5 tests passed | ✓ PASS |
| Full regression suite | `npm test` | 10/10 tests passed | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| `FLOW-02` | `04-01` | Plan-arc / plan-batch / next-step routing uses the selected format when recommending next actions | ✓ SATISFIED | `novel_state.cjs` branches on `story_format`; `progress.md` and `next.md` expose that contract; `tests/novel-state.test.cjs` covers short-story and collection routing. |
| `FLOW-03` | `04-01`, `04-02` | Existing long-form behavior remains stable for current users | ✓ SATISFIED | Long-form remains the default fallback path in `novel_state.cjs`; tests assert the `plan-batch 1-10` baseline; Codex hardening preserves the explicit public skill path rather than replacing long-form flow. |
| `QUAL-01` | `04-01`, `04-02` | Existing tests continue to pass after the new planning modes are introduced | ✓ SATISFIED | `npm test` passed with all 10 test files green. |
| `QUAL-02` | `04-01`, `04-02` | New tests cover format-specific planning decisions and template outputs | ✓ SATISFIED | `tests/novel-state.test.cjs` covers routing decisions; `tests/install.test.cjs` checks installed artifacts; new Codex contract tests cover generated skills and safe-path behavior. |
| `QUAL-03` | `04-01`, `04-02` | Documentation explains when to use each project format and what structure it generates | ✓ SATISFIED | `README.md` documents supported story shapes, planning artifacts, format-aware recommendations, and the Codex repair path; internal skills echo the execution contract. |

No orphaned Phase 4 requirements were found: every Phase 4 requirement in `REQUIREMENTS.md` is claimed by at least one Phase 4 plan.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| — | — | No blocker or warning-level anti-patterns found in the phase-owned behavior | ℹ️ Info | Grep hits on `TODO_COUNT` and `[XXXX]` were variable/example-output text, not unimplemented routing, generated-skill, or test logic. |

### Human Verification Required

### 1. Live Codex Named-Agent Delegation

**Test:** Install Novel into a real Codex config, then invoke a public skill such as `$novel-write-chapter --next` or `$novel-review`.
**Expected:** Codex uses the declared named agents (`novel-planner`, `novel-writer`, `novel-editor`, `novel-verifier`, or `novel-verifier` for review-only flow). If named-agent execution cannot be guaranteed, Codex should stop and surface `novel-tool validate --codex --global` or `node bin/install.js validate --codex --global` before continuing.
**Why human:** The repository proves generation, configuration, and wording. It does not execute the external Codex runtime itself, so end-to-end named-agent delegation still requires a live run.

### Gaps Summary

No codebase gaps were found against the Phase 4 contract. All execution-time must-haves are present, substantive, wired, data-backed, documented, and covered by passing tests.

The only remaining uncertainty is the external Codex runtime itself, so the overall status is `human_needed` rather than `passed`.

---

_Verified: 2026-04-08T13:34:34Z_
_Verifier: Claude (gsd-verifier)_
