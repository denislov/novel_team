---
phase: 04
slug: routing-compatibility-docs
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-08
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node built-in `node:test` |
| **Config file** | none — repo uses direct `node --test` entrypoints |
| **Quick run command** | `node --test tests/install.test.cjs tests/agent-definition.test.cjs tests/codex-execution-contract.test.cjs tests/codex-routing-contract.test.cjs tests/readme-contract.test.cjs` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node --test tests/install.test.cjs tests/agent-definition.test.cjs tests/codex-execution-contract.test.cjs tests/codex-routing-contract.test.cjs tests/readme-contract.test.cjs` once the new 04-02 tests exist; before that, use the current install/agent-definition subset during incremental work
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | FLOW-02 | — | `novel_state.cjs` branches on `story_format` / `planning_unit` while keeping long-form fallback behavior intact | unit | `node --test tests/novel-state.test.cjs` | ✅ | ⬜ pending |
| 04-01-02 | 01 | 1 | FLOW-02 | — | `progress.md` and `next.md` present format-aware routing without regressing long-form messaging | static | `node --test tests/install.test.cjs` | ✅ | ⬜ pending |
| 04-01-03 | 01 | 1 | QUAL-01 / QUAL-02 / QUAL-03 | — | tests and docs cover long-form, short-story, and collection routing behavior | regression | `npm test` | ✅ | ⬜ pending |
| 04-02-01 | 02 | 2 | FLOW-03 / QUAL-01 / QUAL-02 | T-04-02-01 / T-04-02-02 / T-04-02-03 | public Codex skills fail closed for workflow-declared named-agent stages and surface validation or repair guidance | unit / static | `node --test tests/install.test.cjs tests/agent-definition.test.cjs tests/codex-execution-contract.test.cjs` | ❌ planned in 04-02 | ⬜ pending |
| 04-02-02 | 02 | 2 | FLOW-03 / QUAL-03 | T-04-02-03 | internal Codex skills and README explain the supported public entrypoints, execution reliability contract, and repair path | docs / static | `node --test tests/readme-contract.test.cjs tests/codex-routing-contract.test.cjs` | ❌ planned in 04-02 | ⬜ pending |
| 04-02-03 | 02 | 2 | QUAL-01 / QUAL-02 | T-04-02-01 / T-04-02-02 | converted-surface tests reject permissive inline fallback and assert exact required named-agent contracts | regression | `node --test tests/install.test.cjs tests/agent-definition.test.cjs tests/codex-execution-contract.test.cjs tests/codex-routing-contract.test.cjs tests/readme-contract.test.cjs` | ❌ planned in 04-02 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Planned Test Additions

- [ ] `tests/codex-execution-contract.test.cjs` — owned by `04-02` Task 3; asserts generated public Codex skills and support files require named agents and reject permissive inline fallback
- [ ] `tests/codex-routing-contract.test.cjs` — owned by `04-02` Task 3; asserts the supported Codex public entrypoint path and public-surface routing contract
- [ ] `tests/readme-contract.test.cjs` — owned by `04-02` Task 3; asserts README distinguishes installation success from runtime execution correctness and documents the repair path
- [ ] Extend `tests/agent-definition.test.cjs` — owned by `04-02` Task 3; requires execution-policy metadata or equivalent validation for workflows that declare named agents

*Existing framework coverage is sufficient; no separate Wave 0 bootstrap plan is required because the missing files above are owned by concrete 04-02 tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| A live Codex run of `$novel-write-chapter` or `$novel-review` announces and uses the expected named agents before producing artifacts | FLOW-03 / QUAL-02 | Prompt-following at runtime cannot be fully proven by static conversion tests alone | Install Novel into a Codex config dir, invoke a representative public `$novel-*` skill, confirm the run announces the delegated stages and does not silently inline them |
| Documentation and safe-path wording lead a user to the explicit public `$novel-*` skills instead of relying on an untested public router surface | QUAL-03 | User guidance and runtime ergonomics need a human read for ambiguity | Read the README and internal Codex skill wording after execution changes, then verify the supported entrypoint path is explicit and unambiguous |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or planned test ownership inside 04-02
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] No separate Wave 0 bootstrap is required; all missing references are owned by 04-02 tasks
- [x] No watch-mode flags
- [x] Feedback latency < 5s for quick checks
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-08
