# Phase 3: Collection Growth Model - Research

**Researched:** 2026-04-07
**Domain:** collection-aware project memory and story-growth planning
**Confidence:** HIGH

<user_constraints>
## User Constraints

Inherited from project context and prior phases:

### Locked Decisions
- Keep long-form as the compatibility baseline
- `story_collection` is a first-class mode, not a hack on top of long-form
- Collection mode should support gradual growth as more short stories are added
- Shared core memory files should still be reused where possible

### the agent's Discretion
- Exact collection progress fields and table structure
- Whether collection rows are called “stories”, “units”, or both
- How much optional chapter support to mention for a story inside a collection

### Deferred Ideas
- Automatic migration between single-story and collection mode
- Advanced mixed-mode umbrella projects
- Format-aware routing logic beyond memory/model representation
</user_constraints>

<research_summary>
## Summary

Collection mode needs a **project-of-stories model**, not just a lighter roadmap. The key difference from Phase 2 is that templates must now capture collection-level progress explicitly: what stories are complete, which story is active, what story comes next, and how the collection grows over time.

The strongest pattern is to treat the collection as an umbrella project whose primary planning unit is `story`, while allowing each story to optionally have internal chapter structure when needed. This keeps the model flexible enough for very short standalone pieces and slightly longer multi-chapter stories within the same collection.

**Primary recommendation:** Extend `ROADMAP.md` and `STATE.md` with first-class collection growth tables, and update `PROJECT.md` / `CHAPTER-OUTLINE.md` guidance so an author can reason about both the collection and the current story at the same time.
</research_summary>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Collection-Level Progress Ledger
Track:
- completed stories
- active story
- next story queue
- collection theme / shape

This is the collection equivalent of chapter progress.

### Pattern 2: Story as Primary Planning Unit
For `story_collection`, the system should default to:
- `planning_unit = story`
- optional chapter decomposition inside a story, not mandatory top-level structure

### Pattern 3: Two-Level Memory
Collection mode should maintain:
1. **Collection-level state** — how the anthology/project is growing
2. **Current-story state** — what the active story is doing right now

### Anti-Patterns to Avoid
- Treating each new short story as a fake “next volume” without collection-level progress
- Losing visibility into completed story count
- Forcing the collection roadmap to look exactly like long-form serialization
</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Collection without queue semantics
**What goes wrong:** The author can declare collection mode, but the project cannot track what story comes next.
**How to avoid:** Add explicit active/next/completed story structures to roadmap and state.

### Pitfall 2: No distinction between collection and current story
**What goes wrong:** The author cannot tell whether a status field refers to the whole collection or the active short story.
**How to avoid:** Label collection-level and current-story sections separately.

### Pitfall 3: Story-first model that blocks optional chaptering
**What goes wrong:** Slightly longer collection entries become awkward because chapter support disappeared.
**How to avoid:** Preserve optional chapter decomposition under a story-first collection model.
</common_pitfalls>

<open_questions>
## Open Questions

1. **Terminology**
   - “story”, “unit”, and “volume” may all be useful in different author mental models
   - Recommendation: use `story` as the canonical product term and explain other interpretations in guidance

2. **Collection target length**
   - Exact collection length may evolve unpredictably as more stories are added
   - Recommendation: track both per-story intent and aggregate collection growth
</open_questions>

<sources>
## Sources

### Primary
- `.planning/phases/02-format-aware-templates/02-01-SUMMARY.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `plugins/novel/templates/PROJECT.md`
- `plugins/novel/templates/ROADMAP.md`
- `plugins/novel/templates/STATE.md`
- `plugins/novel/templates/CHAPTER-OUTLINE.md`

### Secondary
- `plugins/novel/README.md`
</sources>
