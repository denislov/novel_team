# Requirements: Novel

**Defined:** 2026-04-07
**Core Value:** Authors can choose the right planning structure for the story length they actually want to write, without fighting templates or workflows designed for only one narrative scale.

## v1 Requirements

### Story Format Modeling

- [ ] **FORMAT-01**: User can define project format as long-form novel, single short story, or short-story collection
- [ ] **FORMAT-02**: Project initialization stores the selected format in project memory/config
- [ ] **FORMAT-03**: Each format has explicit planning defaults for target words, structure depth, and expected artifacts

### Length-Aware Planning

- [ ] **PLAN-01**: Long-form projects support chapter/arc/volume planning suitable for 20,000+ word works
- [ ] **PLAN-02**: Single short-story projects support lightweight planning that does not require unnecessary multi-volume scaffolding
- [ ] **PLAN-03**: Short-story collection projects support adding multiple stories over time without breaking previous planning
- [ ] **PLAN-04**: Planning outputs adapt chapter/story segmentation based on chosen format and target length

### Templates & Project Memory

- [ ] **TMPL-01**: Core templates reflect the selected story format and target length expectations
- [ ] **TMPL-02**: `PROJECT.md`, `ROADMAP.md`, and `STATE.md` can represent all three formats clearly
- [ ] **TMPL-03**: Collection mode can track per-story progress and accumulated collection growth

### Workflow Behavior

- [ ] **FLOW-01**: New-project flow can gather the information needed to distinguish long-form, short story, and collection projects
- [ ] **FLOW-02**: Plan-arc / plan-batch / next-step routing uses the selected format when recommending next actions
- [ ] **FLOW-03**: Existing long-form behavior remains stable for current users

### Quality & Migration

- [ ] **QUAL-01**: Existing tests continue to pass after the new planning modes are introduced
- [ ] **QUAL-02**: New tests cover format-specific planning decisions and template outputs
- [ ] **QUAL-03**: Documentation explains when to use each project format and what structure it generates

## v2 Requirements

### Advanced Authoring Modes

- **ADV-01**: Hybrid projects can mix serial arcs and standalone stories in one umbrella project
- **ADV-02**: The tool can suggest an appropriate project format automatically from a brief
- **ADV-03**: Story-format migration can convert an existing project from one mode to another safely

## Out of Scope

| Feature | Reason |
|---------|--------|
| Visual planning GUI | Not required to deliver better format-aware planning |
| Publishing/export formats per platform | Separate product concern from planning correctness |
| Automatic prose-length enforcement | Helpful later, but not necessary for planning support |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FORMAT-01 | Phase 1 | Pending |
| FORMAT-02 | Phase 1 | Pending |
| FORMAT-03 | Phase 1 | Pending |
| PLAN-01 | Phase 2 | Pending |
| PLAN-02 | Phase 2 | Pending |
| PLAN-03 | Phase 3 | Pending |
| PLAN-04 | Phase 3 | Pending |
| TMPL-01 | Phase 2 | Pending |
| TMPL-02 | Phase 2 | Pending |
| TMPL-03 | Phase 3 | Pending |
| FLOW-01 | Phase 1 | Pending |
| FLOW-02 | Phase 4 | Pending |
| FLOW-03 | Phase 4 | Pending |
| QUAL-01 | Phase 4 | Pending |
| QUAL-02 | Phase 4 | Pending |
| QUAL-03 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-04-07*
*Last updated: 2026-04-07 after brownfield scope definition for multi-length fiction planning*
