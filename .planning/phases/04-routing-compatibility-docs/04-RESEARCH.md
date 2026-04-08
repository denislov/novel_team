# Phase 4: Routing, Compatibility, Tests, Docs - Research

**Researched:** 2026-04-08
**Domain:** Codex routing and named-agent execution reliability for installed Novel workflows
**Confidence:** HIGH

<user_constraints>
## User Constraints

### Locked Decisions
- Phase 4 remains the production-safety phase for workflow routing, compatibility, tests, and docs; this reliability work stays inside that scope rather than creating a new roadmap theme. [VERIFIED: .planning/ROADMAP.md][VERIFIED: user request 2026-04-08]
- Existing long-form behavior must remain stable for current users. [VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/REQUIREMENTS.md]
- Format-aware routing still matters in Phase 4, but the newly reported Codex runtime issue adds a second compatibility requirement: successful installation must not be treated as proof that named-agent execution is correct. [VERIFIED: .planning/ROADMAP.md][VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: user report 2026-04-08][VERIFIED: tests/install.test.cjs]

### Claude's Discretion
- The exact fail-closed mechanism for Codex named-agent workflows. [VERIFIED: user request 2026-04-08]
- Which tests and docs should distinguish installation correctness from execution correctness. [VERIFIED: user request 2026-04-08]
- Whether production-safe Codex routing should prefer explicit `$novel-*` entrypoints, a public router skill, or both. [VERIFIED: plugins/novel/README.md][VERIFIED: plugins/novel/skills/novel-command-center/SKILL.md][VERIFIED: tests/install.test.cjs]

### Deferred Ideas (OUT OF SCOPE)
- No separate Phase 4 `*-CONTEXT.md` file exists, so no additional deferred ideas are locked for this update beyond the already documented roadmap scope. [VERIFIED: `find .planning/phases/04-routing-compatibility-docs -maxdepth 1 -type f -name '*-CONTEXT.md'`]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FLOW-02 | Plan-arc / plan-batch / next-step routing uses the selected format when recommending next actions. [VERIFIED: .planning/REQUIREMENTS.md] | Keep Phase 4 as routing hardening, but treat Codex entrypoint selection and execution-mode correctness as part of routing safety. [VERIFIED: .planning/ROADMAP.md][VERIFIED: plugins/novel/README.md] |
| FLOW-03 | Existing long-form behavior remains stable for current users. [VERIFIED: .planning/REQUIREMENTS.md] | Fail-closed named-agent execution protects the existing long-form write/review flow from silently degrading into inline behavior. [VERIFIED: plugins/novel/workflows/write-chapter.md][VERIFIED: plugins/novel/workflows/review.md][VERIFIED: user report 2026-04-08] |
| QUAL-01 | Existing tests continue to pass after the new planning modes are introduced. [VERIFIED: .planning/REQUIREMENTS.md] | Keep current installer and workflow-contract tests green while adding Codex execution-contract coverage. [VERIFIED: tests/install.test.cjs][VERIFIED: tests/agent-definition.test.cjs] |
| QUAL-02 | New tests cover format-specific planning decisions and template outputs. [VERIFIED: .planning/REQUIREMENTS.md] | Extend Phase 4 tests so Codex execution semantics are also regression-protected, not just install artifacts. [VERIFIED: tests/install.test.cjs][VERIFIED: tests/agent-definition.test.cjs][VERIFIED: user report 2026-04-08] |
| QUAL-03 | Documentation explains when to use each project format and what structure it generates. [VERIFIED: .planning/REQUIREMENTS.md] | Docs should now also explain the safe Codex execution path, the difference between install success and runtime correctness, and what misrouting looks like. [VERIFIED: plugins/novel/README.md][VERIFIED: user request 2026-04-08] |
</phase_requirements>

## Summary

Phase 4 already owns workflow safety, compatibility, tests, and docs, so the reported Codex issue belongs here as production-safety work rather than a new roadmap theme. [VERIFIED: .planning/ROADMAP.md][VERIFIED: user request 2026-04-08]

The newly discovered risk is specific and concrete: Novel can install correctly in Codex while still executing a workflow inline instead of delegating `SpawnAgent(...)` steps to the intended named agents. [VERIFIED: user report 2026-04-08][VERIFIED: plugins/novel/commands/_codex-conventions.md][VERIFIED: tests/install.test.cjs] Current install tests prove that generated skills, support files, agent TOML files, and `config.toml` entries exist, but they do not prove that a live Codex run will obey the intended planner/writer/editor/verifier delegation model. [VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs][VERIFIED: tests/agent-definition.test.cjs]

`write-chapter`, `review`, and `autonomous` are the highest-risk surfaces because they declare required named agents and embed multiple `SpawnAgent` steps that are supposed to preserve role separation and quality gates. [VERIFIED: plugins/novel/workflows/write-chapter.md][VERIFIED: plugins/novel/workflows/review.md][VERIFIED: plugins/novel/workflows/autonomous.md] If those workflows run inline, the install looks healthy while the actual runtime contract is broken. [VERIFIED: user report 2026-04-08][VERIFIED: tests/install.test.cjs]

