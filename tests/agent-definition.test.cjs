const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { describe, test } = require('node:test');

const { listSourceAgents, sourceRoot } = require('../bin/install.js');

const root = sourceRoot();
const agentsDir = path.join(root, 'agents');
const workflowsDir = path.join(root, 'workflows');

function extractSpawnedAgents(content) {
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

function extractCodexExecutionPolicy(content) {
  const match = content.match(/<codex_execution_policy>([\s\S]*?)<\/codex_execution_policy>/);
  if (!match) return null;

  return Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const separator = line.indexOf(':');
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      })
  );
}

describe('agent frontmatter', () => {
  for (const agentName of listSourceAgents()) {
    test(`${agentName} keeps required Claude agent fields`, () => {
      const content = fs.readFileSync(path.join(agentsDir, `${agentName}.md`), 'utf8');
      const frontmatter = (content.split('---')[1] || '').trim();

      assert.ok(frontmatter.includes('name:'), 'missing name field');
      assert.ok(frontmatter.includes('description:'), 'missing description field');
      assert.ok(frontmatter.includes('tools:'), 'missing tools field');
      assert.ok(frontmatter.includes('color:'), 'missing color field');
      assert.ok(!frontmatter.includes('skills:'), 'skills frontmatter breaks multi-runtime conversion');
    });
  }
});

describe('workflow agent references', () => {
  const validAgents = new Set(listSourceAgents());
  const workflowFiles = fs.readdirSync(workflowsDir).filter((file) => file.endsWith('.md')).sort();

  for (const file of workflowFiles) {
    test(`${file} lists every spawned named agent`, () => {
      const content = fs.readFileSync(path.join(workflowsDir, file), 'utf8');
      const spawned = extractSpawnedAgents(content);

      for (const agentName of spawned) {
        assert.ok(validAgents.has(agentName), `unknown agent referenced: ${agentName}`);
      }

      if (spawned.length === 0) return;

      const availableMatch = content.match(/<available_agent_types>([\s\S]*?)<\/available_agent_types>/);
      assert.ok(availableMatch, 'workflow spawns named agents but lacks <available_agent_types>');

      const availableSection = availableMatch[1];
      for (const agentName of new Set(spawned)) {
        assert.ok(
          availableSection.includes(agentName),
          `workflow spawns ${agentName} but does not list it in <available_agent_types>`
        );
      }

      const executionPolicy = extractCodexExecutionPolicy(content);
      assert.ok(executionPolicy, 'workflow spawns named agents but lacks <codex_execution_policy>');
      assert.strictEqual(
        executionPolicy.delegation,
        'required_named_agents',
        'workflow with named agents must declare required_named_agents delegation'
      );
      assert.strictEqual(
        executionPolicy.public_entrypoint,
        'explicit_public_skills',
        'workflow with named agents must keep explicit public skill entrypoints'
      );
      assert.strictEqual(
        executionPolicy.allow_inline_fallback,
        'false',
        'workflow with named agents must reject inline fallback'
      );
    });
  }
});
