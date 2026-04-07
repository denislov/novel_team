# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-07)

**Core value:** Authors can choose the right planning structure for the story length they actually want to write.
**Current focus:** Phase 1 — Story Format Model

## Current Status

- Project type: Brownfield enhancement of existing Novel workflow toolkit
- Current milestone: Introduce format-aware planning for multiple fiction lengths
- Next command: `/gsd-plan-phase 1`

## Active Phases

| Phase | Status | Goal |
|------|--------|------|
| 1 | Ready | Introduce explicit story format model and initialization contract |
| 2 | Pending | Make templates and planning artifacts format-aware |
| 3 | Pending | Add collection-aware planning and growth model |
| 4 | Pending | Update routing, compatibility, tests, and docs |

## Open Questions

- What is the minimal metadata needed to distinguish long-form, short story, and collection mode?
- In collection mode, should each story always map to one “volume”, or should “story” and “volume” stay distinct?
- Which existing workflows should adapt by format, and which should stay long-form-only initially?

## Known Constraints

- Existing long-form behavior must keep working
- Markdown project memory remains the source of truth
- Implementation should stay in the current Node-based architecture

## Next Actions

- [ ] Plan Phase 1
- [ ] Define story-format taxonomy and config representation
- [ ] Decide format-aware initialization questions and defaults

---
*Last updated: 2026-04-07 after brownfield GSD initialization*