**Primary recommendation:** Make named-agent execution explicit and fail-closed for agent-heavy Codex workflows, then add tests and docs that separately verify install correctness and execution correctness. [VERIFIED: plugins/novel/commands/_codex-conventions.md][VERIFIED: tests/install.test.cjs][VERIFIED: user request 2026-04-08]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | `>=20.0.0` required; `v24.13.1` available. [VERIFIED: package.json][VERIFIED: node --version] | Runtime for the installer and the repo test suite. [VERIFIED: bin/install.js][VERIFIED: package.json] | The repo already targets Node and uses only built-in modules in the installer and tests. [VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs] |
| `node:test` | Built into the installed Node runtime. [VERIFIED: node --version][VERIFIED: tests/install.test.cjs] | Static and unit-style regression tests for install and workflow contracts. [VERIFIED: tests/install.test.cjs][VERIFIED: tests/agent-definition.test.cjs] | No extra dependency is needed, which keeps install/runtime parity simple. [VERIFIED: package.json] |
| Codex named-agent registry (`config.toml` + `agents/*.toml`) | Generated by `bin/install.js` at install time. [VERIFIED: plugins/novel/README.md][VERIFIED: bin/install.js] | Registers `novel-*` sub-agents for Codex. [VERIFIED: plugins/novel/README.md][VERIFIED: bin/install.js] | This is the repo's existing Codex discovery model for specialized sub-agents. [VERIFIED: plugins/novel/README.md] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Generated public `$novel-*` skills | Generated from `commands/*.md` on install. [VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs] | User-facing Codex entrypoints. [VERIFIED: plugins/novel/README.md] | Use for explicit, production-safe workflow invocation. [VERIFIED: plugins/novel/README.md] |
| `plugins/novel/commands/_codex-conventions.md` | Source policy file. [VERIFIED: plugins/novel/commands/_codex-conventions.md] | Translation layer for `AskUserQuestion`, `SpawnAgent`, and slash-command compatibility. [VERIFIED: plugins/novel/commands/_codex-conventions.md] | This is the primary file to harden for fail-closed execution semantics. [VERIFIED: plugins/novel/commands/_codex-conventions.md] |
| Internal support skills `novel-command-center` and `novel-writing` | Shipped in the support bundle, but not exposed as top-level public Codex skills. [VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs] | Internal routing and writing guidance for the generated skill surface. [VERIFIED: plugins/novel/README.md][VERIFIED: plugins/novel/skills/novel-command-center/SKILL.md][VERIFIED: plugins/novel/skills/novel-writing/SKILL.md] | Use as internal support; do not assume they are themselves the tested public entrypoints. [VERIFIED: tests/install.test.cjs] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Fail-open inline fallback for agent-heavy workflows. [VERIFIED: plugins/novel/commands/_codex-conventions.md] | Fail-closed execution with an explicit repair/error path when required named agents are missing or not being used. | Stricter behavior surfaces breakage earlier, but it matches the intended production model and would have exposed the reported regression immediately. [VERIFIED: user report 2026-04-08] |
| Relying on implicit natural-language routing claims alone. [VERIFIED: plugins/novel/README.md][VERIFIED: plugins/novel/skills/novel-command-center/SKILL.md] | Recommending explicit `$novel-*` invocation for production workflows, or exposing one public router skill that is itself regression-tested. | Explicit entrypoints are less magical, but they are testable and easier to document as the safe path. [VERIFIED: tests/install.test.cjs][VERIFIED: plugins/novel/README.md] |

**Installation:**
```bash
node bin/install.js install --codex --global
npm test
```

**Version verification:** No external npm packages are required by the current installer/test stack; the important runtime gate is Node `>=20.0.0`, and the current environment satisfies it with Node `v24.13.1`. [VERIFIED: package.json][VERIFIED: node --version]

## Architecture Patterns

### Recommended Project Structure
```text
plugins/novel/
├── commands/      # Public workflow specs plus Codex compatibility rules
├── workflows/     # Workflow DSL, including SpawnAgent steps
├── skills/        # Internal routing/writing support skills
├── agents/        # Source agent definitions
bin/
└── install.js     # Codex/Claude materialization logic
tests/
├── install.test.cjs
└── agent-definition.test.cjs
```
[VERIFIED: plugins/novel/README.md][VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs]

### Pattern 1: Separate Install Correctness From Execution Correctness
**What:** Treat install success and runtime delegation success as two different acceptance gates. [VERIFIED: tests/install.test.cjs][VERIFIED: user report 2026-04-08]

**When to use:** Apply this pattern to every Codex workflow that lists named agents or calls `SpawnAgent(...)`. [VERIFIED: plugins/novel/workflows/write-chapter.md][VERIFIED: plugins/novel/workflows/review.md][VERIFIED: plugins/novel/workflows/autonomous.md][VERIFIED: rg `SpawnAgent(` under `plugins/novel/workflows/*.md`]

**Example:**
```md
<available_agent_types>
- novel-planner
- novel-writer
- novel-editor
- novel-verifier
</available_agent_types>
```
Source: `plugins/novel/workflows/write-chapter.md`. [VERIFIED: plugins/novel/workflows/write-chapter.md]

