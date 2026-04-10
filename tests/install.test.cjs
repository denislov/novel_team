const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { afterEach, beforeEach, describe, test } = require('node:test');

const {
  CODEX_AGENT_SANDBOX,
  LEGACY_INTERNAL_SKILLS,
  NOVEL_CODEX_MARKER,
  convertClaudeAgentToCodexAgent,
  convertNovelCommandToClaudeSkill,
  convertNovelCommandToCodexSkill,
  generateCodexAgentToml,
  getRuntimeUsageHints,
  getNovelCodexSkillAdapterHeader,
  installRuntime,
  listSourceAgents,
  listSourceCommands,
  listPublicCodexSkills,
  parseArgs,
  promptPathFor,
  sourceRoot,
  stripNovelFromCodexConfig,
  uninstallRuntime,
  validateRuntime,
} = require('../bin/install.js');

function mkTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'novel-tool-'));
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

describe('installRuntime', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = mkTempDir();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('installs Claude skills, agents, and support bundle with rewritten references', () => {
    const result = installRuntime({
      runtime: 'claude',
      isGlobal: true,
      explicitConfigDir: tmpDir,
    });

    assert.ok(result.ok, 'Claude install should validate');

    const supportRoot = promptPathFor(path.join(tmpDir, 'novel'));
    const skillPath = path.join(tmpDir, 'skills', 'novel-new-project', 'SKILL.md');
    const workflowPath = path.join(tmpDir, 'novel', 'workflows', 'new-project.md');
    const agentPath = path.join(tmpDir, 'agents', 'novel-architect.md');
    const progressWorkflowPath = path.join(tmpDir, 'novel', 'workflows', 'progress.md');
    const nextWorkflowPath = path.join(tmpDir, 'novel', 'workflows', 'next.md');

    assert.ok(fs.existsSync(skillPath), 'Claude skill should exist');
    assert.ok(fs.existsSync(agentPath), 'Claude agent should exist');
    assert.ok(fs.existsSync(path.join(tmpDir, 'novel', 'references', 'writing-guide.md')),
      'Claude support bundle should ship references');
    assert.ok(!fs.existsSync(path.join(tmpDir, 'novel', 'skills')),
      'Claude support bundle should not ship source skills');
    assert.ok(!fs.existsSync(path.join(tmpDir, 'commands', 'novel')),
      'Claude install should no longer expose the legacy command surface');

    assert.ok(read(skillPath).includes(`name: "novel-new-project"`),
      'Claude skill should declare the generated skill name');
    assert.ok(read(skillPath).includes('allowed-tools:'),
      'Claude skill should preserve allowed-tools');
    assert.ok(read(skillPath).includes(`@${supportRoot}/workflows/new-project.md`),
      'Claude skill should reference installed workflow path');
    assert.ok(read(workflowPath).includes(`${supportRoot}/scripts/novel_state.cjs`),
      'Installed workflow should reference installed script path');
    assert.ok(read(workflowPath).includes('story_format'),
      'Installed workflow should include story-format initialization contract');
    assert.ok(read(progressWorkflowPath).includes('STORY_FORMAT'),
      'Installed progress workflow should expose story format in reporting');
    assert.ok(read(nextWorkflowPath).includes('story_collection'),
      'Installed next workflow should describe collection-aware routing');
    assert.ok(read(agentPath).includes(`${supportRoot}/references/`),
      'Claude agent should reference installed references directory');
    assert.ok(read(agentPath).includes('writing-guide.md'),
      'Claude agent should reference the writing guide');
  });

  test('installs Codex skills, config.toml, and agent toml files', () => {
    const result = installRuntime({
      runtime: 'codex',
      isGlobal: true,
      explicitConfigDir: tmpDir,
    });

    assert.ok(result.ok, 'Codex install should validate');

    const supportRoot = promptPathFor(path.join(tmpDir, 'novel'));
    const skillPath = path.join(tmpDir, 'skills', 'novel-new-project', 'SKILL.md');
    const writeChapterSkillPath = path.join(tmpDir, 'skills', 'novel-write-chapter', 'SKILL.md');
    const reviewSkillPath = path.join(tmpDir, 'skills', 'novel-review', 'SKILL.md');
    const commandPath = path.join(tmpDir, 'novel', 'commands', 'new-project.md');
    const configPath = path.join(tmpDir, 'config.toml');
    const agentTomlPath = path.join(tmpDir, 'agents', 'novel-architect.toml');

    assert.ok(fs.existsSync(skillPath), 'Codex skill should exist');
    assert.ok(fs.existsSync(commandPath), 'Codex support command should exist');
    assert.ok(fs.existsSync(path.join(tmpDir, 'novel', 'references', 'command-center.md')),
      'Codex support bundle should ship routing references');
    assert.ok(!fs.existsSync(path.join(tmpDir, 'novel', 'skills')),
      'Codex support bundle should not ship source skills');
    assert.ok(fs.existsSync(agentTomlPath), 'Codex agent toml should exist');
    assert.ok(read(skillPath).includes('## C. SpawnAgent() → spawn_agent Mapping'),
      'Codex skill should contain explicit spawn_agent mapping');
    assert.ok(read(skillPath).includes('## C1. Required Named Agents'),
      'Generated Codex skill should include a required named-agent contract');
    assert.ok(read(skillPath).includes('`novel-architect`'),
      'Generated Codex skill should include required architect agent');
    assert.ok(read(skillPath).includes('`novel-researcher`'),
      'Generated Codex skill should include conditional or required researcher agent');
    assert.ok(read(skillPath).includes('Do not inline delegated stages'),
      'Generated Codex skill should reject inline fallback for delegated stages');
    assert.ok(read(skillPath).includes('validate --codex --global'),
      'Generated Codex skill should include validation guidance');
    assert.ok(read(skillPath).includes(`@${supportRoot}/workflows/new-project.md`),
      'Generated Codex skill should point at installed workflow');
    assert.ok(read(skillPath).includes('{{NOVEL_ARGS}}'),
      'Generated Codex skill should use Codex argument placeholder');
    assert.ok(read(writeChapterSkillPath).includes('`novel-planner`'),
      'write-chapter skill should require planner agent');
    assert.ok(read(writeChapterSkillPath).includes('`novel-editor`'),
      'write-chapter skill should require editor agent');
    assert.ok(read(reviewSkillPath).includes('`novel-verifier`'),
      'review skill should require verifier agent');
    assert.ok(read(commandPath).includes(`@${supportRoot}/workflows/new-project.md`),
      'Installed Codex command should reference installed workflow path');
    assert.ok(read(commandPath).includes('story_format'),
      'Installed Codex command bundle should describe story-format contract');
    assert.ok(read(commandPath).includes('$novel-write-chapter 1'),
      'Codex command bundle should translate slash commands to skill mentions');
    assert.ok(!fs.existsSync(path.join(tmpDir, 'skills', 'novel-command-center')),
      'internal router skill should not be exposed as a top-level Codex skill');
    assert.ok(!fs.existsSync(path.join(tmpDir, 'skills', 'novel-writing')),
      'internal writing guidance skill should not be exposed as a top-level Codex skill');
    assert.ok(read(configPath).includes(NOVEL_CODEX_MARKER),
      'Codex config should include managed Novel marker');
    assert.ok(read(configPath).includes('[agents.novel-architect]'),
      'Codex config should register novel-architect');
    assert.ok(read(agentTomlPath).includes('sandbox_mode = "workspace-write"'),
      'Codex agent config should set sandbox mode');

    const conventionsPath = path.join(tmpDir, 'novel', 'commands', '_codex-conventions.md');
    assert.ok(read(conventionsPath).includes('spawn_agent'),
      'Codex conventions should instruct named agent spawning');
    assert.ok(read(conventionsPath).includes('Do not inline delegated stages'),
      'Codex conventions should reject inline fallback for delegated stages');
    assert.ok(!read(conventionsPath).includes('Only fall back to inline execution if named agents are unavailable or the workflow is trivially small.'),
      'Codex conventions should no longer ship permissive inline fallback wording');

    const projectTemplatePath = path.join(tmpDir, 'novel', 'templates', 'PROJECT.md');
    assert.ok(read(projectTemplatePath).includes('story_format: long_form'),
      'Installed templates should persist story format metadata');
    const roadmapTemplatePath = path.join(tmpDir, 'novel', 'templates', 'ROADMAP.md');
    assert.ok(read(roadmapTemplatePath).includes('story_collection'),
      'Installed roadmap template should describe collection-aware planning');
    assert.ok(read(roadmapTemplatePath).includes('已完成故事'),
      'Installed roadmap template should include collection growth tracking language');
    const outlineTemplatePath = path.join(tmpDir, 'novel', 'templates', 'CHAPTER-OUTLINE.md');
    assert.ok(read(outlineTemplatePath).includes('planning_unit'),
      'Installed outline template should explain story-level planning usage');
    const stateTemplatePath = path.join(tmpDir, 'novel', 'templates', 'STATE.md');
    assert.ok(read(stateTemplatePath).includes('故事队列'),
      'Installed state template should include collection story queue tracking');
  });

  test('validateRuntime detects missing pieces after uninstall', () => {
    installRuntime({
      runtime: 'codex',
      isGlobal: true,
      explicitConfigDir: tmpDir,
    });

    uninstallRuntime({
      runtime: 'codex',
      isGlobal: true,
      explicitConfigDir: tmpDir,
    });

    const validation = validateRuntime({
      runtime: 'codex',
      isGlobal: true,
      explicitConfigDir: tmpDir,
    });

    assert.ok(!validation.ok, 'Validation should fail after uninstall');
    assert.ok(validation.issues.some((issue) => issue.includes('missing support directory')),
      'Validation should report removed support directory');
  });

  test('runtime usage hints explain Claude and Codex skill surfaces', () => {
    const claudeHints = getRuntimeUsageHints('claude', '/tmp/claude-home').join('\n');
    const codexHints = getRuntimeUsageHints('codex', '/tmp/codex-home').join('\n');

    assert.ok(claudeHints.includes('top-level skills'),
      'Claude hints should tell users that the public surface is skills');
    assert.ok(claudeHints.includes('/tmp/claude-home/skills'),
      'Claude hints should point at the installed skills directory');

    assert.ok(codexHints.includes('$novel-*'),
      'Codex hints should mention the public skill surface');
    assert.ok(codexHints.includes('/tmp/codex-home/skills'),
      'Codex hints should point at the installed skills directory');
  });
});

