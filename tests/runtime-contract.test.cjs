'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..');
const SUPPORT_ROOT = path.join(REPO_ROOT, 'ai-novel-studio');
const COMMANDS_DIR = path.join(REPO_ROOT, 'commands', 'ans');
const WORKFLOWS_DIR = path.join(SUPPORT_ROOT, 'workflows');
const AGENTS_DIR = path.join(REPO_ROOT, 'agents');
const REFERENCES_DIR = path.join(SUPPORT_ROOT, 'references');
const TEMPLATES_DIR = path.join(SUPPORT_ROOT, 'templates');
const ANS_TOOLS_PATH = path.join(SUPPORT_ROOT, 'bin', 'ans-tools.cjs');
const INIT_LIB_PATH = path.join(SUPPORT_ROOT, 'bin', 'lib', 'init.cjs');
const BIN_ROOT = path.join(SUPPORT_ROOT, 'bin');
const { DEFAULTS } = require(path.join(SUPPORT_ROOT, 'bin', 'lib', 'config.cjs'));
const {
  CHAPTER_FRONTMATTER,
  REVIEW_FRONTMATTER,
} = require(path.join(SUPPORT_ROOT, 'bin', 'lib', 'schemas.cjs'));

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function commandFiles() {
  return fs.readdirSync(COMMANDS_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(COMMANDS_DIR, name));
}

function workflowFiles() {
  return fs.readdirSync(WORKFLOWS_DIR)
    .filter((name) => name.endsWith('.md'))
    .map((name) => path.join(WORKFLOWS_DIR, name));
}