### Pattern 2: Fail-Closed Public Entry Points
**What:** Public `$novel-*` skills that drive production workflows should abort when required named-agent delegation cannot be guaranteed, rather than silently completing inline. [VERIFIED: user report 2026-04-08][VERIFIED: plugins/novel/commands/_codex-conventions.md]

**When to use:** At minimum for `write-chapter`, `review`, and `autonomous`; the same rule likely applies to `plan-batch`, `plan-arc`, `polish`, `research`, `new-project`, `map-base`, and `character` because those workflows also declare named agents. [VERIFIED: plugins/novel/workflows/write-chapter.md][VERIFIED: plugins/novel/workflows/review.md][VERIFIED: plugins/novel/workflows/autonomous.md][VERIFIED: rg `SpawnAgent(` under `plugins/novel/workflows/*.md`]

**Example:**
```js
assert.ok(read(skillPath).includes('## C. SpawnAgent() → spawn_agent Mapping'));
assert.ok(read(configPath).includes('[agents.novel-architect]'));
```
Source: `tests/install.test.cjs`. [VERIFIED: tests/install.test.cjs]

### Pattern 3: Keep Workflow Agent Lists and Public Skill Contracts in Sync
**What:** The workflow's declared agent set, the installed agent registry, and the generated public skill header should describe the same runtime contract. [VERIFIED: plugins/novel/workflows/write-chapter.md][VERIFIED: bin/install.js][VERIFIED: tests/agent-definition.test.cjs]

**When to use:** Whenever a workflow is added, renamed, or gains a new `SpawnAgent(...)` step. [VERIFIED: tests/agent-definition.test.cjs][VERIFIED: bin/install.js]

### Anti-Patterns to Avoid
- Treating `validateRuntime()` or install tests as proof that live Codex execution will use named agents. [VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs][VERIFIED: user report 2026-04-08]
- Letting `_codex-conventions.md` remain the only execution-policy surface while it still permits inline fallback for agent-heavy workflows. [VERIFIED: plugins/novel/commands/_codex-conventions.md]
- Advertising natural-language routing as the primary safe path without a corresponding runtime or regression test. [VERIFIED: plugins/novel/README.md][VERIFIED: plugins/novel/skills/novel-command-center/SKILL.md][VERIFIED: tests/install.test.cjs]

## Installation vs Execution Reliability

| Reliability Layer | Current Definition | Current Coverage |
|-------------------|--------------------|------------------|
| Installation correctness | The install is correct when the support bundle is copied, public `$novel-*` skills are generated, named-agent TOML files exist, and `config.toml` contains the managed Novel agent sections. [VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs] | Covered by `installRuntime()` / `validateRuntime()` and `tests/install.test.cjs`. [VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs] |
| Execution correctness | Runtime is correct only when each workflow step that says `SpawnAgent(...)` is actually delegated to the named Codex agent instead of being performed inline by the parent workflow. [VERIFIED: plugins/novel/workflows/write-chapter.md][VERIFIED: plugins/novel/workflows/review.md][VERIFIED: plugins/novel/workflows/autonomous.md] | Not directly covered by any current automated test in the repo. [VERIFIED: tests/install.test.cjs][VERIFIED: tests/agent-definition.test.cjs] |
| User-facing safety | Users should be able to tell whether Novel is merely installed or actually executing in the intended sub-agent model. [VERIFIED: user report 2026-04-08][VERIFIED: plugins/novel/README.md] | Current docs do not separate these two states. [VERIFIED: plugins/novel/README.md] |

## Concrete Failure Modes

### Failure Mode 1: Silent Inline Delegation
Current Codex conventions say to use named agents "by default" and explicitly allow inline fallback when agents are unavailable or the workflow is "trivially small," which leaves a fail-open path in the main execution policy file. [VERIFIED: plugins/novel/commands/_codex-conventions.md] This is the most direct explanation for a workflow that is installed correctly but still runs inline until the user objects. [VERIFIED: user report 2026-04-08]

### Failure Mode 2: Install Green, Runtime Wrong
`tests/install.test.cjs` proves that generated skills, support commands, agent TOML files, and config sections exist, but it never asserts that a live workflow run must delegate instead of performing planner/writer/verifier work inline. [VERIFIED: tests/install.test.cjs] `validateRuntime()` has the same limitation: it checks filesystem/config state, not live execution behavior. [VERIFIED: bin/install.js]

### Failure Mode 3: Workflow Agent Lists Are Documentation-Only
The repo already requires workflows that spawn agents to include `<available_agent_types>`, but current tests only verify that the listed names exist and match the workflow content. [VERIFIED: tests/agent-definition.test.cjs] Nothing in the current runtime surface turns that list into a required preflight or failure condition. [VERIFIED: bin/install.js][VERIFIED: plugins/novel/commands/_codex-conventions.md]