describe('Codex conversion helpers', () => {
  test('convertNovelCommandToClaudeSkill preserves Claude frontmatter and workflow body', () => {
    const converted = convertNovelCommandToClaudeSkill(`---
description: "Create a chapter"
argument-hint: "[--next]"
allowed-tools:
  - Read
  - Write
---
<execution_context>
@../../workflows/write-chapter.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
Use /novel:write-chapter --next to continue.
</process>
`, 'novel-write-chapter', '/tmp/novel');

    assert.ok(converted.includes('name: "novel-write-chapter"'));
    assert.ok(converted.includes('argument-hint: "[--next]"'));
    assert.ok(converted.includes('allowed-tools:'));
    assert.ok(converted.includes('@/tmp/novel/workflows/write-chapter.md'));
    assert.ok(converted.includes('$ARGUMENTS'));
    assert.ok(converted.includes('novel-write-chapter --next'));
    assert.ok(!converted.includes('/novel:write-chapter'));
  });

  test('getNovelCodexSkillAdapterHeader documents spawn_agent behavior', () => {
    const header = getNovelCodexSkillAdapterHeader('novel-write-chapter');
    assert.ok(header.includes('$novel-write-chapter'));
    assert.ok(header.includes('SpawnAgent() → spawn_agent Mapping'));
    assert.ok(header.includes('fork_context: false'));
  });

  test('convertNovelCommandToCodexSkill embeds command body and adapter header', () => {
    const converted = convertNovelCommandToCodexSkill(`---
description: "Create a chapter"
---
<execution_context>
@../../workflows/write-chapter.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
SpawnAgent(agent: novel-writer, input: demo, output: chapter.md)
</process>
`, 'novel-write-chapter', '/tmp/novel');

    assert.ok(converted.includes('name: "novel-write-chapter"'));
    assert.ok(converted.includes('{{NOVEL_ARGS}}'));
    assert.ok(converted.includes('SpawnAgent() → spawn_agent Mapping'));
    assert.ok(converted.includes('@/tmp/novel/workflows/write-chapter.md'));
    assert.ok(converted.includes('$novel-write-chapter'));
  });

  test('convertClaudeAgentToCodexAgent adds codex role header and rewrites commands', () => {
    const converted = convertClaudeAgentToCodexAgent(`---
name: novel-writer
description: Writes chapters
tools: Read, Write
color: green
---

Use /novel:write-chapter to continue.`, '/tmp/novel');

    assert.ok(converted.includes('<codex_agent_role>'), 'should add codex role header');
    assert.ok(converted.includes('role: novel-writer'), 'should preserve agent name');
    assert.ok(converted.includes('tools: Read, Write'), 'should preserve tools in role header');
    assert.ok(converted.includes('$novel-write-chapter'), 'should translate slash command references');
    assert.ok(!converted.includes('color: green'), 'should drop Claude-only frontmatter fields');
  });

  test('generateCodexAgentToml uses workspace-write sandbox and embeds instructions', () => {
    const converted = convertClaudeAgentToCodexAgent(`---
name: novel-verifier
description: Verifies chapter consistency
tools: Read, Grep, Glob
---

Review the chapter.`, '/tmp/novel');

    const toml = generateCodexAgentToml('novel-verifier', converted);

    assert.ok(toml.includes('name = "novel-verifier"'));
    assert.ok(toml.includes('description = "Verifies chapter consistency"'));
    assert.ok(toml.includes(`sandbox_mode = "${CODEX_AGENT_SANDBOX['novel-verifier']}"`));
    assert.ok(toml.includes('<codex_agent_role>'));
  });

  test('stripNovelFromCodexConfig removes managed Novel block', () => {
    const content = `[agents.other]
description = "Other"

${NOVEL_CODEX_MARKER}

[agents.novel-writer]
description = "Novel"
config_file = "/tmp/novel-writer.toml"
`;

    const stripped = stripNovelFromCodexConfig(content);
    assert.ok(stripped.includes('[agents.other]'), 'should preserve unrelated agent config');
    assert.ok(!stripped.includes('novel-writer'), 'should remove Novel agent block');
    assert.ok(!stripped.includes(NOVEL_CODEX_MARKER), 'should remove Novel marker');
  });

  test('parseArgs rejects missing config-dir path', () => {
    assert.throws(
      () => parseArgs(['install', '--config-dir']),
      /requires a path argument/
    );
  });

  test('parseArgs rejects flag-like config-dir value', () => {
    assert.throws(
      () => parseArgs(['install', '--config-dir', '--codex']),
      /requires a path argument/
    );
  });
});

describe('source inventory', () => {
  test('source surfaces have non-zero counts', () => {
    assert.ok(listSourceCommands().length > 0, 'commands should exist');
    assert.ok(listPublicCodexSkills().length > 0, 'public Codex skills should exist');
    assert.strictEqual(listPublicCodexSkills().length, listSourceCommands().length,
      'public Codex skills should be generated from commands');
    for (const legacySkill of LEGACY_INTERNAL_SKILLS) {
      assert.ok(!listPublicCodexSkills().includes(legacySkill), `${legacySkill} should stay out of public installs`);
    }
    assert.ok(listSourceAgents().length > 0, 'agents should exist');
    assert.ok(fs.existsSync(path.join(sourceRoot(), 'references', 'writing-guide.md')),
      'writing guide should exist in top-level references');
  });
});
