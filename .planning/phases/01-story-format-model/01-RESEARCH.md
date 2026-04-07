# Phase 1: Story Format Model - Research

**Researched:** 2026-04-07
**Domain:** fiction project initialization and planning model design
**Confidence:** HIGH

<user_constraints>
## User Constraints (from project context)

No CONTEXT.md exists for this phase. Constraints were inferred from `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, and the existing codebase.

### Locked Decisions
- Support three planning shapes: long-form novel, single short story, short-story collection
- Preserve existing long-form behavior as the compatibility baseline
- Keep Markdown project memory as the source of truth
- Keep implementation in the current Node/CommonJS architecture

### the agent's Discretion
- Exact metadata names for story format and planning unit
- Whether format defaults live in `.planning/config.json`, `PROJECT.md`, or both
- How much template surface to touch in Phase 1 versus Phase 2

### Deferred Ideas (OUT OF SCOPE)
- Automatic story-format inference from a brief
- GUI planning surface
- Story-format migration between existing projects
</user_constraints>

<research_summary>
## Summary

Phase 1 should define a **single explicit story-format contract** that all later planning flows can consume. The current product assumes long-form serialization through chapter/arc/state structures, so the safest path is to introduce format metadata first while keeping long-form defaults intact.

The recommended model is to represent a project with three orthogonal fields: **story_format**, **planning_unit**, and **target_length_band**. This lets the system distinguish “what kind of work this is,” “what the default planning object is,” and “how deep the planning should go” without forking the whole product into separate tools.

**Primary recommendation:** Introduce a backward-compatible story-format contract in initialization and project memory now; postpone deeper template reshaping to the next phase.
</research_summary>

<standard_stack>
## Standard Stack

This phase is product-contract work, not third-party ecosystem work.

### Core
| Tool | Purpose | Why Standard |
|------|---------|--------------|
| Existing Node/CommonJS workflow code | Implement initialization logic | Matches current repo runtime and install model |
| Markdown project memory (`PROJECT.md`, `ROADMAP.md`, `STATE.md`) | Store story-format decisions | Already the product’s source of truth |
| Root Node tests in `tests/*.test.cjs` | Lock compatibility and new behavior | Existing verification surface |

### Supporting
| Tool | Purpose | When to Use |
|------|---------|-------------|
| `plugins/novel/templates/*.md` | Surface format metadata in user-facing files | Required when initialization must persist story format |
| `plugins/novel/workflows/new-project.md` | Gather user choices and apply defaults | Required for Phase 1 scope |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Explicit format model | Heuristic inference from target words only | Simpler, but conflates length with structure and fails for collections |
| Shared metadata fields | Separate templates/workflows per format immediately | Faster for one mode, but higher maintenance and compatibility risk |
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Explicit Format Contract
**What:** Store narrative-shape metadata explicitly instead of inferring from chapter count or target words.
**When to use:** Any project where planning behavior depends on whether the writing unit is chapter-driven, story-driven, or collection-driven.

**Recommended fields:**
- `story_format`: `long_form` | `short_story` | `story_collection`
- `planning_unit`: `chapter` | `story`
- `target_length_band`: `short` | `medium_long` | `collection`

### Pattern 2: Backward-Compatible Defaults
**What:** Existing projects or users who do not choose a format default to `long_form`.
**When to use:** Brownfield enhancement of a shipped workflow.

**Why:** Prevents regressions while allowing new paths to be introduced incrementally.

### Pattern 3: Phase-Sliced Transformation
**What:** Introduce metadata and initialization questions first, then adapt templates and routing in later phases.
**When to use:** When the current product already encodes long-form assumptions deeply.

### Anti-Patterns to Avoid
- **Length-only modeling:** A 12k short story and a 12k story inside a collection should not necessarily share the same planning behavior
- **Hard-forking the workflow too early:** Creating three separate products would multiply maintenance before the model is stable
- **Template-first without contract:** Changing templates before metadata exists makes routing and compatibility brittle
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Story-type detection | Magical inference from file count or target chapters | Explicit format selection in initialization | User intent matters more than inferred structure |
| Compatibility strategy | Special-case conditionals scattered across workflows | Central metadata contract with defaults | Easier to test and reason about |
| Collection tracking | Treat collection as a fake long novel | Dedicated collection mode with story-level planning unit | Better matches author mental model |

**Key insight:** The hard part is not rendering Markdown; it is defining a stable product contract that later workflows can trust.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Conflating word count with planning structure
**What goes wrong:** A single short story gets forced into chapter/arc scaffolding because the system only sees target length.
**How to avoid:** Store both format and planning unit explicitly.

### Pitfall 2: Breaking long-form defaults
**What goes wrong:** Existing users suddenly have to answer new questions or receive different files with no migration path.
**How to avoid:** Default unspecified format to long-form and keep existing output valid.

### Pitfall 3: Over-committing template changes in Phase 1
**What goes wrong:** Too many simultaneous changes blur whether failures come from model design or template design.
**How to avoid:** Limit Phase 1 to initialization contract + minimum template persistence needed for future phases.
</common_pitfalls>

<open_questions>
## Open Questions

1. **Collection semantics**
   - What we know: The user wants “one short story per volume/unit” growth
   - What's unclear: Whether “volume” should become formal product terminology or stay an implementation detail
   - Recommendation: Use `story` as the planning unit in Phase 1, defer collection display semantics to Phase 2/3

2. **Target length representation**
   - What we know: The product must support at least 6k–20k short stories and 20k+ longer works
   - What's unclear: Whether exact target words, ranges, and named bands all need to be stored
   - Recommendation: Store exact target words plus a normalized length band
</open_questions>

<sources>
## Sources

### Primary
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `plugins/novel/workflows/new-project.md`
- `plugins/novel/templates/PROJECT.md`
- `plugins/novel/templates/ROADMAP.md`
- `plugins/novel/templates/STATE.md`

### Secondary
- `.planning/codebase/ARCHITECTURE.md`
- `.planning/codebase/STRUCTURE.md`
- `.planning/codebase/CONCERNS.md`
</sources>