### Failure Mode 4: Natural-Language Routing Is Not a Tested Safety Path
The README says Codex provides natural-language routing and says `novel-command-center` handles natural-language requests, while the internal router also advertises implicit invocation. [VERIFIED: plugins/novel/README.md][VERIFIED: plugins/novel/skills/novel-command-center/SKILL.md][VERIFIED: plugins/novel/skills/novel-command-center/agents/openai.yaml] At the same time, the installer deliberately keeps `novel-command-center` out of top-level public Codex skills, and current tests assert that hidden status. [VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs] That means the natural-language path may exist, but its production-safety contract is not protected by the current regression suite. [VERIFIED: tests/install.test.cjs]

### Failure Mode 5: High-Value Workflows Have No Explicit Agent-Required Marker
`write-chapter`, `review`, and `autonomous` clearly enumerate named agents and `SpawnAgent(...)` calls, but the inspected command/workflow files contain no explicit fail-closed marker such as "required agents" or "abort if delegation is unavailable." [VERIFIED: plugins/novel/commands/write-chapter.md][VERIFIED: plugins/novel/workflows/write-chapter.md][VERIFIED: plugins/novel/workflows/review.md][VERIFIED: plugins/novel/workflows/autonomous.md]

## Recommended Hardening Strategy

### 1. Make Agent-Heavy Workflows Fail Closed
Remove the generic inline fallback from the Codex conventions path for any workflow that declares named agents, or narrow it so that it applies only to read-only/non-delegating flows such as help/progress/next. The production rule should be: if a workflow declares named agents, the parent must not perform those delegated steps inline. [VERIFIED: plugins/novel/commands/_codex-conventions.md][VERIFIED: plugins/novel/workflows/write-chapter.md][VERIFIED: plugins/novel/workflows/review.md][VERIFIED: plugins/novel/workflows/autonomous.md]

### 2. Generate an Explicit Execution Contract in Public Codex Skills
Have `convertNovelCommandToCodexSkill()` inject an explicit execution contract into generated `$novel-*` skills for workflows that use named agents. That contract should enumerate required agents, state that inline substitution is not allowed, and instruct Codex to stop with a repair message if delegation cannot be guaranteed. [VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs]

### 3. Use Workflow Metadata as Runtime Policy Input
Promote `<available_agent_types>` from documentation into executable policy by adding a small, machine-readable block or consistently parseable section that the installer can copy into generated skills. This keeps the workflow source as the single authority for which agents are required. [VERIFIED: plugins/novel/workflows/write-chapter.md][VERIFIED: plugins/novel/workflows/review.md][VERIFIED: plugins/novel/workflows/autonomous.md][VERIFIED: tests/agent-definition.test.cjs]

### 4. Add Regression Tests for Execution Semantics
Add tests that fail if agent-heavy generated skills still permit inline fallback, fail if required-agent metadata is missing, and fail if the public safe path becomes ambiguous again. The current suite is strong on install surface validation and weak on runtime-delegation validation. [VERIFIED: tests/install.test.cjs][VERIFIED: tests/agent-definition.test.cjs]

### 5. Document the Safe Codex Path Explicitly
Update README and command-center docs to distinguish three states: installed, installed-and-routable, and installed-and-executing-with-named-agents. Also tell users to treat explicit `$novel-*` invocation as the safe production path until natural-language routing has equivalent regression coverage. [VERIFIED: plugins/novel/README.md][VERIFIED: plugins/novel/skills/novel-command-center/SKILL.md][VERIFIED: user report 2026-04-08]

### 6. Make Delegation User-Visible
Agent-heavy workflows should announce the planned agent sequence before writing files, for example "Using `novel-planner` -> `novel-writer` -> `novel-editor` -> `novel-verifier`." This does not replace tests, but it makes a runtime regression obvious to users instead of silently hiding it. [VERIFIED: plugins/novel/workflows/write-chapter.md][VERIFIED: user report 2026-04-08]

## Exact Source Files Most Relevant to the Fix

