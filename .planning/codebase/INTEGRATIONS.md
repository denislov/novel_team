# External Integrations

**Analysis Date:** 2026-04-07

## APIs & External Services

**Remote services used by executable code:**
- None detected in the repository's Node or Python source. `bin/install.js` and `plugins/novel/scripts/*.py` do not call HTTP APIs, SaaS SDKs, databases, or webhook endpoints.

**Host AI runtimes:**
- Claude Code and Codex are the target environments for installed output, but this repo integrates with them through filesystem conventions rather than network APIs.
  - Claude targets: `~/.claude/commands/novel/`, `~/.claude/agents/`, and `~/.claude/novel/`
  - Codex targets: `~/.codex/skills/`, `~/.codex/agents/`, `~/.codex/config.toml`, and `~/.codex/novel/`
- Relevant code paths: `installClaudeRuntime()`, `installCodexRuntime()`, and `mergeCodexConfig()` in `bin/install.js`

## Data Storage

**Databases:**
- None

**File Storage:**
- Local filesystem only
  - Repo source bundle lives under `plugins/novel/`
  - Installed support bundle is copied to `novel/` under the chosen Claude or Codex config root
  - Novel project state for end users is stored as root-level Markdown files like `PROJECT.md`, `STATE.md`, and `ROADMAP.md`, plus `chapters/`, `characters/`, `research/`, and `reviews/`

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- None in executable code

**Installation metadata only:**
- `.agents/plugins/marketplace.json` declares `"authentication": "ON_INSTALL"` for the legacy local marketplace entry, but that is metadata for the host environment, not an auth flow implemented in this repo
- `plugins/novel/.claude-plugin/plugin.json` and `plugins/novel/.codex-plugin/plugin.json` describe plugin identity only

## Monitoring & Observability

**Error Tracking:**
- None

**Analytics:**
- None

**Logs:**
- Stdout/stderr only
  - `bin/install.js` prints human-readable install/validate output with ANSI colors
  - `plugins/novel/scripts/*.py` print JSON, `key=value`, or Markdown reports depending on the command

## CI/CD & Deployment

**Hosting:**
- None. This project is not a hosted application.

**Distribution:**
- Local CLI install via `node bin/install.js ...`
- Optional `npx` usage is documented in `README.md`

**CI Pipeline:**
- None detected. There is no `.github/workflows/` or other CI config in the repo.

## Environment Configuration

**Development:**
- Required environment variables:
  - `CODEX_HOME` - optional override for Codex config root in `bin/install.js`
  - `CLAUDE_CONFIG_DIR` - optional override for Claude config root in `bin/install.js`
- Required executables:
  - `node` - for install/update/validate/uninstall
  - `python3` - for workflow helper scripts referenced throughout `plugins/novel/workflows/*.md`
- No secrets or API keys are required by the repo itself

**Staging:**
- Not applicable

**Production:**
- The closest equivalent is the user's actual Claude/Codex config directory
- `config.toml` under the Codex target is mutated in place by `mergeCodexConfig()` and cleaned up by `stripNovelFromCodexConfig()`

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Local Tooling Boundaries

**Python subprocess integration:**
- Novel workflows rely on local subprocess execution rather than internal library calls
  - `plugins/novel/workflows/progress.md` and `plugins/novel/workflows/next.md` call `python3 scripts/novel_state.py`
  - `plugins/novel/workflows/write-chapter.md` and `plugins/novel/workflows/polish.md` call `python3 scripts/chapter_ops.py`
  - `plugins/novel/workflows/map-base.md` calls `python3 scripts/map_base.py`
- Within Python, `plugins/novel/scripts/chapter_ops.py` shells out to `plugins/novel/scripts/novel_state.py refresh` via `subprocess.run(...)`

**Config-file integration:**
- Codex agent registration is emitted into `config.toml` with per-agent TOML files under `agents/`
- Claude integration is file-drop based: command markdown goes into `commands/novel/` and agent markdown into `agents/`

## Practical Guidance

- Treat the filesystem as the main integration surface. Changes to target-directory logic in `bin/install.js` have the highest blast radius.
- There are no remote APIs to stub, but there are several host-environment contracts to preserve:
  - directory names
  - config file markers
  - rewritten prompt paths
  - Python executable availability

---

*Integration audit: 2026-04-07*
*Update when host-runtime targets or filesystem contracts change*
