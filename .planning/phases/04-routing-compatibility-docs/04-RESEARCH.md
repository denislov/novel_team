# Phase 4: Routing, Compatibility, Tests, Docs - Research

**Researched:** 2026-04-07
**Domain:** format-aware workflow routing, compatibility hardening, and release-safe documentation
**Confidence:** HIGH

<user_constraints>
## User Constraints

Inherited from project context and prior phases:

### Locked Decisions
- Long-form remains the compatibility baseline
- New planning modes must not break existing long-form workflows
- Markdown project memory remains the source of truth for routing decisions
- Short story and story collection support should become production-safe, not just template-declared

### the agent's Discretion
- Exact routing rules for `progress` and `next`
- Which files/tests need the strongest compatibility coverage
- Documentation scope needed to make the feature understandable to users

### Deferred Ideas
- Auto-migration between story formats
- Cross-project dashboards or analytics
- Full story-format inference from text briefs
</user_constraints>

<research_summary>
## Summary

Phase 4 is the “make it real and safe” phase. Phases 1–3 introduced the format contract and collection-aware memory model, but current routing logic (`progress`, `next`, and downstream recommendations) is still primarily chapter/long-form oriented.

The key design principle for this phase is **format-aware recommendation logic with compatibility fallbacks**. Long-form projects should continue to behave as they do now, while short-story and collection projects should get different recommendation heuristics derived from `story_format` and `planning_unit`.

**Primary recommendation:** Update the state/routing layer first, then harden with regression tests and docs that describe how the system behaves differently per project format.
</research_summary>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Routing from Project Memory
`progress` and `next` should derive recommendations from explicit frontmatter:
- `story_format`
- `planning_unit`
- current progress fields

This is safer than inferring format from file layout.

### Pattern 2: Compatibility-First Branching
Routing logic should branch like this:
1. Explicit `story_format = short_story`
2. Explicit `story_format = story_collection`
3. Otherwise default to existing long-form logic

### Pattern 3: Test the Recommendation Surface
The highest-risk behavior is not template rendering; it is wrong “next action” guidance. This phase should add regression tests for:
- long-form unchanged behavior
- short story recommendations
- collection recommendations

### Anti-Patterns to Avoid
- Rewriting all state logic without preserving long-form test cases
- Mixing story-format semantics into docs only, without changing routing behavior
- Collection mode still recommending “next 3 chapters” as the only primary workflow
</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Collection mode still routes like long-form
**What goes wrong:** The project tracks story collections correctly, but `next` still recommends chapter-first work.
**How to avoid:** Add explicit collection-aware routing conditions.

### Pitfall 2: Short-story mode gets over-planned
**What goes wrong:** A single short story keeps getting pushed into batch chapter planning.
**How to avoid:** Short-story recommendations should prefer story-level planning completion and lightweight execution.

### Pitfall 3: Compatibility regressions hidden by missing tests
**What goes wrong:** Long-form users silently lose expected behavior because only new modes were tested.
**How to avoid:** Add regression tests for all three modes.
</common_pitfalls>

<open_questions>
## Open Questions

1. **How should short-story `next` behave after one story is complete?**
   - Recommendation: prefer review/polish/finish semantics rather than pushing more chapter planning.

2. **How much collection support belongs in `novel_state.cjs` versus workflow markdown?**
   - Recommendation: recommendation logic belongs in `novel_state.cjs`, presentation remains in workflows.
</open_questions>

<sources>
## Sources

### Primary
- `.planning/phases/03-collection-growth-model/03-01-SUMMARY.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `plugins/novel/workflows/progress.md`
- `plugins/novel/workflows/next.md`
- `plugins/novel/scripts/novel_state.cjs`
- `plugins/novel/README.md`

### Secondary
- `tests/novel-state.test.cjs`
- `tests/install.test.cjs`
</sources>
