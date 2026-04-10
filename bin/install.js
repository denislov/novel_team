#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const pkg = require('../package.json');

const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

const NOVEL_CODEX_MARKER = '# Novel Agent Configuration — managed by novel installer';
const RESOURCE_DIRS = ['commands', 'workflows', 'references', 'templates', 'scripts', 'agents'];
const SUPPORTED_RUNTIMES = ['claude', 'codex'];
const LEGACY_INTERNAL_SKILLS = ['novel-command-center', 'novel-writing'];

const CODEX_AGENT_SANDBOX = {
  'novel-architect': 'workspace-write',
  'novel-editor': 'workspace-write',
  'novel-planner': 'workspace-write',
  'novel-researcher': 'workspace-write',
  'novel-verifier': 'workspace-write',
  'novel-writer': 'workspace-write',
};

function expandTilde(value) {
  if (!value) return value;
  if (value === '~') return os.homedir();
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
  return value;
}

function toPosix(filePath) {
  return filePath.replace(/\\/g, '/');
}

function promptPathFor(absPath) {
  const normalized = toPosix(path.resolve(absPath));
  const home = toPosix(os.homedir());
  if (normalized === home) return '$HOME';
  if (normalized.startsWith(`${home}/`)) {
    return `$HOME${normalized.slice(home.length)}`;
  }
  return normalized;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function removeIfExists(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function copyFile(srcPath, destPath) {
  ensureDir(path.dirname(destPath));
  fs.copyFileSync(srcPath, destPath);
}

function sourceRoot() {
  return path.join(__dirname, '..');
}

function supportInstallName() {
  return 'novel';
}

function getGlobalDir(runtime, explicitConfigDir) {
  if (explicitConfigDir) return path.resolve(expandTilde(explicitConfigDir));
  if (runtime === 'codex') {
    return path.resolve(expandTilde(process.env.CODEX_HOME || path.join(os.homedir(), '.codex')));
  }
  return path.resolve(expandTilde(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude')));
}

function getTargetDir(runtime, isGlobal, explicitConfigDir, cwd) {
  if (isGlobal) return getGlobalDir(runtime, explicitConfigDir);
  const dirName = runtime === 'codex' ? '.codex' : '.claude';
  return path.resolve(cwd || process.cwd(), dirName);
}

function listSourceCommands() {
  const commandsDir = path.join(sourceRoot(), 'commands');
  return fs.readdirSync(commandsDir)
    .filter((entry) => entry.endsWith('.md') && entry !== '_codex-conventions.md')
    .sort();
}

function skillNameFromCommandFile(commandFile) {
  return `novel-${commandFile.replace(/\.md$/, '')}`;
}

function listPublicCodexSkills() {
  return listSourceCommands().map(skillNameFromCommandFile);
}

function listSourceAgents() {
  const agentsDir = path.join(sourceRoot(), 'agents');
  return fs.readdirSync(agentsDir)
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => entry.replace(/\.md$/, ''))
    .sort();
}

function walkFiles(rootDir) {
  const results = [];
  if (!fs.existsSync(rootDir)) return results;
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else {
        results.push(fullPath);
      }
    }
  }

  return results.sort();
}

function yamlQuote(value) {
  return JSON.stringify(value || '');
}

function toSingleLine(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function extractFrontmatterAndBody(content) {
  if (!content.startsWith('---')) {
    return { frontmatter: null, body: content };
  }

  const endIndex = content.indexOf('\n---', 3);
  if (endIndex === -1) {
    return { frontmatter: null, body: content };
  }

  const frontmatter = content.slice(3, endIndex).trim();
  const body = content.slice(endIndex + 4).replace(/^\r?\n/, '');
  return { frontmatter, body };
}

function extractFrontmatterField(frontmatter, fieldName) {
  if (!frontmatter) return '';
  const match = frontmatter.match(new RegExp(`^${fieldName}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim().replace(/^['"]|['"]$/g, '') : '';
}

function extractFrontmatterList(frontmatter, fieldName) {
  if (!frontmatter) return [];

  const lines = String(frontmatter).split(/\r?\n/);
  const items = [];
  let collecting = false;

  for (const line of lines) {
    if (!collecting) {
      if (new RegExp(`^${fieldName}:\\s*$`).test(line.trim())) {
        collecting = true;
      }
      continue;
    }

    if (/^\s*-\s+/.test(line)) {
      items.push(line.replace(/^\s*-\s+/, '').trim());
      continue;
    }

    if (!line.trim()) {
      continue;
    }

    break;
  }

  return items;
}

function extractTaggedBlock(content, tagName) {
  const match = content.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`));
  return match ? match[1].trim() : '';
}

function parseSimpleKeyValueBlock(content) {
  const data = {};

  for (const line of String(content || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf(':');
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!key) continue;
    data[key] = value;
  }

  return data;
}

function extractAvailableAgents(content) {
  const availableBlock = extractTaggedBlock(content, 'available_agent_types');
  const matches = new Set();

  for (const match of availableBlock.matchAll(/-\s*(novel-[a-z-]+)/g)) {
    matches.add(match[1]);
  }

  return [...matches];
}

function extractSpawnedAgentNames(content) {
  const matches = new Set();

  for (const match of content.matchAll(/agent:\s*(novel-[a-z-]+)/g)) {
    matches.add(match[1]);
  }

  for (const match of content.matchAll(/SpawnAgent\(\s*(?:\n|\r\n|\s)*agent:\s*(novel-[a-z-]+)/g)) {
    matches.add(match[1]);
  }

  for (const match of content.matchAll(/SpawnAgent\s+(novel-[a-z-]+)/g)) {
    matches.add(match[1]);
  }

  return [...matches];
}

function extractWorkflowExecutionPolicy(content) {
  return parseSimpleKeyValueBlock(extractTaggedBlock(content, 'codex_execution_policy'));
}

function extractWorkflowAgentNames(content) {
  const availableAgents = extractAvailableAgents(content);
  const spawnedAgents = extractSpawnedAgentNames(content);
  const requiredAgents = spawnedAgents.length > 0 ? spawnedAgents : availableAgents;
  const conditionalAgents = availableAgents.filter((agent) => !requiredAgents.includes(agent));

  return {
    availableAgents,
    spawnedAgents,
    requiredAgents,
    conditionalAgents,
    executionPolicy: extractWorkflowExecutionPolicy(content),
  };
}

function resolveReferencePath(reference, sourceFilePath) {
  if (!reference || !sourceFilePath) return null;
  const trimmed = reference.replace(/^@/, '').trim();
  if (!trimmed || trimmed.startsWith('$HOME') || path.isAbsolute(trimmed)) return null;
  const fromSourceFile = path.resolve(path.dirname(sourceFilePath), trimmed);
  if (fs.existsSync(fromSourceFile)) {
    return fromSourceFile;
  }

  if (/^(commands|workflows|references|templates|scripts|agents)\//.test(trimmed)) {
    const fromPluginRoot = path.resolve(sourceRoot(), trimmed);
    if (fs.existsSync(fromPluginRoot)) {
      return fromPluginRoot;
    }
  }

  return fromSourceFile;
}

function extractPrimaryWorkflowPath(commandContent, commandSourcePath) {
  const executionContext = extractTaggedBlock(commandContent, 'execution_context');
  if (!executionContext) return null;

  for (const line of executionContext.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('@') || !trimmed.includes('workflows/')) continue;

    const resolved = resolveReferencePath(trimmed, commandSourcePath);
    if (resolved && fs.existsSync(resolved)) {
      return resolved;
    }
  }

  return null;
}

function sourcePathToSupportPromptPath(sourceFilePath, supportRootPromptPath) {
  if (!sourceFilePath || !supportRootPromptPath) return null;
  const relative = toPosix(path.relative(sourceRoot(), sourceFilePath));
  if (!relative || relative.startsWith('..')) return null;
  return `${supportRootPromptPath}/${relative}`;
}

function buildRequiredAgentContractBlock(skillName, workflowInfo) {
  if (!workflowInfo || workflowInfo.requiredAgents.length === 0) return '';

  const policy = workflowInfo.executionPolicy || {};
  const lines = [
    '## C1. Required Named Agents',
    `This skill routes through \`${workflowInfo.workflowPromptPath || workflowInfo.workflowPath}\`.`,
    '',
    'Execution policy:',
    `- \`delegation: ${policy.delegation || 'required_named_agents'}\``,
    `- \`public_entrypoint: ${policy.public_entrypoint || 'explicit_public_skills'}\``,
    `- \`allow_inline_fallback: ${policy.allow_inline_fallback || 'false'}\``,
    '',
    'Required agents for delegated stages:',
  ];

  for (const agent of workflowInfo.requiredAgents) {
    lines.push(`- \`${agent}\``);
  }

  if (workflowInfo.conditionalAgents.length > 0) {
    lines.push('');
    lines.push('Conditional agents declared by the workflow:');
    for (const agent of workflowInfo.conditionalAgents) {
      lines.push(`- \`${agent}\``);
    }
  }

  lines.push('');
  lines.push('Do not inline delegated stages.');
  lines.push('If required named agents are unavailable, the install looks incomplete, or execution drifts from this contract, stop and validate the Codex install before continuing:');
  lines.push('- Installed CLI path: `novel-tool validate --codex --global`');
  lines.push('- Source checkout path: `node bin/install.js validate --codex --global`');
  lines.push('If validation fails, reinstall or update Novel for Codex before retrying:');
  lines.push('- `novel-tool install --codex --global`');
  lines.push('- `novel-tool update --codex --global`');
  lines.push('- `node bin/install.js install --codex --global`');
  lines.push('- `node bin/install.js update --codex --global`');
  lines.push('Prefer the explicit public `$novel-*` skill entrypoints when execution reliability matters.');

  return lines.join('\n');
}

function rewriteSupportReferences(content, supportRootPromptPath) {
  let rewritten = content;

  rewritten = rewritten.replace(
    /@(?:\.\.\/){0,2}(commands|workflows|references|templates|scripts|agents)\//g,
    (_, dirName) => `@${supportRootPromptPath}/${dirName}/`
  );

  rewritten = rewritten.replace(
    /(?:\.\.\/){1,2}(commands|workflows|references|templates|scripts|agents)\//g,
    (_, dirName) => `${supportRootPromptPath}/${dirName}/`
  );

  rewritten = rewritten.replace(
    /(^|[\s`"'(])(?:\.\/)?((commands|workflows|references|templates|scripts|agents)\/[A-Za-z0-9_./*{}-]+)/gm,
    (_, prefix, relPath) => `${prefix}${supportRootPromptPath}/${relPath}`
  );

  rewritten = rewritten.replace(
    /`((commands|workflows|references|templates|scripts|agents)\/)`/g,
    (_, relDir) => `\`${supportRootPromptPath}/${relDir}\``
  );

  return rewritten;
}

function rewriteRuntimeContent(content, runtime, supportRootPromptPath) {
  let rewritten = rewriteSupportReferences(content, supportRootPromptPath);

  if (runtime === 'codex') {
    rewritten = rewritten.replace(/\/novel:([a-z][a-z0-9-]*)/g, '$novel-$1');
    rewritten = rewritten.replace(/\$ARGUMENTS\b/g, '{{NOVEL_ARGS}}');
  } else if (runtime === 'claude') {
    rewritten = rewritten.replace(/\/novel:([a-z][a-z0-9-]*)/g, 'novel-$1');
  }

  return rewritten;
}

function convertNovelCommandToClaudeSkill(content, skillName, supportRootPromptPath) {
  const converted = rewriteRuntimeContent(content, 'claude', supportRootPromptPath);
  const { frontmatter, body } = extractFrontmatterAndBody(converted);
  const description = toSingleLine(
    extractFrontmatterField(frontmatter, 'description') || `Run Novel workflow ${skillName}.`
  );
  const argumentHint = extractFrontmatterField(frontmatter, 'argument-hint');
  const allowedTools = extractFrontmatterList(frontmatter, 'allowed-tools');
  const lines = [
    '---',
    `name: ${yamlQuote(skillName)}`,
    `description: ${yamlQuote(description)}`,
  ];

  if (argumentHint) {
    lines.push(`argument-hint: ${yamlQuote(argumentHint)}`);
  }

  if (allowedTools.length > 0) {
    lines.push('allowed-tools:');
    for (const tool of allowedTools) {
      lines.push(`  - ${tool}`);
    }
  }

  lines.push('---', '', body.trimStart());
  return lines.join('\n');
}

function getNovelCodexSkillAdapterHeader(skillName, requiredAgentContract = '') {
  const invocation = `$${skillName}`;
  return `<codex_skill_adapter>
## A. Skill Invocation
- This skill is invoked by mentioning \`${invocation}\`.
- Treat all user text after \`${invocation}\` as \`{{NOVEL_ARGS}}\`.
- If no arguments are present, treat \`{{NOVEL_ARGS}}\` as empty.

## B. AskUserQuestion → Plain-Text Or request_user_input Mapping
Novel workflows use \`AskUserQuestion\` in Claude-style workflow prose.

Translate it this way:
- If Codex can use \`request_user_input\`, map the header/question/options directly.
- If not, ask a concise plain-text question and continue.
- If the workflow suggests a reasonable default and the user did not block on the choice, make the default choice explicitly and proceed.

## C. SpawnAgent() → spawn_agent Mapping
Novel workflows use \`SpawnAgent(...)\` to delegate planning, writing, editing, review, and research.

Translate it to Codex named agents:
- \`SpawnAgent(agent: "novel-x", input: Y, output: Z)\` → \`spawn_agent(agent_type="novel-x", message="...")\`
- Build the \`message\` from the workflow's \`input\` payload and target artifact path.
- Tell the sub-agent to read the relevant project files itself and write the required artifact directly.
- Use \`fork_context: false\` by default.
- Wait for the sub-agent result before continuing the workflow.
- Close the agent after collecting its result.

When a workflow contains multiple \`SpawnAgent(...)\` steps, execute them in the order required by the workflow unless the workflow clearly says they can run in parallel.

${requiredAgentContract ? `${requiredAgentContract}\n\n` : ''}## D. SlashCommand Routing
- Treat legacy \`/novel:*\` references as routing hints to the matching \`$novel-*\` skill.
</codex_skill_adapter>`;
}

function convertNovelCommandToCodexSkill(content, skillName, supportRootPromptPath, commandSourcePath = null) {
  const converted = rewriteRuntimeContent(content, 'codex', supportRootPromptPath);
  const { frontmatter, body } = extractFrontmatterAndBody(converted);
  const description = toSingleLine(
    extractFrontmatterField(frontmatter, 'description') || `Run Novel workflow ${skillName}.`
  );
  const shortDescription = description.length > 80 ? `${description.slice(0, 77)}...` : description;
  const workflowPath = extractPrimaryWorkflowPath(content, commandSourcePath);
  let requiredAgentContract = '';

  if (workflowPath && fs.existsSync(workflowPath)) {
    requiredAgentContract = buildRequiredAgentContractBlock(skillName, {
      workflowPath,
      workflowPromptPath: sourcePathToSupportPromptPath(workflowPath, supportRootPromptPath),
      ...extractWorkflowAgentNames(readText(workflowPath)),
    });
  }

  const adapter = getNovelCodexSkillAdapterHeader(skillName, requiredAgentContract);

  return [
    '---',
    `name: ${yamlQuote(skillName)}`,
    `description: ${yamlQuote(description)}`,
    'metadata:',
    `  short-description: ${yamlQuote(shortDescription)}`,
    '---',
    '',
    adapter,
    '',
    body.trimStart(),
  ].join('\n');
}

function copyTree(srcDir, destDir, runtime, supportRootPromptPath) {
  removeIfExists(destDir);
  ensureDir(destDir);

  for (const srcPath of walkFiles(srcDir)) {
    const relative = path.relative(srcDir, srcPath);
    const destPath = path.join(destDir, relative);
    const ext = path.extname(srcPath).toLowerCase();

    if (['.md', '.toml', '.yaml', '.yml'].includes(ext)) {
      writeText(destPath, rewriteRuntimeContent(readText(srcPath), runtime, supportRootPromptPath));
      continue;
    }

    copyFile(srcPath, destPath);
  }
}

function convertClaudeAgentToCodexAgent(content, supportRootPromptPath) {
  const rewritten = rewriteRuntimeContent(content, 'codex', supportRootPromptPath);
  const { frontmatter, body } = extractFrontmatterAndBody(rewritten);
  if (!frontmatter) return rewritten;

  const name = extractFrontmatterField(frontmatter, 'name') || 'unknown';
  const description = extractFrontmatterField(frontmatter, 'description') || `Novel agent ${name}`;
  const tools = extractFrontmatterField(frontmatter, 'tools') || '';

  return [
    '---',
    `name: ${yamlQuote(name)}`,
    `description: ${yamlQuote(toSingleLine(description))}`,
    '---',
    '',
    '<codex_agent_role>',
    `role: ${name}`,
    `tools: ${tools}`,
    `purpose: ${toSingleLine(description)}`,
    '</codex_agent_role>',
    body.trimStart(),
  ].join('\n');
}

function generateCodexAgentToml(agentName, convertedAgentContent) {
  const { frontmatter, body } = extractFrontmatterAndBody(convertedAgentContent);
  const resolvedName = extractFrontmatterField(frontmatter, 'name') || agentName;
  const resolvedDescription = toSingleLine(
    extractFrontmatterField(frontmatter, 'description') || `Novel agent ${resolvedName}`
  );
  const sandboxMode = CODEX_AGENT_SANDBOX[agentName] || 'workspace-write';

  return [
    `name = ${JSON.stringify(resolvedName)}`,
    `description = ${JSON.stringify(resolvedDescription)}`,
    `sandbox_mode = ${JSON.stringify(sandboxMode)}`,
    "developer_instructions = '''",
    body.trim(),
    "'''",
    '',
  ].join('\n');
}

function generateCodexConfigBlock(agents, targetDir) {
  const agentsDir = toPosix(path.join(targetDir, 'agents'));
  const lines = [NOVEL_CODEX_MARKER, ''];

  for (const agentName of agents) {
    lines.push(`[agents.${agentName}]`);
    lines.push(`description = ${JSON.stringify(`Novel sub-agent ${agentName}`)}`);
    lines.push(`config_file = ${JSON.stringify(`${agentsDir}/${agentName}.toml`)}`);
    lines.push('');
  }

  return lines.join('\n');
}

function stripNovelFromCodexConfig(content) {
  if (!content) return null;

  const markerIndex = content.indexOf(NOVEL_CODEX_MARKER);
  let cleaned = content;
  if (markerIndex !== -1) {
    cleaned = content.slice(0, markerIndex);
  }

  cleaned = cleaned.replace(/^\[agents\.novel-[^\]]+\]\r?\n(?:(?!^\[).*(?:\r?\n|$))*/gm, '');
  cleaned = cleaned.trimEnd();
  return cleaned ? `${cleaned}\n` : null;
}

function mergeCodexConfig(configPath, block) {
  const existing = fs.existsSync(configPath) ? readText(configPath) : '';
  const stripped = stripNovelFromCodexConfig(existing);
  const prefix = stripped ? `${stripped.trimEnd()}\n\n` : '';
  writeText(configPath, `${prefix}${block.trimEnd()}\n`);
}

function installSupportBundle(targetDir, runtime) {
  const src = sourceRoot();
  const supportDir = path.join(targetDir, supportInstallName());
  const supportRootPromptPath = promptPathFor(supportDir);

  removeIfExists(supportDir);
  ensureDir(supportDir);

  for (const entry of ['README.md', ...RESOURCE_DIRS]) {
    const srcPath = path.join(src, entry);
    const destPath = path.join(supportDir, entry);
    const stats = fs.statSync(srcPath);

    if (stats.isDirectory()) {
      copyTree(srcPath, destPath, runtime, supportRootPromptPath);
      continue;
    }

    const ext = path.extname(srcPath).toLowerCase();
    if (['.md', '.toml', '.yaml', '.yml'].includes(ext)) {
      writeText(destPath, rewriteRuntimeContent(readText(srcPath), runtime, supportRootPromptPath));
    } else {
      copyFile(srcPath, destPath);
    }
  }

  writeText(path.join(supportDir, 'VERSION'), `${pkg.version}\n`);
  return { supportDir, supportRootPromptPath };
}

function installClaudeRuntime(targetDir, supportRootPromptPath) {
  const src = sourceRoot();
  const skillsDest = path.join(targetDir, 'skills');
  const agentsDest = path.join(targetDir, 'agents');
  const legacyCommandsDest = path.join(targetDir, 'commands', 'novel');

  removeIfExists(legacyCommandsDest);
  ensureDir(skillsDest);
  ensureDir(agentsDest);

  for (const skillName of listPublicCodexSkills()) {
    removeIfExists(path.join(skillsDest, skillName));
  }

  for (const commandFile of listSourceCommands()) {
    const srcPath = path.join(src, 'commands', commandFile);
    const skillName = skillNameFromCommandFile(commandFile);
    writeText(
      path.join(skillsDest, skillName, 'SKILL.md'),
      convertNovelCommandToClaudeSkill(readText(srcPath), skillName, supportRootPromptPath)
    );
  }

  for (const agentName of listSourceAgents()) {
    const srcPath = path.join(src, 'agents', `${agentName}.md`);
    writeText(
      path.join(agentsDest, `${agentName}.md`),
      rewriteRuntimeContent(readText(srcPath), 'claude', supportRootPromptPath)
    );
  }
}

function installCodexRuntime(targetDir, supportRootPromptPath) {
  const src = sourceRoot();
  const skillsDest = path.join(targetDir, 'skills');
  const agentsDest = path.join(targetDir, 'agents');
  const configPath = path.join(targetDir, 'config.toml');

  ensureDir(skillsDest);
  ensureDir(agentsDest);

  for (const skillName of [...listPublicCodexSkills(), ...LEGACY_INTERNAL_SKILLS]) {
    removeIfExists(path.join(skillsDest, skillName));
  }

  for (const skillName of listPublicCodexSkills()) {
    ensureDir(path.join(skillsDest, skillName));
  }

  for (const commandFile of listSourceCommands()) {
    const skillName = skillNameFromCommandFile(commandFile);
    const commandPath = path.join(src, 'commands', commandFile);
    const commandContent = readText(commandPath);
    const generatedSkill = convertNovelCommandToCodexSkill(
      commandContent,
      skillName,
      supportRootPromptPath,
      commandPath
    );
    writeText(path.join(skillsDest, skillName, 'SKILL.md'), generatedSkill);
  }

  for (const agentName of listSourceAgents()) {
    removeIfExists(path.join(agentsDest, `${agentName}.toml`));
  }

  for (const agentName of listSourceAgents()) {
    const sourceAgent = readText(path.join(src, 'agents', `${agentName}.md`));
    const converted = convertClaudeAgentToCodexAgent(sourceAgent, supportRootPromptPath);
    const toml = generateCodexAgentToml(agentName, converted);
    writeText(path.join(agentsDest, `${agentName}.toml`), toml);
  }

  mergeCodexConfig(configPath, generateCodexConfigBlock(listSourceAgents(), targetDir));
}

function scanUnresolvedReferences(rootDir) {
  const unresolved = [];
  const pathLeakPattern = /(^|[\s`"'(])(?:@(?:\.\.\/){0,2}|(?:\.\.\/){1,2}|(?:\.\/)?)(commands|workflows|references|templates|scripts|agents)\//gm;

  for (const filePath of walkFiles(rootDir)) {
    const ext = path.extname(filePath).toLowerCase();
    if (!['.md', '.toml', '.yaml', '.yml'].includes(ext)) continue;
    const content = readText(filePath);
    const matches = [...content.matchAll(pathLeakPattern)];
    if (matches.length === 0) continue;
    unresolved.push({
      file: filePath,
      matches: matches.map((match) => match[0].trim()),
    });
  }

  return unresolved;
}

function validateRuntime(options) {
  const { runtime, isGlobal = true, explicitConfigDir = null, cwd = process.cwd() } = options;
  const targetDir = getTargetDir(runtime, isGlobal, explicitConfigDir, cwd);
  const supportDir = path.join(targetDir, supportInstallName());
  const issues = [];

  if (!fs.existsSync(supportDir)) {
    issues.push(`missing support directory: ${supportDir}`);
  }

  const unresolved = fs.existsSync(supportDir) ? scanUnresolvedReferences(supportDir) : [];
  if (unresolved.length > 0) {
    issues.push(`support bundle still contains ${unresolved.length} unresolved support reference file(s)`);
  }

  if (runtime === 'claude') {
    const skillsDir = path.join(targetDir, 'skills');
    const agentsDir = path.join(targetDir, 'agents');
    const skillCount = fs.existsSync(skillsDir)
      ? fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && listPublicCodexSkills().includes(entry.name))
        .length
      : 0;
    const agentCount = fs.existsSync(agentsDir)
      ? fs.readdirSync(agentsDir).filter((file) => file.startsWith('novel-') && file.endsWith('.md')).length
      : 0;

    if (skillCount !== listPublicCodexSkills().length) {
      issues.push(`expected ${listPublicCodexSkills().length} Claude skills, found ${skillCount}`);
    }
    if (agentCount !== listSourceAgents().length) {
      issues.push(`expected ${listSourceAgents().length} Claude agents, found ${agentCount}`);
    }
  } else {
    const skillsDir = path.join(targetDir, 'skills');
    const agentsDir = path.join(targetDir, 'agents');
    const configPath = path.join(targetDir, 'config.toml');
    const skillCount = fs.existsSync(skillsDir)
      ? fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && listPublicCodexSkills().includes(entry.name))
        .length
      : 0;
    const agentTomlCount = fs.existsSync(agentsDir)
      ? fs.readdirSync(agentsDir).filter((file) => file.startsWith('novel-') && file.endsWith('.toml')).length
      : 0;

    if (skillCount !== listPublicCodexSkills().length) {
      issues.push(`expected ${listPublicCodexSkills().length} Codex skills, found ${skillCount}`);
    }
    if (agentTomlCount !== listSourceAgents().length) {
      issues.push(`expected ${listSourceAgents().length} Codex agent configs, found ${agentTomlCount}`);
    }

    if (!fs.existsSync(configPath)) {
      issues.push(`missing Codex config: ${configPath}`);
    } else {
      const config = readText(configPath);
      if (!config.includes(NOVEL_CODEX_MARKER)) {
        issues.push('missing Novel marker in config.toml');
      }
      for (const agentName of listSourceAgents()) {
        if (!config.includes(`[agents.${agentName}]`)) {
          issues.push(`missing Codex agent section for ${agentName}`);
        }
      }
    }
  }

  return {
    ok: issues.length === 0,
    runtime,
    targetDir,
    supportDir,
    issues,
    unresolved,
  };
}

function installRuntime(options) {
  const { runtime, isGlobal = true, explicitConfigDir = null, cwd = process.cwd() } = options;
  const targetDir = getTargetDir(runtime, isGlobal, explicitConfigDir, cwd);

  ensureDir(targetDir);

  const { supportRootPromptPath } = installSupportBundle(targetDir, runtime);
  if (runtime === 'claude') {
    installClaudeRuntime(targetDir, supportRootPromptPath);
  } else {
    installCodexRuntime(targetDir, supportRootPromptPath);
  }

  const validation = validateRuntime({ runtime, isGlobal, explicitConfigDir, cwd });
  if (!validation.ok) {
    throw new Error(validation.issues.join('; '));
  }

  return validation;
}

function uninstallRuntime(options) {
  const { runtime, isGlobal = true, explicitConfigDir = null, cwd = process.cwd() } = options;
  const targetDir = getTargetDir(runtime, isGlobal, explicitConfigDir, cwd);

  removeIfExists(path.join(targetDir, supportInstallName()));

  if (runtime === 'claude') {
    const skillsDir = path.join(targetDir, 'skills');
    if (fs.existsSync(skillsDir)) {
      for (const skillName of listPublicCodexSkills()) {
        removeIfExists(path.join(skillsDir, skillName));
      }
    }

    removeIfExists(path.join(targetDir, 'commands', 'novel'));
    const agentsDir = path.join(targetDir, 'agents');
    if (fs.existsSync(agentsDir)) {
      for (const agentName of listSourceAgents()) {
        removeIfExists(path.join(agentsDir, `${agentName}.md`));
      }
    }
  } else {
    const skillsDir = path.join(targetDir, 'skills');
    if (fs.existsSync(skillsDir)) {
      for (const skillName of [...listPublicCodexSkills(), ...LEGACY_INTERNAL_SKILLS]) {
        removeIfExists(path.join(skillsDir, skillName));
      }
    }

    const agentsDir = path.join(targetDir, 'agents');
    if (fs.existsSync(agentsDir)) {
      for (const agentName of listSourceAgents()) {
        removeIfExists(path.join(agentsDir, `${agentName}.toml`));
      }
    }

    const configPath = path.join(targetDir, 'config.toml');
    if (fs.existsSync(configPath)) {
      const stripped = stripNovelFromCodexConfig(readText(configPath));
      if (stripped === null) {
        fs.rmSync(configPath, { force: true });
      } else {
        writeText(configPath, stripped);
      }
    }
  }

  return { runtime, targetDir };
}

function printValidation(validation) {
  const label = validation.runtime === 'codex' ? 'Codex' : 'Claude Code';
  if (validation.ok) {
    console.log(`  ${green}✓${reset} ${label} validated at ${cyan}${validation.targetDir}${reset}`);
    return;
  }

  console.log(`  ${red}✗${reset} ${label} validation failed at ${cyan}${validation.targetDir}${reset}`);
  for (const issue of validation.issues) {
    console.log(`    - ${issue}`);
  }
}

function getRuntimeUsageHints(runtime, targetDir) {
  if (runtime === 'claude') {
    return [
      `Use Claude public skills from ${cyan}${path.join(targetDir, 'skills')}${reset}`,
      `Claude installs Novel as top-level skills plus raw agent markdown`,
      `Claude Novel agents live in ${cyan}${path.join(targetDir, 'agents')}${reset}`,
    ];
  }

  return [
    `Use Codex public skills from ${cyan}${path.join(targetDir, 'skills')}${reset}`,
    `Codex installs the public ${cyan}$novel-*${reset} skill surface plus named agent configs`,
    `Codex agent registrations are written to ${cyan}${path.join(targetDir, 'config.toml')}${reset}`,
  ];
}

function printRuntimeUsageHints(runtime, targetDir) {
  for (const hint of getRuntimeUsageHints(runtime, targetDir)) {
    console.log(`    - ${hint}`);
  }
}

function printHelp() {
  console.log(`  ${yellow}Usage:${reset} novel-tool [command] [options]

  ${yellow}Commands:${reset}
    ${cyan}install${reset}      Install Novel for one or more runtimes
    ${cyan}update${reset}       Reinstall Novel in place
    ${cyan}uninstall${reset}    Remove Novel from the selected runtimes
    ${cyan}validate${reset}     Validate the selected runtime installs
    ${cyan}help${reset}         Show this help

  ${yellow}Runtime Selection:${reset}
    ${cyan}--claude${reset}     Target Claude Code
    ${cyan}--codex${reset}      Target Codex
    ${cyan}--all${reset}        Target both Claude Code and Codex (default)

  ${yellow}Location:${reset}
    ${cyan}-g, --global${reset} Install into the runtime config directory (default)
    ${cyan}-l, --local${reset}  Install into the current project directory
    ${cyan}-c, --config-dir${reset} <path>
                     Override the runtime config directory for the selected runtime

  ${yellow}Examples:${reset}
    ${dim}novel-tool install --all --global${reset}
    ${dim}novel-tool update --codex --global${reset}
    ${dim}novel-tool uninstall --claude --local${reset}
    ${dim}novel-tool validate --all --global${reset}
`);
}

function parseArgs(argv) {
  const knownCommands = new Set(['install', 'update', 'uninstall', 'validate', 'help']);
  let command = 'install';
  const args = [...argv];

  if (args[0] && knownCommands.has(args[0])) {
    command = args.shift();
  }

  let isGlobal = true;
  let explicitConfigDir = null;
  const runtimes = new Set();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      command = 'help';
      continue;
    }
    if (arg === '--claude') {
      runtimes.add('claude');
      continue;
    }
    if (arg === '--codex') {
      runtimes.add('codex');
      continue;
    }
    if (arg === '--all') {
      SUPPORTED_RUNTIMES.forEach((runtime) => runtimes.add(runtime));
      continue;
    }
    if (arg === '--global' || arg === '-g') {
      isGlobal = true;
      continue;
    }
    if (arg === '--local' || arg === '-l') {
      isGlobal = false;
      continue;
    }
    if (arg === '--config-dir' || arg === '-c') {
      const nextArg = args[index + 1];
      if (!nextArg || nextArg.startsWith('-')) {
        throw new Error(`${arg} requires a path argument`);
      }
      explicitConfigDir = nextArg;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (runtimes.size === 0) {
    SUPPORTED_RUNTIMES.forEach((runtime) => runtimes.add(runtime));
  }

  return {
    command,
    runtimes: [...runtimes],
    isGlobal,
    explicitConfigDir,
  };
}

function runCli() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.command === 'help') {
    printHelp();
    return;
  }

  const modeLabel = parsed.isGlobal ? 'global' : 'local';
  console.log(`  ${cyan}Novel${reset} ${pkg.version} ${dim}(${modeLabel})${reset}\n`);

  let hadError = false;

  for (const runtime of parsed.runtimes) {
    const label = runtime === 'codex' ? 'Codex' : 'Claude Code';
    try {
      if (parsed.command === 'install' || parsed.command === 'update') {
        const validation = installRuntime({
          runtime,
          isGlobal: parsed.isGlobal,
          explicitConfigDir: parsed.explicitConfigDir,
        });
        console.log(`  ${green}✓${reset} Installed ${label} to ${cyan}${validation.targetDir}${reset}`);
        printRuntimeUsageHints(runtime, validation.targetDir);
        continue;
      }

      if (parsed.command === 'uninstall') {
        const result = uninstallRuntime({
          runtime,
          isGlobal: parsed.isGlobal,
          explicitConfigDir: parsed.explicitConfigDir,
        });
        console.log(`  ${green}✓${reset} Uninstalled ${label} from ${cyan}${result.targetDir}${reset}`);
        continue;
      }

      if (parsed.command === 'validate') {
        const validation = validateRuntime({
          runtime,
          isGlobal: parsed.isGlobal,
          explicitConfigDir: parsed.explicitConfigDir,
        });
        printValidation(validation);
        if (validation.ok) {
          printRuntimeUsageHints(runtime, validation.targetDir);
        }
        if (!validation.ok) hadError = true;
      }
    } catch (error) {
      hadError = true;
      console.error(`  ${red}✗${reset} ${label}: ${error.message}`);
    }
  }

  if (hadError) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runCli();
}

module.exports = {
  CODEX_AGENT_SANDBOX,
  LEGACY_INTERNAL_SKILLS,
  NOVEL_CODEX_MARKER,
  convertNovelCommandToClaudeSkill,
  convertNovelCommandToCodexSkill,
  convertClaudeAgentToCodexAgent,
  extractFrontmatterAndBody,
  extractFrontmatterField,
  extractWorkflowAgentNames,
  extractWorkflowExecutionPolicy,
  generateCodexAgentToml,
  generateCodexConfigBlock,
  getTargetDir,
  installRuntime,
  getNovelCodexSkillAdapterHeader,
  listSourceAgents,
  listPublicCodexSkills,
  listSourceCommands,
  parseArgs,
  promptPathFor,
  getRuntimeUsageHints,
  rewriteRuntimeContent,
  rewriteSupportReferences,
  scanUnresolvedReferences,
  skillNameFromCommandFile,
  sourceRoot,
  stripNovelFromCodexConfig,
  uninstallRuntime,
  validateRuntime,
};