function extractExecutionContextRefs(content) {
  const blockMatch = content.match(/<execution_context>\s*([\s\S]*?)\s*<\/execution_context>/);
  if (!blockMatch) return [];

  return blockMatch[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

test('command execution_context references resolve inside the support bundle', () => {
  const missing = [];
  const pattern = /@~\/\.claude\/ai-novel-studio\/([A-Za-z0-9/_\-.]+)/g;

  for (const filePath of commandFiles()) {
    const content = read(filePath);
    for (const match of content.matchAll(pattern)) {
      const relativePath = match[1].replace(/\.+$/, '');
      const referenced = path.join(SUPPORT_ROOT, relativePath);
      if (!fs.existsSync(referenced)) {
        missing.push(`${path.basename(filePath)} -> ${relativePath}`);
      }
    }
  }

  assert.deepEqual(
    missing,
    [],
    `Broken command execution_context references:\n${missing.join('\n')}`
  );
});

test('command execution_context stays thin and only ans:do keeps command-center', () => {
  for (const filePath of commandFiles()) {
    const fileName = path.basename(filePath);
    const refs = extractExecutionContextRefs(read(filePath));
    const expected = [
      `@~/.claude/ai-novel-studio/workflows/${fileName}`,
    ];

    if (fileName === 'do.md') {
      expected.push('@~/.claude/ai-novel-studio/references/command-center.md');
    }

    assert.deepEqual(
      refs,
      expected,
      `${fileName} execution_context should only include routed workflow context`
    );
  }
});

test('every command <context> block exposes ARGUMENTS: $ARGUMENTS', () => {
  // The placeholder is what runtimes substitute with the actual argument
  // string at invocation time:
  //   - Claude Code substitutes $ARGUMENTS natively
  //   - Codex install rewrites $ARGUMENTS → {{ANS_ARGS}} (see bin/install.js)
  //   - other runtimes have similar substitution
  // Every command must surface it so the prompt body sees user input.
  for (const filePath of commandFiles()) {
    const fileName = path.basename(filePath);
    const content = read(filePath);
    const match = content.match(/<context>([\s\S]*?)<\/context>/);
    assert.ok(
      match,
      `${fileName} must have a <context>...</context> block`
    );
    assert.match(
      match[1],
      /(?:^|\n)\s*ARGUMENTS:\s*\$ARGUMENTS\b/,
      `${fileName} <context> must declare "ARGUMENTS: $ARGUMENTS" on a line by itself so runtimes substitute user args at command-invocation time`
    );
  }
});

test('workflow-owned support context moved below commands into workflows', () => {
  const creativeWorkflowNames = [
    'autonomous.md',
    'character.md',
    'new-project.md',
    'plan-arc.md',
    'plan-batch.md',
    'polish.md',
    'quick-draft.md',
    'write-chapter.md',
  ];

  for (const fileName of creativeWorkflowNames) {
    const content = read(path.join(WORKFLOWS_DIR, fileName));
    assert.match(
      content,
      /writing-guide\.md/,
      `${fileName} should pass writing-guide support context inside the workflow`
    );
  }

  for (const fileName of ['autonomous.md', 'review.md', 'write-chapter.md']) {
    const content = read(path.join(WORKFLOWS_DIR, fileName));
    assert.match(
      content,
      /common-pitfalls\.md/,
      `${fileName} should pass common-pitfalls to verifier-facing workflow steps`
    );
  }
});

test('workflow agent references resolve to shipped ans-* agents', () => {
  const availableAgents = new Set(
    fs.readdirSync(AGENTS_DIR)
      .filter((name) => name.endsWith('.md'))
      .map((name) => name.replace(/\.md$/, ''))
  );

  const invalid = [];
  const pattern = /\b(agent|subagent_type):\s*"?([a-z]+-[a-z-]+)"?|\bSpawnAgent\s+([a-z]+-[a-z-]+)\b/g;

  for (const filePath of workflowFiles()) {
    const content = read(filePath);
    for (const match of content.matchAll(pattern)) {
      const agentName = match[2] || match[3];
      if (!agentName || agentName.startsWith('novel-')) {
        invalid.push(`${path.basename(filePath)} -> ${agentName}`);
        continue;
      }
      if (agentName.startsWith('ans-') && !availableAgents.has(agentName)) {
        invalid.push(`${path.basename(filePath)} -> ${agentName}`);
      }
    }
  }

  assert.deepEqual(
    invalid,
    [],
    `Broken workflow agent references:\n${invalid.join('\n')}`
  );
});

test('support bundle contains the compatibility shims required by command markdown', () => {
  const requiredFiles = [
    path.join(SUPPORT_ROOT, 'templates', 'copilot-instructions.md'),
    path.join(SUPPORT_ROOT, 'workflows', 'verify.md'),
    path.join(SUPPORT_ROOT, 'workflows', 'quick-polish.md'),
  ];

  for (const filePath of requiredFiles) {
    assert.ok(fs.existsSync(filePath), `${path.relative(REPO_ROOT, filePath)} should exist`);
  }
});

test('every command has a same-name workflow in the support bundle', () => {
  const missing = [];

  for (const filePath of commandFiles()) {
    const workflowPath = path.join(WORKFLOWS_DIR, path.basename(filePath));
    if (!fs.existsSync(workflowPath)) {
      missing.push(path.basename(filePath));
    }
  }

  assert.deepEqual(
    missing,
    [],
    `Commands without matching workflows:\n${missing.join('\n')}`
  );
});

test('workflow ans-tools invocations only use supported command pairs', () => {
  const allowed = new Set([
    'chapter budget',
    'chapter normalize',
    'chapter promote',
    'check budget',
    'config get',
    'config set',
    'init autonomous',
    'init manager',
    'init new-project',
    'init plan-batch',
    'init progress',
    'init review',
    'init write-chapter',
    'state get',
    'state json',
    'state load',
    'state patch',
    'state range-target',
    'state refresh',
    'state update',
    'state write-target',
    'validate consistency',
    'validate health',
    'verify extract',
  ]);

  const invalid = [];
  // Workflows must invoke ans-tools using the relative form `node bin/ans-tools.cjs`.
  // The absolute `$HOME/.claude/...` form is a Codex-specific concern and is
  // rewritten by `bin/install.js` at install time; the source repo keeps a
  // single canonical form.
  const pattern = /node\s+bin\/ans-tools\.cjs\s+([a-z-]+)(?:\s+([a-z-]+))?/g;
  const banPattern = /node\s+"\$HOME\/\.claude\/ai-novel-studio\/bin\/ans-tools\.cjs"|node\s+"\$ANS_TOOLS"/;

  for (const filePath of [...workflowFiles(), ...fs.readdirSync(AGENTS_DIR).filter((name) => name.endsWith('.md')).map((name) => path.join(AGENTS_DIR, name))]) {
    const content = read(filePath);
    for (const match of content.matchAll(pattern)) {
      const pair = [match[1], match[2]].filter(Boolean).join(' ');
      if (!allowed.has(pair)) {
        invalid.push(`${path.basename(filePath)} -> ${pair}`);
      }
    }
    if (banPattern.test(content)) {
      invalid.push(
        `${path.basename(filePath)} -> uses absolute \`$HOME/.claude/...\` or \`$ANS_TOOLS\` invocation; use relative \`node bin/ans-tools.cjs\` instead. install.js rewrites paths per runtime.`
      );
    }
  }

  assert.deepEqual(
    invalid,
    [],
    `Unsupported ans-tools command pairs found:\n${invalid.join('\n')}`
  );
});

test('agent support-file references resolve inside the support bundle', () => {
  const invalid = [];
  const pattern = /\b(references|templates)\/([A-Za-z0-9._-]+\.md)\b/g;

  for (const fileName of fs.readdirSync(AGENTS_DIR).filter((name) => name.endsWith('.md'))) {
    const filePath = path.join(AGENTS_DIR, fileName);
    const content = read(filePath);
    for (const match of content.matchAll(pattern)) {
      const baseDir = match[1] === 'references' ? REFERENCES_DIR : TEMPLATES_DIR;
      const resolved = path.join(baseDir, match[2]);
      if (!fs.existsSync(resolved)) {
        invalid.push(`${fileName} -> ${match[1]}/${match[2]}`);
      }
    }
  }

  assert.deepEqual(
    invalid,
    [],
    `Broken agent support-file references:\n${invalid.join('\n')}`
  );
});

test('every shipped ans-* agent is referenced by at least one workflow', () => {
  const workflowCorpus = workflowFiles().map(read).join('\n');
  const unreferenced = [];

  for (const name of fs.readdirSync(AGENTS_DIR).filter((file) => file.endsWith('.md')).map((file) => file.replace(/\.md$/, ''))) {
    if (!workflowCorpus.includes(name)) {
      unreferenced.push(name);
    }
  }

  assert.deepEqual(
    unreferenced,
    [],
    `Unreferenced agents:\n${unreferenced.join('\n')}`
  );
});

test('workflow config keys referenced in docs exist in config defaults', () => {
  const knownWorkflowKeys = new Set(Object.keys(DEFAULTS.workflow));
  const seen = new Set();
  const invalid = [];
  const pattern = /config\.workflow\.([a-z_]+)/g;

  for (const filePath of workflowFiles()) {
    const content = read(filePath);
    for (const match of content.matchAll(pattern)) {
      const key = match[1];
      if (!knownWorkflowKeys.has(key)) {
        invalid.push(`${path.basename(filePath)} -> ${key}`);
      }
      seen.add(key);
    }
  }

  assert.deepEqual(
    invalid,
    [],
    `Unknown workflow config keys:\n${invalid.join('\n')}`
  );

  assert.ok(seen.size > 0, 'Expected at least one documented workflow config key');
});

test('verifier extraction contract is declared on both sides of the workflow boundary', () => {
  const writeChapterWorkflow = read(path.join(WORKFLOWS_DIR, 'write-chapter.md'));
  const verifierAgent = read(path.join(AGENTS_DIR, 'ans-verifier.md'));

  assert.ok(
    writeChapterWorkflow.includes('verify extract --report'),
    'write-chapter workflow should consume structured verdict extraction'
  );

  assert.ok(
    verifierAgent.includes('## Structured Verdict'),
    'ans-verifier should instruct the report file to embed a structured verdict block'
  );
});

test('ans-verifier can actually write the review artifact expected by review workflows', () => {
  const verifierAgent = read(path.join(AGENTS_DIR, 'ans-verifier.md'));
  const reviewWorkflow = read(path.join(WORKFLOWS_DIR, 'review.md'));

  assert.match(
    verifierAgent,
    /^tools:\s*.*\bWrite\b/m,
    'ans-verifier must expose the Write tool to generate review-N.md artifacts'
  );

  assert.ok(
    verifierAgent.includes('必须使用 `Write` 将完整报告写入 workflow 指定的输出文件'),
    'ans-verifier should explicitly commit to writing the report artifact'
  );

  assert.ok(
    reviewWorkflow.includes('output: reviews/review-${CHAPTER_NUMBER}.md'),
    'review workflow should continue requesting a concrete review artifact path'
  );
});

test('ans-tools and init helpers expose the workflow contracts used by review/write/plan flows', () => {
  const ansTools = read(ANS_TOOLS_PATH);
  const initLib = read(INIT_LIB_PATH);

  assert.ok(
    ansTools.includes("case 'plan-batch'"),
    'ans-tools should route init plan-batch'
  );

  assert.ok(
    ansTools.includes("return init.cmdInitReview(root, rest[0] || null, raw);"),
    'init review should preserve range text instead of coercing to a single numeric token'
  );

  assert.ok(
    initLib.includes('next_chapter: stats.next_chapter'),
    'write-chapter init payload should expose next_chapter for workflow defaulting'
  );
});

test('bin top-level keeps only true entrypoints', () => {
  const topLevelFiles = fs.readdirSync(BIN_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .sort();

  assert.deepEqual(
    topLevelFiles,
    ['ans-tools.cjs', 'map_base.cjs'],
    `Unexpected top-level bin files:\n${topLevelFiles.join('\n')}`
  );
});

test('known placeholder or parser-hostile relative refs have been removed from markdown sources', () => {
  const invalidPatterns = [
    /\[来源名称\]\(链接\)/,
    /@workflows\/foo\.md/,
    /@workflows\/help\.md\./,
    /@research\/arc-\*\.md/,
  ];

  const corpus = [
    ...commandFiles(),
    ...workflowFiles(),
    ...fs.readdirSync(AGENTS_DIR).filter((name) => name.endsWith('.md')).map((name) => path.join(AGENTS_DIR, name)),
    ...fs.readdirSync(REFERENCES_DIR).filter((name) => name.endsWith('.md')).map((name) => path.join(REFERENCES_DIR, name)),
    ...fs.readdirSync(TEMPLATES_DIR).filter((name) => name.endsWith('.md')).map((name) => path.join(TEMPLATES_DIR, name)),
  ];

  const hits = [];
  for (const filePath of corpus) {
    const content = read(filePath);
    for (const pattern of invalidPatterns) {
      if (pattern.test(content)) {
        hits.push(`${path.relative(REPO_ROOT, filePath)} -> ${pattern}`);
      }
    }
  }

  assert.deepEqual(
    hits,
    [],
    `Parser-hostile placeholder refs still present:\n${hits.join('\n')}`
  );
});

// ─── Frontmatter contract tests ──────────────────────────────────────────────
//
// Each writer/editor/verifier agent advertises its output schema in an
// <output_format> block containing a ```markdown ... ``` code fence with a
// concrete YAML frontmatter example. We extract the keys from that example
// and compare against the canonical schemas in bin/lib/schemas.cjs. This
// catches drift the moment an agent prompt is edited without updating the
// schema (or vice versa).

function extractOutputFormatFrontmatterKeys(filePath) {
  const content = read(filePath);
  const block = content.match(/<output_format>([\s\S]*?)<\/output_format>/);
  if (!block) return null;
  const fence = block[1].match(/```markdown\r?\n([\s\S]*?)\r?\n```/);
  if (!fence) return null;
  const fm = fence[1].match(/^---\r?\n([\s\S]*?)\r?\n---/m);
  if (!fm) return null;
  const keys = [];
  for (const line of fm[1].split(/\r?\n/)) {
    const m = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):/);
    if (m) keys.push(m[1]);
  }
  return keys;
}

test('ans-writer <output_format> frontmatter aligns with CHAPTER_FRONTMATTER', () => {
  const keys = extractOutputFormatFrontmatterKeys(path.join(AGENTS_DIR, 'ans-writer.md'));
  assert.ok(keys, 'ans-writer.md must have an <output_format> block with a ```markdown YAML example');

  const missing = CHAPTER_FRONTMATTER.required.filter((k) => !keys.includes(k));
  assert.deepEqual(
    missing,
    [],
    `ans-writer.md <output_format> 缺失必需字段: ${missing.join(', ')}`
  );

  const offending = CHAPTER_FRONTMATTER.forbidden.filter((k) => keys.includes(k));
  assert.deepEqual(
    offending,
    [],
    `ans-writer.md <output_format> 含有禁止字段（应放进 <structured_returns> 对话回复或正文表格）: ${offending.join(', ')}`
  );
});

test('ans-editor / ans-verifier <output_format> frontmatter aligns with REVIEW_FRONTMATTER', () => {
  for (const agent of ['ans-editor.md', 'ans-verifier.md']) {
    const keys = extractOutputFormatFrontmatterKeys(path.join(AGENTS_DIR, agent));
    assert.ok(keys, `${agent} must have an <output_format> block with a \`\`\`markdown YAML example`);

    const missing = REVIEW_FRONTMATTER.required.filter((k) => !keys.includes(k));
    assert.deepEqual(
      missing,
      [],
      `${agent} <output_format> 缺失 REVIEW_FRONTMATTER 必需字段: ${missing.join(', ')}`
    );
  }
});

test('ans-writer <output_format> does not embed metadata trailer in chapter file', () => {
  const content = read(path.join(AGENTS_DIR, 'ans-writer.md'));
  const block = content.match(/<output_format>([\s\S]*?)<\/output_format>/);
  assert.ok(block, 'ans-writer.md must have an <output_format> block');

  const fence = block[1].match(/```markdown\r?\n([\s\S]*?)\r?\n```/);
  assert.ok(fence, 'ans-writer.md <output_format> must have a ```markdown example block');

  const example = fence[1];
  const forbiddenSections = ['## 章节元数据', '## 创作备注', '## 自检清单'];
  for (const section of forbiddenSections) {
    assert.ok(
      !example.includes(section),
      `ans-writer.md <output_format> 不应在章节文件示例中包含 "${section}" —— 这类元数据应放进 <structured_returns> 的对话回复，不写进 chapters/chapter-N.md`
    );
  }
});

// ─── Character card automation contract tests (P1) ───────────────────────────
//
// Verifier emits `needs_character_update: true|false` in its structured
// verdict. write-chapter and review workflows must consume that signal and
// route to ans-architect's single-card-update mode. new-project must seed
// the protagonist's `characters/<name>.md` so the system has at least one
// card in place from day one.

test('write-chapter / review workflows consume verifier needs_character_update signal', () => {
  for (const wf of ['write-chapter.md', 'review.md']) {
    const content = read(path.join(WORKFLOWS_DIR, wf));
    assert.match(
      content,
      /needs_character_update/,
      `${wf} must reference needs_character_update — verifier-emitted signal cannot be a dead letter`
    );
    assert.match(
      content,
      /subagent_type:\s*"ans-architect"[\s\S]*character_card_update|character_card_update[\s\S]*subagent_type:\s*"ans-architect"/,
      `${wf} must dispatch ans-architect with character_card_update mode when the signal fires`
    );
  }
});

test('write-chapter / review workflows consume verifier needs_state_update signal', () => {
  for (const wf of ['write-chapter.md', 'review.md']) {
    const content = read(path.join(WORKFLOWS_DIR, wf));
    assert.match(
      content,
      /needs_state_update/,
      `${wf} must reference needs_state_update — verifier-emitted signal cannot be a dead letter`
    );
    // The contract: when the signal fires, the verifier's `summary` field is
    // threaded into `state refresh --latest-completed` instead of the
    // generic "已完成第N章" template.
    assert.match(
      content,
      /summary[\s\S]{0,300}--latest-completed|--latest-completed[\s\S]{0,300}summary|--latest-completed\s*"\$VERIFIER_SUMMARY"|--latest-completed\s*"\$LATEST_STATE_SUMMARY"|--latest-completed\s*"\$\{?VERIFIER_SUMMARY|--latest-completed\s*"\$\{?LATEST_STATE_SUMMARY/,
      `${wf} must thread verifier's summary into state refresh --latest-completed when needs_state_update fires`
    );
  }
});

test('new-project workflow gathers minimal user input then brainstorms via architect', () => {
  // The redesigned new-project (P5) only asks the user for:
  //   - story_format (mandatory choice)
  //   - idea (free-form description)
  //   - target_chapters_hint, target_total_words_hint (both optional)
  // Everything else (title, genre, protagonist, golden finger, hard volume/
  // chapter/word/theme targets) is brainstormed by ans-architect in
  // mode:"brainstorm", reviewed by the user, iterated on, then committed.
  const content = read(path.join(WORKFLOWS_DIR, 'new-project.md'));

  // Mandatory user inputs
  for (const field of ['story_format', 'idea']) {
    assert.match(
      content,
      new RegExp(`key:\\s*"${field}"`),
      `new-project §2 must collect "${field}" via AskUserQuestion`
    );
  }

  // Optional hints
  for (const hint of ['target_chapters_hint', 'target_total_words_hint']) {
    assert.match(
      content,
      new RegExp(`\\b${hint}\\b`),
      `new-project §2 must offer "${hint}" as an optional hint (user can leave blank)`
    );
  }
});

test('new-project workflow has a brainstorm phase calling architect with mode:"brainstorm"', () => {
  const content = read(path.join(WORKFLOWS_DIR, 'new-project.md'));
  // The brainstorm phase must invoke ans-architect with brainstorm mode and
  // pass the user's idea as input. No file outputs in this phase.
  assert.match(
    content,
    /mode:\s*"brainstorm"/,
    'new-project must call ans-architect with mode:"brainstorm" — the freewheeling proposal phase'
  );
  assert.match(
    content,
    /<brainstorm_input>[\s\S]*<\/brainstorm_input>/,
    'new-project must wrap brainstorm payload in <brainstorm_input>...</brainstorm_input> XML'
  );
  assert.match(
    content,
    /<user_idea>[\s\S]*<\/user_idea>/,
    'new-project brainstorm_input must contain <user_idea> with the unmodified user prose'
  );
});

test('new-project workflow has a review-and-iterate loop after brainstorm', () => {
  const content = read(path.join(WORKFLOWS_DIR, 'new-project.md'));
  // The user must be given approve/adjust/cancel options, and adjust must
  // feed back into another brainstorm round (with previous_proposal +
  // adjustment_notes available to architect).
  assert.match(
    content,
    /确认通过|approved|APPROVED/i,
    'new-project must offer an "approve" path that exits the iteration loop'
  );
  assert.match(
    content,
    /需要调整|adjustment_notes/,
    'new-project must offer an "adjust" path that captures user feedback'
  );
  assert.match(
    content,
    /<previous_proposal>[\s\S]*<\/previous_proposal>/,
    'new-project must thread the previous proposal back into brainstorm_input on iteration'
  );
  assert.match(
    content,
    /<adjustment_notes>[\s\S]*<\/adjustment_notes>/,
    'new-project must thread adjustment notes back into brainstorm_input on iteration'
  );
  assert.match(
    content,
    /MAX_ITERATIONS|迭代上限/,
    'new-project must guard against infinite iteration with an upper bound'
  );
});

test('new-project workflow commits approved proposal via mode:"commit"', () => {
  const content = read(path.join(WORKFLOWS_DIR, 'new-project.md'));
  // After approval, architect is called again in commit mode with the
  // approved proposal as input. This is the only call that writes files.
  assert.match(
    content,
    /mode:\s*"commit"/,
    'new-project must call ans-architect with mode:"commit" after user approval'
  );
  assert.match(
    content,
    /<approved_proposal>[\s\S]*<\/approved_proposal>/,
    'new-project commit phase must wrap the approved proposal in <approved_proposal>...</approved_proposal>'
  );
});

test('new-project workflow seeds protagonist character card', () => {
  const content = read(path.join(WORKFLOWS_DIR, 'new-project.md'));
  assert.match(
    content,
    /ANS_CHARACTER_CARD_TEMPLATE/,
    'new-project must export ANS_CHARACTER_CARD_TEMPLATE so architect receives the card schema'
  );
  assert.match(
    content,
    /CHARACTER_CARD_TEMPLATE[\s\S]*subagent_type:\s*"ans-architect"|subagent_type:\s*"ans-architect"[\s\S]*CHARACTER_CARD_TEMPLATE/,
    'new-project must pass the character-card template to architect via files_to_read'
  );
  assert.match(
    content,
    /characters\/\$\{(?:protagonist_name|PROTAGONIST_NAME)\}\.md|PROTAGONIST_CARD_PATH/,
    'new-project architect commit must declare characters/${PROTAGONIST_NAME}.md as an output'
  );
});

test('new-project workflow surfaces target_volumes / target_chapters / target_total_words / themes through architect proposal', () => {
  // These tokens still appear in the workflow — but as expected fields of
  // the BRAINSTORM COMPLETE proposal display + the commit landing contract,
  // not as direct user-asked questions.
  const content = read(path.join(WORKFLOWS_DIR, 'new-project.md'));
  for (const field of ['target_volumes', 'target_chapters', 'target_total_words', 'volume_themes', 'chapter_themes', 'target_stories', 'story_themes']) {
    assert.match(
      content,
      new RegExp(`\\b${field}\\b`),
      `new-project must mention "${field}" — it's part of the brainstorm proposal / commit landing contract`
    );
  }
});

test('ans-architect documents brainstorm and commit modes for new-project', () => {
  const content = read(path.join(AGENTS_DIR, 'ans-architect.md'));
  // Two-phase contract: brainstorm (no files) then commit (writes files).
  assert.match(
    content,
    /mode:\s*"brainstorm"/,
    'ans-architect.md must document mode:"brainstorm" — the proposal-only phase'
  );
  assert.match(
    content,
    /mode:\s*"commit"/,
    'ans-architect.md must document mode:"commit" — the file-writing phase'
  );
  assert.match(
    content,
    /BRAINSTORM COMPLETE/,
    'ans-architect.md must specify the ## BRAINSTORM COMPLETE structured return for brainstorm mode'
  );
  // Brainstorm must not write files.
  assert.match(
    content,
    /(?:绝对不|不要|不能).{0,20}(?:写文件|写任何文件)|brainstorm.{0,200}(?:不写文件|不写任何文件)/i,
    'ans-architect.md must explicitly forbid file writes in brainstorm mode'
  );
});

test('plan-arc workflow uses brainstorm-first pattern (scope: arc)', () => {
  const content = read(path.join(WORKFLOWS_DIR, 'plan-arc.md'));

  // Minimal user input: just an arc seed (idea/name)
  assert.match(
    content,
    /ARC_SEED|arc_seed/,
    'plan-arc must collect a minimal arc_seed (name or idea) instead of asking many micro-questions'
  );

  // Brainstorm phase
  assert.match(
    content,
    /mode:\s*"brainstorm"[\s\S]{0,200}scope:\s*"arc"|scope:\s*"arc"[\s\S]{0,200}mode:\s*"brainstorm"/,
    'plan-arc must call ans-architect with mode:"brainstorm" + scope:"arc"'
  );
  assert.match(
    content,
    /<arc_brainstorm_input>[\s\S]*<\/arc_brainstorm_input>/,
    'plan-arc must wrap brainstorm payload in <arc_brainstorm_input>...</arc_brainstorm_input> XML'
  );

  // Review-iterate loop
  assert.match(
    content,
    /<previous_proposal>[\s\S]*<\/previous_proposal>/,
    'plan-arc must thread previous proposal back into brainstorm on iteration'
  );
  assert.match(
    content,
    /<adjustment_notes>[\s\S]*<\/adjustment_notes>/,
    'plan-arc must thread adjustment notes back into brainstorm on iteration'
  );
  assert.match(
    content,
    /MAX_ITERATIONS|迭代上限/,
    'plan-arc must guard against infinite iteration with an upper bound'
  );

  // Commit phase
  assert.match(
    content,
    /mode:\s*"commit"[\s\S]{0,200}scope:\s*"arc"|scope:\s*"arc"[\s\S]{0,200}mode:\s*"commit"/,
    'plan-arc must call ans-architect with mode:"commit" + scope:"arc" after approval'
  );
  assert.match(
    content,
    /<approved_proposal>[\s\S]*<\/approved_proposal>/,
    'plan-arc commit phase must wrap the approved proposal in <approved_proposal>...</approved_proposal>'
  );
});

test('ans-architect documents arc-scope brainstorm and commit modes', () => {
  const content = read(path.join(AGENTS_DIR, 'ans-architect.md'));
  assert.match(
    content,
    /scope:\s*"arc"/,
    'ans-architect.md must document scope:"arc" for plan-arc-driven calls'
  );
  assert.match(
    content,
    /ARC BRAINSTORM COMPLETE/,
    'ans-architect.md must specify ## ARC BRAINSTORM COMPLETE structured return'
  );
});

test('plan-batch workflow uses brainstorm-first pattern', () => {
  const content = read(path.join(WORKFLOWS_DIR, 'plan-batch.md'));

  // Brainstorm phase: planner produces high-level batch blueprint, no full outlines
  assert.match(
    content,
    /mode:\s*"brainstorm"/,
    'plan-batch must call ans-planner with mode:"brainstorm" before generating any outlines'
  );
  assert.match(
    content,
    /<batch_brainstorm_input>[\s\S]*<\/batch_brainstorm_input>/,
    'plan-batch must wrap brainstorm payload in <batch_brainstorm_input>...</batch_brainstorm_input> XML'
  );

  // Review-iterate loop
  assert.match(
    content,
    /<previous_proposal>[\s\S]*<\/previous_proposal>/,
    'plan-batch must thread previous proposal back into brainstorm on iteration'
  );
  assert.match(
    content,
    /<adjustment_notes>[\s\S]*<\/adjustment_notes>/,
    'plan-batch must thread adjustment notes back into brainstorm on iteration'
  );
  assert.match(
    content,
    /MAX_ITERATIONS|迭代上限/,
    'plan-batch must guard against infinite iteration with an upper bound'
  );

  // Commit phase: per-chapter expansion based on approved blueprint
  assert.match(
    content,
    /mode:\s*"commit"/,
    'plan-batch must call ans-planner with mode:"commit" per chapter after approval'
  );
  assert.match(
    content,
    /approved_proposal/,
    'plan-batch commit phase must thread the approved batch blueprint into each chapter commit'
  );
});

test('ans-planner documents brainstorm and commit modes for plan-batch', () => {
  const content = read(path.join(AGENTS_DIR, 'ans-planner.md'));
  assert.match(
    content,
    /mode:\s*"brainstorm"/,
    'ans-planner.md must document mode:"brainstorm" for plan-batch high-level blueprint'
  );
  assert.match(
    content,
    /mode:\s*"commit"/,
    'ans-planner.md must document mode:"commit" for per-chapter outline expansion'
  );
  assert.match(
    content,
    /BATCH BRAINSTORM COMPLETE/,
    'ans-planner.md must specify ## BATCH BRAINSTORM COMPLETE structured return'
  );
  // Brainstorm must not write outline files.
  assert.match(
    content,
    /(?:绝对不|不要|不能).{0,30}(?:写文件|写大纲|写任何文件)|brainstorm.{0,300}(?:不写文件|不写任何大纲|不写任何文件)/i,
    'ans-planner.md must explicitly forbid file writes in brainstorm mode'
  );
});

test('character --add workflow uses brainstorm-first pattern (scope: character)', () => {
  const content = read(path.join(WORKFLOWS_DIR, 'character.md'));

  // Minimal user input: name + role + optional seed
  assert.match(
    content,
    /character_seed/,
    'character --add must collect a minimal character_seed (free-form description) instead of asking 8 micro-questions'
  );

  // The 8 old micro-questions should be removed (identity, personality_core,
  // external_tags, internal_tags, relation_to_protagonist, first_appearance
  // are no longer asked in §3.1)
  const addBlock = content.match(/<add_character>([\s\S]*?)<\/add_character>/);
  assert.ok(addBlock, 'character.md must have an <add_character> block');
  const askedAsQuestions = (addBlock[1].match(/key:\s*"(identity|personality_core|external_tags|internal_tags|relation_to_protagonist|first_appearance)"/g) || []).length;
  assert.strictEqual(
    askedAsQuestions,
    0,
    'character --add must NOT ask the user for identity/personality_core/external_tags/internal_tags/relation_to_protagonist/first_appearance — those are brainstormed by ans-architect'
  );

  // Brainstorm phase
  assert.match(
    content,
    /mode:\s*"brainstorm"[\s\S]{0,200}scope:\s*"character"|scope:\s*"character"[\s\S]{0,200}mode:\s*"brainstorm"/,
    'character --add must call ans-architect with mode:"brainstorm" + scope:"character"'
  );
  assert.match(
    content,
    /<character_brainstorm_input>[\s\S]*<\/character_brainstorm_input>/,
    'character --add must wrap brainstorm payload in <character_brainstorm_input>...</character_brainstorm_input> XML'
  );

  // Review-iterate loop
  assert.match(
    addBlock[1],
    /<previous_proposal>[\s\S]*<\/previous_proposal>/,
    'character --add must thread previous proposal back into brainstorm on iteration'
  );
  assert.match(
    addBlock[1],
    /<adjustment_notes>[\s\S]*<\/adjustment_notes>/,
    'character --add must thread adjustment notes back into brainstorm on iteration'
  );
  assert.match(
    addBlock[1],
    /MAX_ITERATIONS|迭代上限/,
    'character --add must guard against infinite iteration with an upper bound'
  );

  // Commit phase
  assert.match(
    content,
    /mode:\s*"commit"[\s\S]{0,200}scope:\s*"character"|scope:\s*"character"[\s\S]{0,200}mode:\s*"commit"/,
    'character --add must call ans-architect with mode:"commit" + scope:"character" after approval'
  );
  assert.match(
    addBlock[1],
    /approved_proposal/,
    'character --add commit phase must thread the approved proposal'
  );
});

test('ans-architect documents character-scope brainstorm and commit modes', () => {
  const content = read(path.join(AGENTS_DIR, 'ans-architect.md'));
  assert.match(
    content,
    /scope:\s*"character"/,
    'ans-architect.md must document scope:"character" for character --add-driven calls'
  );
  assert.match(
    content,
    /CHARACTER BRAINSTORM COMPLETE/,
    'ans-architect.md must specify ## CHARACTER BRAINSTORM COMPLETE structured return'
  );
});

test('ans-architect documents single-card-update mode', () => {
  const content = read(path.join(AGENTS_DIR, 'ans-architect.md'));
  assert.match(
    content,
    /单卡更新模式|character_card_update/,
    'ans-architect.md must document the single-card-update mode for write-chapter/review callers'
  );
  assert.match(
    content,
    /needs_character_update/,
    'ans-architect.md must explain its connection to verifier\'s needs_character_update signal'
  );
});

test('ans-verifier documents needs_character_update contract with 人物状态变化 table', () => {
  const content = read(path.join(AGENTS_DIR, 'ans-verifier.md'));
  // The agent must explicitly bridge the JSON signal to the markdown table
  // — without this contract, architect's single-card-update mode has no
  // input source.
  assert.match(
    content,
    /needs_character_update[\s\S]{0,500}人物状态变化|人物状态变化[\s\S]{0,500}needs_character_update/,
    'ans-verifier.md must explicitly tie needs_character_update=true to populating the 人物状态变化 table'
  );
});

// ─── files_to_read centralization (P3.1) ─────────────────────────────────────
//
// init.cjs centralizes per-role file lists so each workflow doesn't carry its
// own fragile inline path-stitching logic. These tests pin the contract on
// the JSON output side: each cmdInit* must populate a `files_to_read` map
// keyed by agent role. Workflows can migrate to consume it gradually.

test('init write-chapter exposes files_to_read map keyed by agent role', () => {
  const initLib = read(INIT_LIB_PATH);
  // Source-level: the helper exists and returns the expected role keys.
  assert.match(
    initLib,
    /buildWriteChapterFilesToRead/,
    'init.cjs must define buildWriteChapterFilesToRead() helper'
  );

  // Extract the buildWriteChapterFilesToRead function body and verify the
  // returned object includes each expected role.
  const fnMatch = initLib.match(/function\s+buildWriteChapterFilesToRead[\s\S]*?\n\}\s*\n/);
  assert.ok(fnMatch, 'init.cjs must define buildWriteChapterFilesToRead with a function declaration');
  const fnBody = fnMatch[0];

  for (const role of ['planner', 'plan_checker', 'writer', 'editor', 'verifier']) {
    assert.match(
      fnBody,
      new RegExp(`\\b${role}\\b`),
      `buildWriteChapterFilesToRead must declare the "${role}" role`
    );
  }
  // architect_character_update is the alias key returned for the architect
  // single-card-update mode — must also be declared.
  assert.match(
    fnBody,
    /architect_character_update/,
    'buildWriteChapterFilesToRead must declare the "architect_character_update" role'
  );
});

test('init review exposes files_to_read map keyed by agent role', () => {
  const initLib = read(INIT_LIB_PATH);
  assert.match(
    initLib,
    /buildReviewFilesToRead/,
    'init.cjs must define buildReviewFilesToRead() helper'
  );

  const fnMatch = initLib.match(/function\s+buildReviewFilesToRead[\s\S]*?\n\}\s*\n/);
  assert.ok(fnMatch, 'init.cjs must define buildReviewFilesToRead with a function declaration');
  const fnBody = fnMatch[0];

  for (const role of ['verifier', 'architect_character_update']) {
    assert.match(
      fnBody,
      new RegExp(`\\b${role}\\b`),
      `buildReviewFilesToRead must declare the "${role}" role`
    );
  }
});
