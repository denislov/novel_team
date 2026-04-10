---
status: resolved
trigger: "Investigate issue: claude-novel-skills-missing"
created: 2026-04-10T01:21:32+08:00
updated: 2026-04-10T01:31:30+08:00
---

## Current Focus

hypothesis: Confirmed. The installer intentionally writes Claude slash commands and agents, not Claude top-level skills.
test: Reproduced a Claude install into a temp config directory, inspected the installed tree, then updated the installer UX and docs so Claude users are told where to look.
expecting: Claude validation should pass while clearly pointing users to `commands/novel/` and `/novel:*`, avoiding false “install failed” reports based on a missing `skills/` directory.
next_action: none

## Symptoms

expected: 安装完成后，Claude 可用的 skill 目录中应出现 Novel 相关技能，至少能看到对应的 novel 工具入口。
actual: 安装后在 Claude skill 目录中没有看到任何相关 Novel 工具。
errors: 用户暂未提供明确报错，当前已知症状是“安装看似完成，但 skill 目录为空或没有 novel 相关项”。
reproduction: 在当前仓库对应的安装流程下执行面向 Claude 的 Novel 安装，然后检查 Claude skill 目录，发现没有 novel 工具。
started: 问题在本次安装 Claude 时出现；是否曾经成功过未知。

## Eliminated

## Evidence

- timestamp: 2026-04-10T01:24:09+08:00
  checked: bin/install.js runtime target resolution and install functions
  found: Claude global installs target `~/.claude`, but `installClaudeRuntime()` only writes `commands/novel/*.md` and `agents/novel-*.md`; Codex installs target `~/.codex` and `installCodexRuntime()` writes top-level `skills/novel-*`, `agents/*.toml`, and `config.toml`.
  implication: The repo currently implements different public surfaces for Claude and Codex; a missing Claude `skills/` directory is consistent with current code, not with a generic copy failure.

- timestamp: 2026-04-10T01:24:09+08:00
  checked: README.md, plugins/novel/README.md, docs/GETTING-STARTED.md, tests/install.test.cjs
  found: All documentation and tests describe Claude entrypoints as slash commands under `commands/novel/` and Codex entrypoints as `$novel-*` skills under `skills/`.
  implication: Repo docs/tests reinforce the split, so either user expectations are based on a different Claude install model or the Claude runtime contract has changed without code updates here.

- timestamp: 2026-04-10T01:29:46+08:00
  checked: local reproduction via `installRuntime({ runtime: 'claude' ... })`
  found: A temp Claude install validated successfully, created `commands/novel/*` and `agents/novel-*.md`, and did not create a `skills/` directory.
  implication: The user-visible symptom is reproducible as expected runtime behavior, not as an install failure.

- timestamp: 2026-04-10T01:30:17+08:00
  checked: patched `bin/install.js`, `README.md`, `docs/GETTING-STARTED.md`, and `tests/install.test.cjs`
  found: Install/validate output now prints runtime-specific usage hints, including that Claude uses slash commands and not top-level skills.
  implication: Future Claude installs should be self-explanatory at the point of use.

## Resolution

root_cause: The user validated the Claude install using the wrong surface. This installer does not materialize Novel as top-level Claude `skills/`; Claude uses `commands/novel/*.md` plus `agents/novel-*.md`, while only Codex gets top-level `skills/novel-*`.
fix: Added runtime-specific install and validate hints in `bin/install.js` so Claude explicitly says to use `/novel:*` slash commands and check `commands/novel/` instead of `skills/`. Also added the same clarification to `README.md` and `docs/GETTING-STARTED.md`.
verification: `node --test tests/install.test.cjs tests/readme-contract.test.cjs tests/codex-routing-contract.test.cjs`; `node bin/install.js validate --claude --global --config-dir /tmp/novel-claude-repro-YqfGWV`
files_changed:
  - README.md
  - bin/install.js
  - docs/GETTING-STARTED.md
  - tests/install.test.cjs
