# Phase 2: Format-Aware Templates - Research

**Researched:** 2026-04-07
**Domain:** format-aware template and project-memory design for fiction workflows
**Confidence:** HIGH

<user_constraints>
## User Constraints

Inferred from `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, and Phase 1 outputs.

### Locked Decisions
- Keep long-form as the compatibility baseline
- Reuse shared core memory files where possible
- Support three explicit modes: `long_form`, `short_story`, `story_collection`
- Phase 2 should adapt templates and planning artifacts, not redesign the entire product architecture

### the agent's Discretion
- Exact wording of mode-aware sections in templates
- How strongly to specialize chapter-driven vs story-driven guidance
- Whether to add conditional guidance comments or explicit alternate sections in templates

### Deferred Ideas
- Auto-migration of old projects
- Smart inference of story format from brief text
- Story-collection routing logic beyond template-level support
</user_constraints>

<research_summary>
## Summary

Phase 2 should convert the new story-format contract into **clear, legible template behavior**. The main problem today is not that the templates are missing fields; it is that they still strongly narrate a long-form, chapter/volume workflow even when the chosen project is a short story or collection.

The safest approach is **adaptive templates with mode-aware sections**, not three fully separate template trees. That keeps maintenance lower while still allowing short-form projects to avoid inheriting irrelevant long-form expectations like heavy multi-volume arcs or mandatory “next 3 chapters” thinking.

**Primary recommendation:** Update `PROJECT.md`, `ROADMAP.md`, `STATE.md`, and `CHAPTER-OUTLINE.md` so each explicitly tells the author how the structure should be interpreted in `long_form`, `short_story`, and `story_collection` modes.
</research_summary>

<architecture_patterns>
## Architecture Patterns

### Pattern 1: Shared Template, Mode-Aware Guidance
Use one template file per artifact, but add format-aware fields/sections so the same file works differently depending on `story_format`.

**Best for:** This project’s current architecture and maintenance goals.

### Pattern 2: Story Unit vs Chapter Unit
Treat `planning_unit` as the operational override:
- `chapter` for long-form
- `story` for short story and collection

Templates should read this field and present the right mental model even when the filename remains legacy-friendly.

### Pattern 3: Collection as “Project of Stories”
For `story_collection`, roadmap/state should emphasize:
- completed stories
- active story
- next story queue
- collection growth

instead of only chapter or arc progression.

### Anti-Patterns to Avoid
- Adding metadata but leaving all prose and examples long-form only
- Forcing short stories into fake chapter/volume milestones
- Introducing separate template directories per mode before behavior has stabilized
</architecture_patterns>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: Cosmetic adaptation only
**What goes wrong:** Templates include `story_format`, but all structure examples still assume chapters and arcs.
**How to avoid:** Update example rows, checklists, and guidance text—not just frontmatter.

### Pitfall 2: Overcorrecting against long-form
**What goes wrong:** Short-story support weakens the power of long-form scaffolding.
**How to avoid:** Keep long-form sections strong while clearly labeling how short-story / collection modes reinterpret them.

### Pitfall 3: Collection mode treated as just “many shorts”
**What goes wrong:** The collection never gets a project-level memory model.
**How to avoid:** Add collection-level progress concepts to `ROADMAP.md` and `STATE.md`.
</common_pitfalls>

<open_questions>
## Open Questions

1. **Do collections need chapter outline templates at all?**
   - Likely yes, but only optionally. Some stories in a collection may still be multi-chapter.
   - Recommendation: Phase 2 should make `CHAPTER-OUTLINE.md` explicitly optional/conditional for `planning_unit = story`.

2. **How much legacy naming should remain?**
   - File names can stay for compatibility.
   - Interpretation and guidance should become mode-aware.
</open_questions>

<sources>
## Sources

### Primary
- `.planning/phases/01-story-format-model/01-01-SUMMARY.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `plugins/novel/templates/PROJECT.md`
- `plugins/novel/templates/ROADMAP.md`
- `plugins/novel/templates/STATE.md`
- `plugins/novel/templates/CHAPTER-OUTLINE.md`

### Secondary
- `plugins/novel/workflows/new-project.md`
- `plugins/novel/README.md`
</sources>
