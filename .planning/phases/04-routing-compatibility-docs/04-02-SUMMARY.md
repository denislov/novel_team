---
phase: 04-routing-compatibility-docs
plan: 02
subsystem: runtime
tags: [codex, agents, installer, workflow-contract, node-test]
requires:
  - phase: 04-01
    provides: format-aware routing baseline and Phase 4 compatibility groundwork
provides:
  - fail-closed Codex delegation rules for workflow-declared named agents
  - command-specific required-agent contracts in generated public Codex skills
  - Codex execution contract regression tests and README repair-path guidance
affects: [codex, installer, documentation, testing]
tech-stack:
  added: []
  patterns: [workflow execution policy metadata, generated required-agent contracts, Codex contract tests]
key-files:
  created: [.planning/phases/04-routing-compatibility-docs/04-02-SUMMARY.md, tests/codex-execution-contract.test.cjs, tests/codex-routing-contract.test.cjs, tests/readme-contract.test.cjs]
  modified: [bin/install.js, plugins/novel/commands/_codex-conventions.md, plugins/novel/README.md, plugins/novel/skills/novel-command-center/SKILL.md, plugins/novel/skills/novel-writing/SKILL.md, tests/install.test.cjs, tests/agent-definition.test.cjs]
key-decisions:
  - "Codex installation correctness and execution correctness are separate release gates."
  - "Public $novel-* skills remain the supported safe path for Codex execution."
  - "Workflow-declared SpawnAgent stages fail closed instead of silently inlining."
patterns-established:
  - "Pattern: workflows that spawn named agents carry codex_execution_policy metadata."
  - "Pattern: generated Codex skills inherit machine-readable required-agent contracts from workflow source."
requirements-completed: [FLOW-03, QUAL-01, QUAL-02, QUAL-03]
duration: 6h 1m
completed: 2026-04-08
---

# Phase 4 / Plan 02 Summary

**Fail-closed Codex named-agent delegation with generated required-agent contracts and regression-tested repair guidance**

## Performance

- **Duration:** 6h 1m
- **Started:** 2026-04-08T15:25:22+08:00
- **Completed:** 2026-04-08T21:26:35+08:00
- **Tasks:** 3
- **Files modified:** 20

## Accomplishments

- Hardened the Codex compatibility layer so public Novel workflows that declare `SpawnAgent(...)` stages now reject silent inline fallback.
- Extended the installer to derive exact named-agent requirements from workflow source and inject them into generated public Codex skills.
- Added source-level and converted-surface regression coverage for execution policy, public routing, and README repair-path guarantees.

## Task Commits

Each task was committed atomically:

1. **Task 1: Fail closed for workflow-declared named agents in Codex** - `ebf6b01` (`fix`)
2. **Task 2: Document the Codex runtime reliability contract in internal skills and README** - `8256a1b` (`docs`)
3. **Task 3: Add converted-surface regression tests for mandatory agent contracts** - `55ee320` (`test`)

## Files Created/Modified

- `bin/install.js` - derives workflow execution policy and emits required-agent contracts into generated Codex skills
- `plugins/novel/commands/_codex-conventions.md` - removes permissive inline fallback and adds validation guidance
- `plugins/novel/README.md` - explains installation correctness vs execution correctness and the Codex repair path
- `plugins/novel/skills/novel-command-center/SKILL.md` - keeps explicit public `$novel-*` skills as the supported safe path
- `plugins/novel/skills/novel-writing/SKILL.md` - reinforces that declared delegated stages must not be absorbed inline
- `plugins/novel/workflows/*.md` (agent-heavy workflows) - add `codex_execution_policy` metadata blocks
- `tests/install.test.cjs` - strengthens installed-surface assertions for required-agent contracts
- `tests/agent-definition.test.cjs` - requires explicit execution-policy metadata for workflows with named agents
- `tests/codex-execution-contract.test.cjs` - verifies generated public skills carry required-agent contracts
- `tests/codex-routing-contract.test.cjs` - verifies the explicit public `$novel-*` safe path remains intact
- `tests/readme-contract.test.cjs` - verifies README installation-vs-execution wording and repair guidance

## Decisions Made

- Keep the explicit public `$novel-*` skills as the supported Codex entrypoint path instead of exposing a new public router surface.
- Surface both `novel-tool ...` and `node bin/install.js ...` validation commands so the repair path works for installed CLI users and source-checkout users.
- Treat workflow source as the authority for execution policy by adding a small `codex_execution_policy` block alongside `<available_agent_types>`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added machine-readable execution policy metadata to all named-agent workflows**
- **Found during:** Task 1 (fail-closed installer contract generation)
- **Issue:** The plan required stronger `tests/agent-definition.test.cjs` coverage, but the workflow source only exposed named agents via prose and `<available_agent_types>`, not via a parseable Codex execution-policy contract.
- **Fix:** Added a consistent `<codex_execution_policy>` block with `delegation: required_named_agents`, `public_entrypoint: explicit_public_skills`, and `allow_inline_fallback: false` to every workflow that declares named `SpawnAgent(...)` stages.
- **Files modified:** `plugins/novel/workflows/autonomous.md`, `plugins/novel/workflows/character.md`, `plugins/novel/workflows/new-project.md`, `plugins/novel/workflows/plan-arc.md`, `plugins/novel/workflows/plan-batch.md`, `plugins/novel/workflows/polish.md`, `plugins/novel/workflows/quick-draft.md`, `plugins/novel/workflows/research.md`, `plugins/novel/workflows/review.md`, `plugins/novel/workflows/write-chapter.md`
- **Verification:** `node --test tests/agent-definition.test.cjs`
- **Committed in:** `ebf6b01`

---

**Total deviations:** 1 auto-fixed (Rule 2: Missing Critical)
**Impact on plan:** Necessary to make the converted Codex contract testable from source. No scope creep beyond the execution-reliability hardening goal.

## Issues Encountered

- Command execution-context workflow references such as `@workflows/write-chapter.md` resolve relative to the plugin root, not the `commands/` directory. The installer path resolver was updated accordingly so required-agent contracts can be generated from real workflow files.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 now has both the format-aware routing baseline (`04-01`) and the Codex execution-reliability hardening layer (`04-02`).
- The remaining phase-level steps are verification and tracking updates:
  - refresh `04-VERIFICATION.md` for execution
  - mark Phase 4 complete in roadmap/state/requirements

---
*Phase: 04-routing-compatibility-docs*
*Completed: 2026-04-08*