| File | Why It Matters | Likely Change Type |
|------|----------------|--------------------|
| `plugins/novel/commands/_codex-conventions.md` | This file currently contains the fail-open policy language that allows inline fallback. [VERIFIED: plugins/novel/commands/_codex-conventions.md] | Execution-policy rewrite. |
| `bin/install.js` | This file generates the public Codex skill header, the agent TOML files, and the `config.toml` agent registrations. [VERIFIED: bin/install.js] | Installer/generator hardening. |
| `tests/install.test.cjs` | This file proves install correctness today and should be extended so it also asserts execution-contract text for generated skills. [VERIFIED: tests/install.test.cjs] | Regression test expansion. |
| `tests/agent-definition.test.cjs` | This file already parses workflow agent usage and is the natural place to require an explicit execution-policy marker for agent-heavy workflows. [VERIFIED: tests/agent-definition.test.cjs] | Contract test expansion. |
| `plugins/novel/workflows/write-chapter.md` | This is the highest-value multi-agent workflow and the clearest place to make named-agent requirements explicit. [VERIFIED: plugins/novel/workflows/write-chapter.md] | Workflow metadata + docs. |
| `plugins/novel/workflows/review.md` | This is the review/verification surface where inline execution would bypass the intended verifier role. [VERIFIED: plugins/novel/workflows/review.md] | Workflow metadata + tests. |
| `plugins/novel/workflows/autonomous.md` | This batch workflow compounds delegation risk because it loops over multiple `SpawnAgent` calls. [VERIFIED: plugins/novel/workflows/autonomous.md] | Workflow metadata + safeguards. |
| `plugins/novel/commands/write-chapter.md` | Public skills are generated from command files, so command surfaces need any new execution-policy metadata or docs references. [VERIFIED: plugins/novel/commands/write-chapter.md][VERIFIED: bin/install.js] | Command contract update. |
| `plugins/novel/skills/novel-command-center/SKILL.md` | This file defines the natural-language routing promise and should be aligned with whatever explicit safe path Phase 4 adopts. [VERIFIED: plugins/novel/skills/novel-command-center/SKILL.md] | Routing-doc and policy alignment. |
| `plugins/novel/README.md` | README currently explains install shape and natural-language routing, but not the difference between install success and execution correctness. [VERIFIED: plugins/novel/README.md] | User-facing documentation update. |

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Runtime delegation correctness | Ad hoc manual spot-checking after users report a problem. [VERIFIED: user report 2026-04-08] | An explicit generated execution contract plus regression tests. [VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs] | Manual discovery is late and unreliable. [VERIFIED: user report 2026-04-08] |
| Planner/writer/editor/verifier work inside the parent skill | Inline emulation of specialized steps. [VERIFIED: plugins/novel/commands/_codex-conventions.md] | Named Codex agents registered through `config.toml` and `agents/*.toml`. [VERIFIED: plugins/novel/README.md][VERIFIED: bin/install.js] | The plugin already models these roles explicitly; collapsing them at runtime defeats the design. [VERIFIED: plugins/novel/workflows/write-chapter.md][VERIFIED: plugins/novel/workflows/review.md] |
| Production routing on hidden implicit behavior alone | Untested natural-language magic as the only safe entry path. [VERIFIED: plugins/novel/README.md][VERIFIED: tests/install.test.cjs] | Explicit `$novel-*` invocation or one public router skill with equivalent tests. [VERIFIED: plugins/novel/README.md][VERIFIED: tests/install.test.cjs] | Production-safe paths need user-visible guarantees and regression coverage. [VERIFIED: tests/install.test.cjs] |

**Key insight:** Install-time structure and runtime delegation are separate systems and need separate acceptance gates in Phase 4. [VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs][VERIFIED: user report 2026-04-08]

## Common Pitfalls

### Pitfall 1: Confusing Installed With Safe
**What goes wrong:** The installer and tests pass, so the team assumes the Codex workflow is production-safe. [VERIFIED: tests/install.test.cjs]

**Why it happens:** Current automated coverage proves artifact presence and path rewriting, not live named-agent delegation. [VERIFIED: tests/install.test.cjs][VERIFIED: bin/install.js]

**How to avoid:** Add a separate execution-contract layer and test it directly. [VERIFIED: user request 2026-04-08]

**Warning signs:** Users report that Codex is doing planner/writer/reviewer work inline even though Novel is installed. [VERIFIED: user report 2026-04-08]

### Pitfall 2: Treating `<available_agent_types>` As Enforcement
**What goes wrong:** Workflow files look explicit, but runtime behavior still drifts. [VERIFIED: plugins/novel/workflows/write-chapter.md][VERIFIED: plugins/novel/workflows/review.md][VERIFIED: plugins/novel/workflows/autonomous.md]

**Why it happens:** The current test only checks list consistency; nothing makes the list fail-closed at runtime. [VERIFIED: tests/agent-definition.test.cjs]

**How to avoid:** Turn the declared agent list into metadata the installer copies into generated skills and tests. [VERIFIED: bin/install.js][VERIFIED: tests/agent-definition.test.cjs]

**Warning signs:** A workflow declares agents, but the generated public skill does not clearly say delegation is mandatory. [VERIFIED: bin/install.js][VERIFIED: generated `novel-write-chapter` skill preview via `convertNovelCommandToCodexSkill()` on 2026-04-08]

### Pitfall 3: Overstating Natural-Language Safety
**What goes wrong:** Docs imply that freeform requests are as safe as explicit public skill invocation. [VERIFIED: plugins/novel/README.md][VERIFIED: plugins/novel/skills/novel-command-center/SKILL.md]

**Why it happens:** The internal router advertises natural-language routing, but the current regression suite does not verify that path as a production-safe contract. [VERIFIED: plugins/novel/skills/novel-command-center/SKILL.md][VERIFIED: tests/install.test.cjs]

**How to avoid:** Either expose a public router skill and test it, or document explicit `$novel-*` invocation as the supported safe path. [VERIFIED: tests/install.test.cjs][VERIFIED: plugins/novel/README.md]

**Warning signs:** Users succeed only after explicitly telling Codex to use sub-agents. [VERIFIED: user report 2026-04-08]

## Code Examples

Verified patterns from the current codebase:

