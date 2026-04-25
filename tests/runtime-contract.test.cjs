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
      '@~/.claude/ai-novel-studio/commands/ans/_codex-conventions.md',
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
    path.join(SUPPORT_ROOT, 'commands', 'ans', '_codex-conventions.md'),
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
  const pattern = /node\s+(?:"\$HOME\/\.claude\/ai-novel-studio\/bin\/ans-tools\.cjs"|bin\/ans-tools\.cjs)\s+([a-z-]+)(?:\s+([a-z-]+))?/g;

  for (const filePath of [...workflowFiles(), ...fs.readdirSync(AGENTS_DIR).filter((name) => name.endsWith('.md')).map((name) => path.join(AGENTS_DIR, name))]) {
    const content = read(filePath);
    for (const match of content.matchAll(pattern)) {
      const pair = [match[1], match[2]].filter(Boolean).join(' ');
      if (!allowed.has(pair)) {
        invalid.push(`${path.basename(filePath)} -> ${pair}`);
      }
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
    /@commands\/_codex-conventions\.md\./,
    /@workflows\/help\.md\./,
    /@research\/arc-\*\.md/,
  ];

  const corpus = [
    ...commandFiles(),
    ...workflowFiles(),
    ...fs.readdirSync(AGENTS_DIR).filter((name) => name.endsWith('.md')).map((name) => path.join(AGENTS_DIR, name)),
    ...fs.readdirSync(REFERENCES_DIR).filter((name) => name.endsWith('.md')).map((name) => path.join(REFERENCES_DIR, name)),
    ...fs.readdirSync(TEMPLATES_DIR).filter((name) => name.endsWith('.md')).map((name) => path.join(TEMPLATES_DIR, name)),
    path.join(SUPPORT_ROOT, 'commands', 'ans', '_codex-conventions.md'),
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
