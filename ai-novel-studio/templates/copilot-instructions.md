# Instructions for AI Novel Studio

- Use the `ans-*` skill surface when the user asks for Novel or uses an `ans-*` command.
- Treat `/ans-*` or `ans-*` as command invocations and load the matching file from `.github/skills/ans-*`.
- When a command asks to spawn a named subagent, prefer the matching custom agent from `.github/agents`.
- Keep the project root as the novel workspace root: `PROJECT.md`, `CHARACTERS.md`, `TIMELINE.md`, `ROADMAP.md`, and `STATE.md` live there.
- Structured writing artifacts live under `chapters/`, `characters/`, `research/`, and `reviews/`.
- Do not apply ANS workflows unless the user explicitly asks for them.