### Declaring Named Agents Inside a Workflow
```md
<available_agent_types>
Valid novel-creator subagent types (use exact names):
- novel-planner — 创建章节大纲
- novel-writer — 产出章节正文
- novel-editor — 润色优化文字
- novel-verifier — 一致性审核
</available_agent_types>

SpawnAgent(
  agent: novel-planner,
  input: { ... },
  output: chapters/outlines/outline-${CHAPTER_NUMBER}.md
)
```
Source: `plugins/novel/workflows/write-chapter.md`. [VERIFIED: plugins/novel/workflows/write-chapter.md]

### Current Install-Time Codex Assertions
```js
assert.ok(read(skillPath).includes('## C. SpawnAgent() → spawn_agent Mapping'));
assert.ok(read(configPath).includes('[agents.novel-architect]'));
assert.ok(read(conventionsPath).includes('spawn_agent'));
```
Source: `tests/install.test.cjs`. [VERIFIED: tests/install.test.cjs]

### Current Fail-Open Policy Text
```md
- `SpawnAgent(...)`
  Use Codex named agents by default.
  ...
  Only fall back to inline execution if named agents are unavailable or the workflow is trivially small.
```
Source: `plugins/novel/commands/_codex-conventions.md`. [VERIFIED: plugins/novel/commands/_codex-conventions.md]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Treating install success as the main Codex compatibility signal. [VERIFIED: tests/install.test.cjs] | Treating install correctness and execution correctness as separate Phase 4 gates. [VERIFIED: user report 2026-04-08][VERIFIED: tests/install.test.cjs] | This research update on 2026-04-08. [VERIFIED: user request 2026-04-08] | Prevents future regressions where Novel is present but the runtime contract is broken. [VERIFIED: user report 2026-04-08] |
| "Use named agents by default" with inline fallback. [VERIFIED: plugins/novel/commands/_codex-conventions.md] | Fail-closed delegation for agent-heavy production workflows. [VERIFIED: plugins/novel/workflows/write-chapter.md][VERIFIED: plugins/novel/workflows/review.md][VERIFIED: plugins/novel/workflows/autonomous.md] | Planned Phase 4 hardening. [VERIFIED: .planning/ROADMAP.md][VERIFIED: user request 2026-04-08] | Makes misconfiguration visible instead of silently degrading behavior. [VERIFIED: user report 2026-04-08] |

**Deprecated/outdated:**
- Treating "Novel installed successfully" as the sole acceptance criterion for Codex production safety is no longer sufficient. [VERIFIED: user report 2026-04-08][VERIFIED: tests/install.test.cjs]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Codex may expose a stronger runtime introspection hook than prompt-level instruction for agent availability or failed delegation. [ASSUMED] | Open Questions | Could change how strict the Phase 4 preflight implementation should be. |
| A2 | The best safe production router may depend on current Codex behavior and user expectations beyond what this repo alone can verify. [ASSUMED] | Open Questions | Could change whether Phase 4 should expose a public router skill or only document explicit `$novel-*` entrypoints. |

## Open Questions (RESOLVED)

1. **Can Codex expose a deterministic runtime preflight for agent availability or failed delegation from inside a public skill?**
   - What we know: the current repo has no runtime introspection hook beyond generated prompt text, installed agent config, and the `validate` CLI. [VERIFIED: bin/install.js][VERIFIED: plugins/novel/commands/_codex-conventions.md]
   - Resolution: Phase 4 will not depend on an unverified Codex-only introspection mechanism. The production-safe path is to harden the generated public skill contract and `_codex-conventions.md` so workflow-declared named-agent stages fail closed at the prompt surface, and to surface `node bin/install.js validate --codex --global` or the equivalent repair path when delegation prerequisites are in doubt. [VERIFIED: user request 2026-04-08][VERIFIED: .planning/ROADMAP.md]
   - Implementation consequence: any future stronger runtime preflight remains a later enhancement; Phase 4 acceptance will be based on deterministic source/install/test artifacts inside this repo. [VERIFIED: tests/install.test.cjs][VERIFIED: tests/agent-definition.test.cjs]

2. **Should the safe production router be explicit `$novel-*` only, or should Phase 4 expose one public router skill?**
   - What we know: README and command-center docs mention natural-language routing, while install tests intentionally keep `novel-command-center` hidden from the public top-level skill surface. [VERIFIED: plugins/novel/README.md][VERIFIED: plugins/novel/skills/novel-command-center/SKILL.md][VERIFIED: tests/install.test.cjs]
   - Resolution: the supported and tested safe path for Codex will remain the explicit public `$novel-*` skills generated from command files. The internal command center stays an internal helper and documentation may mention natural-language routing as a convenience, but Phase 4 reliability guarantees and automated checks will target explicit public skill entrypoints rather than a new public router surface. [VERIFIED: plugins/novel/README.md][VERIFIED: tests/install.test.cjs]
   - Implementation consequence: Phase 4 hardening should improve generated public skills and their contracts, not expose a separate top-level router as the primary safe path. [VERIFIED: .planning/ROADMAP.md][VERIFIED: user request 2026-04-08]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | `bin/install.js` and all current tests. [VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs] | ✓ [VERIFIED: node --version] | `v24.13.1` [VERIFIED: node --version] | None needed; repo minimum is `>=20.0.0`. [VERIFIED: package.json] |
