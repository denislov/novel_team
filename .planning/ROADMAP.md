# Roadmap: Novel

**Created:** 2026-04-07
**Project:** format-aware fiction planning for long-form, short story, and short-story collection workflows

## Phase Overview

| Phase | Goal | Requirements | Notes |
|------|------|--------------|------|
| 1 | Introduce explicit story format model and initialization contract | FORMAT-01, FORMAT-02, FORMAT-03, FLOW-01 | Establish source of truth before template/workflow changes |
| 2 | Make templates and planning artifacts format-aware | PLAN-01, PLAN-02, TMPL-01, TMPL-02 | Ensure generated files reflect story scale |
| 3 | Add collection-aware planning and growth model | PLAN-03, PLAN-04, TMPL-03 | Support many short stories growing into a collection |
| 4 | Update routing, compatibility, tests, and docs | FLOW-02, FLOW-03, QUAL-01, QUAL-02, QUAL-03 | Stabilize behavior and protect existing long-form users |

## Phase 1 — Story Format Model

**Goal:** Establish an explicit planning model for story length/format so the rest of the product has a stable contract.

### Scope
- Define supported format taxonomy:
  - long-form novel
  - single short story
  - short-story collection
- Decide what metadata belongs in project memory/config vs templates
- Update initialization logic/questions to capture:
  - format
  - target total length
  - expected unit of planning (chapter / story / collection)

### Exit Criteria
- Format choice is represented in config and project memory
- Initialization can distinguish the three project modes cleanly
- Long-form existing path remains the default-compatible baseline

## Phase 2 — Format-Aware Templates

**Goal:** Make generated planning artifacts adapt to the selected story format.

### Scope
- Update relevant templates so they can represent:
  - long-form chapter/arc progression
  - short-story compact structure
  - collection-level plus per-story structure
- Rework `PROJECT.md`, `ROADMAP.md`, and `STATE.md` expectations to avoid long-form-only assumptions
- Decide whether some templates become conditional or gain mode-specific sections

### Exit Criteria
- Short stories no longer inherit unnecessary long-serialization structure
- Long-form projects still receive strong arc/chapter scaffolding
- Project memory stays understandable across all three modes

## Phase 3 — Collection Growth Model

**Goal:** Support short-story collections as a first-class planning mode.

### Scope
- Model the collection as an umbrella project that grows by story
- Define the planning unit for collection mode:
  - story as primary unit
  - optional internal chapter support per story if needed
- Decide how collection roadmap/state track:
  - completed stories
  - active story
  - future story queue
  - total collection growth

### Exit Criteria
- A collection can start with one story and grow safely
- Each added story extends the project without corrupting earlier planning
- Collection progress is visible in state/memory files

## Phase 4 — Workflow, Tests, Docs

**Goal:** Make the new planning modes production-safe.

### Scope
- Update routing/next-step recommendations to use format-specific logic
- Add regression tests for format-aware initialization and planning
- Audit existing long-form workflows for compatibility risks
- Update docs to explain:
  - when to use each format
  - what artifacts to expect
  - how collections grow over time

### Exit Criteria
- Existing long-form users are not regressed
- Tests cover mode-specific behavior
- Docs explain the new model clearly

## Risks

| Risk | Why it matters | Mitigation |
|------|----------------|------------|
| Overfitting to one new format | Could improve short stories but weaken long-form novel flow | Keep long-form as baseline and add tests for backwards compatibility |
| Template sprawl | Separate templates per mode may become hard to maintain | Prefer shared templates with mode-aware sections when practical |
| Ambiguous collection semantics | “One volume one short story” can be modeled multiple ways | Define collection unit semantics explicitly in Phase 1 |

## Suggested Next Action

Complete Phase 4 human verification with a live Codex run, then approve the phase if named-agent delegation behaves correctly.

---
*Last updated: 2026-04-08 after Phase 4 execution reached human verification*