| npm | Full test-suite convenience command. [VERIFIED: package.json] | ✓ [VERIFIED: npm --version] | `11.8.0` [VERIFIED: npm --version] | Use `node --test tests/*.test.cjs` if npm is unavailable. [VERIFIED: package.json] |

**Missing dependencies with no fallback:**
- None for this research/update phase. [VERIFIED: package.json][VERIFIED: node --version][VERIFIED: npm --version]

**Missing dependencies with fallback:**
- None. [VERIFIED: package.json][VERIFIED: node --version][VERIFIED: npm --version]

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Node built-in `node:test`. [VERIFIED: tests/install.test.cjs][VERIFIED: tests/agent-definition.test.cjs] |
| Config file | None detected in the repo root. [VERIFIED: no `jest/vitest/pytest/mocha/ava` config files found via `rg --files`] |
| Quick run command | `node --test tests/install.test.cjs tests/agent-definition.test.cjs tests/codex-execution-contract.test.cjs tests/codex-routing-contract.test.cjs tests/readme-contract.test.cjs` [PLANNED IN 04-02] |
| Full suite command | `npm test` [VERIFIED: package.json] |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FLOW-02 | Codex routing surfaces and public skill guidance should direct users into the intended safe Novel execution path. [VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: plugins/novel/README.md] | unit/static | `node --test tests/install.test.cjs tests/codex-routing-contract.test.cjs` | ❌ planned in 04-02 |
| FLOW-03 | Existing long-form users should keep the same workflow shape while named-agent delegation remains explicit and correct. [VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: plugins/novel/workflows/write-chapter.md] | unit/static/manual smoke | `node --test tests/install.test.cjs tests/codex-execution-contract.test.cjs` | ❌ planned in 04-02 |
| QUAL-01 | Existing test suite stays green after hardening. [VERIFIED: .planning/REQUIREMENTS.md] | regression | `npm test` | ✅ |
| QUAL-02 | New tests catch Codex execution-contract regressions in addition to existing install and workflow-reference regressions. [VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: tests/install.test.cjs][VERIFIED: tests/agent-definition.test.cjs] | unit/static | `node --test tests/agent-definition.test.cjs tests/codex-execution-contract.test.cjs tests/codex-routing-contract.test.cjs` | ❌ planned in 04-02 |
| QUAL-03 | Docs explain both story-format behavior and Codex execution guarantees. [VERIFIED: .planning/REQUIREMENTS.md][VERIFIED: plugins/novel/README.md] | docs/static | `node --test tests/readme-contract.test.cjs` | ❌ planned in 04-02 |

### Sampling Rate
- **Per task commit:** `node --test tests/install.test.cjs tests/agent-definition.test.cjs tests/codex-execution-contract.test.cjs tests/codex-routing-contract.test.cjs tests/readme-contract.test.cjs` once the new 04-02 tests exist; before that, use the current install/agent-definition subset during incremental work
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green plus one manual Codex UAT that confirms a named-agent workflow announces and uses the expected agents before `/gsd-verify-work`. [VERIFIED: user report 2026-04-08]

### Planned Test Additions
- [ ] `tests/codex-execution-contract.test.cjs` — assert that agent-heavy generated skills fail closed and do not allow inline fallback; owned by `04-02` Task 3; covers FLOW-03 and QUAL-02. [VERIFIED: tests/install.test.cjs][VERIFIED: plugins/novel/commands/_codex-conventions.md]
- [ ] `tests/codex-routing-contract.test.cjs` — assert the documented/public safe path for Codex routing and public skill exposure; owned by `04-02` Task 3; covers FLOW-02 and QUAL-02. [VERIFIED: plugins/novel/README.md][VERIFIED: tests/install.test.cjs]
- [ ] `tests/readme-contract.test.cjs` — assert README distinguishes installation success from runtime execution correctness; owned by `04-02` Task 3; covers QUAL-03. [VERIFIED: plugins/novel/README.md]
- [ ] Extend `tests/agent-definition.test.cjs` — require explicit execution-policy metadata for every workflow that declares named agents; owned by `04-02` Task 3; covers QUAL-02. [VERIFIED: tests/agent-definition.test.cjs][VERIFIED: rg `SpawnAgent(` under `plugins/novel/workflows/*.md`]

**No separate Wave 0 bootstrap plan is required.** Existing Node test infrastructure is already present; the missing files above are planned deliverables inside `04-02`, not a prerequisite phase outside it. [VERIFIED: package.json][VERIFIED: .planning/phases/04-routing-compatibility-docs/04-02-PLAN.md]

## Security Domain

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no — the inspected Phase 4 surfaces do not implement authentication. [VERIFIED: bin/install.js][VERIFIED: plugins/novel/README.md][VERIFIED: tests/install.test.cjs][VERIFIED: tests/agent-definition.test.cjs] | None in scope. |
| V3 Session Management | no — the inspected Phase 4 surfaces do not manage sessions. [VERIFIED: bin/install.js][VERIFIED: plugins/novel/README.md][VERIFIED: tests/install.test.cjs][VERIFIED: tests/agent-definition.test.cjs] | None in scope. |
| V4 Access Control | no — the inspected Phase 4 surfaces do not implement authorization rules. [VERIFIED: bin/install.js][VERIFIED: plugins/novel/README.md][VERIFIED: tests/install.test.cjs][VERIFIED: tests/agent-definition.test.cjs] | None in scope. |
| V5 Input Validation | yes — CLI args and workflow arguments remain part of the install/routing surface. [VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs] | Keep `parseArgs()` validation and add execution-policy validation for generated skills/workflows. [VERIFIED: bin/install.js][VERIFIED: tests/install.test.cjs] |
| V6 Cryptography | no — the inspected Phase 4 surfaces do not introduce cryptographic handling. [VERIFIED: bin/install.js][VERIFIED: plugins/novel/README.md][VERIFIED: tests/install.test.cjs][VERIFIED: tests/agent-definition.test.cjs] | None in scope. |

### Known Threat Patterns for This Stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Silent inline execution of delegated steps | Tampering | Fail-closed execution policy plus generated-skill contract tests. [VERIFIED: plugins/novel/commands/_codex-conventions.md][VERIFIED: tests/install.test.cjs] |
| Partial install or config drift that leaves agent registrations incomplete | Tampering | Keep `validateRuntime()` and add runtime-facing preflight/error messaging. [VERIFIED: bin/install.js] |
| Untested implicit routing path that may not load the intended Novel workflow surface | Spoofing | Prefer explicit public invocation or expose one tested public router entrypoint. [VERIFIED: plugins/novel/README.md][VERIFIED: tests/install.test.cjs] |

## Sources

### Primary (HIGH confidence)
- `.planning/ROADMAP.md` - Phase 4 goal and scope. [VERIFIED: .planning/ROADMAP.md]
- `.planning/REQUIREMENTS.md` - Phase 4 requirement IDs and acceptance scope. [VERIFIED: .planning/REQUIREMENTS.md]
- `plugins/novel/README.md` - Codex install model, routing claims, and public entrypoints. [VERIFIED: plugins/novel/README.md]
- `plugins/novel/commands/_codex-conventions.md` - Current `SpawnAgent` execution policy and inline fallback language. [VERIFIED: plugins/novel/commands/_codex-conventions.md]
- `plugins/novel/commands/write-chapter.md` - Public command surface used to generate a Codex skill. [VERIFIED: plugins/novel/commands/write-chapter.md]
- `plugins/novel/workflows/write-chapter.md` - Multi-agent production workflow. [VERIFIED: plugins/novel/workflows/write-chapter.md]
- `plugins/novel/workflows/review.md` - Verifier-driven workflow surface. [VERIFIED: plugins/novel/workflows/review.md]
- `plugins/novel/workflows/autonomous.md` - Looping multi-agent workflow surface. [VERIFIED: plugins/novel/workflows/autonomous.md]
- `plugins/novel/skills/novel-command-center/SKILL.md` - Natural-language routing contract. [VERIFIED: plugins/novel/skills/novel-command-center/SKILL.md]
- `plugins/novel/skills/novel-command-center/agents/openai.yaml` - Implicit invocation hint for the internal router. [VERIFIED: plugins/novel/skills/novel-command-center/agents/openai.yaml]
- `plugins/novel/skills/novel-writing/SKILL.md` - Internal writing support role. [VERIFIED: plugins/novel/skills/novel-writing/SKILL.md]
- `bin/install.js` - Install/runtime materialization logic, public skill generation, and Codex agent registration. [VERIFIED: bin/install.js]
- `tests/install.test.cjs` - Current install and conversion coverage. [VERIFIED: tests/install.test.cjs]
- `tests/agent-definition.test.cjs` - Current workflow-agent contract coverage. [VERIFIED: tests/agent-definition.test.cjs]
- `node --version` / `npm --version` / `node --test tests/install.test.cjs tests/agent-definition.test.cjs` - Environment availability and current test pass status. [VERIFIED: executed 2026-04-08]

### Secondary (MEDIUM confidence)
- User report dated 2026-04-08 describing correct installation but incorrect initial runtime delegation in Codex. [VERIFIED: user report 2026-04-08]

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - based on direct inspection of `package.json`, `bin/install.js`, the installed-skill generator, and executed environment checks. [VERIFIED: package.json][VERIFIED: bin/install.js][VERIFIED: node --version][VERIFIED: npm --version]
- Architecture: HIGH - based on direct workflow, command, installer, and test inspection. [VERIFIED: plugins/novel/commands/_codex-conventions.md][VERIFIED: plugins/novel/workflows/write-chapter.md][VERIFIED: plugins/novel/workflows/review.md][VERIFIED: plugins/novel/workflows/autonomous.md][VERIFIED: bin/install.js]
- Pitfalls: HIGH - based on direct code/test gaps plus a real user-reported runtime failure mode. [VERIFIED: tests/install.test.cjs][VERIFIED: tests/agent-definition.test.cjs][VERIFIED: user report 2026-04-08]

**Research date:** 2026-04-08
**Valid until:** 2026-04-22
