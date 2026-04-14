#!/usr/bin/env node
// ans-hook-version: {{ANS_VERSION}}
// Claude/Gemini statusline for AI Novel Studio.

const fs = require('fs');
const path = require('path');
const os = require('os');

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result = {};
  for (const line of match[1].split('\n')) {
    const parsed = line.match(/^([A-Za-z0-9_]+):\s*(.+)$/);
    if (!parsed) continue;
    const [, key, value] = parsed;
    result[key] = value.trim().replace(/^['"]|['"]$/g, '');
  }
  return result;
}

function readAnsState(dir) {
  const home = os.homedir();
  let current = dir;

  for (let i = 0; i < 10; i++) {
    const statePath = path.join(current, 'STATE.md');
    if (fs.existsSync(statePath)) {
      try {
        return parseFrontmatter(fs.readFileSync(statePath, 'utf8'));
      } catch {
        return null;
      }
    }

    const parent = path.dirname(current);
    if (parent === current || current === home) break;
    current = parent;
  }

  return null;
}

function formatAnsState(state) {
  if (!state) return '';

  const parts = [];

  if (state.project) parts.push(state.project);
  if (state.status) parts.push(state.status);

  if (state.current_arc && state.current_arc !== 'null') {
    parts.push(state.current_arc);
  }

  if (state.current_chapter && state.current_chapter !== '0') {
    parts.push(`第${state.current_chapter}章`);
  }

  return parts.join(' · ');
}

function writeBridge(sessionId, remaining, used) {
  if (!sessionId || /[/\\]|\.\./.test(sessionId)) return;

  try {
    const bridgePath = path.join(os.tmpdir(), `claude-ctx-${sessionId}.json`);
    fs.writeFileSync(bridgePath, JSON.stringify({
      session_id: sessionId,
      remaining_percentage: remaining,
      used_pct: used,
      timestamp: Math.floor(Date.now() / 1000),
    }));
  } catch {
    // Best effort only.
  }
}

function readUpdateBanner(homeDir) {
  const cacheFile = path.join(homeDir, '.cache', 'ans', 'ans-update-check.json');
  if (!fs.existsSync(cacheFile)) return '';

  try {
    const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    if (cache.update_available) {
      return '\x1b[33m⬆ ans-tool\x1b[0m │ ';
    }
    if (cache.stale_hooks && cache.stale_hooks.length > 0) {
      return '\x1b[33m⚠ hooks stale\x1b[0m │ ';
    }
  } catch {
    return '';
  }

  return '';
}

function formatContext(remaining, sessionId) {
  if (remaining == null) return '';

  const bufferPct = 16.5;
  const usableRemaining = Math.max(0, ((remaining - bufferPct) / (100 - bufferPct)) * 100);
  const used = Math.max(0, Math.min(100, Math.round(100 - usableRemaining)));

  writeBridge(sessionId, remaining, used);

  const filled = Math.floor(used / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);

  if (used < 50) return ` \x1b[32m${bar} ${used}%\x1b[0m`;
  if (used < 70) return ` \x1b[33m${bar} ${used}%\x1b[0m`;
  if (used < 85) return ` \x1b[38;5;208m${bar} ${used}%\x1b[0m`;
  return ` \x1b[5;31m${bar} ${used}%\x1b[0m`;
}

function main() {
  let input = '';
  const stdinTimeout = setTimeout(() => process.exit(0), 3000);

  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (chunk) => {
    input += chunk;
  });
  process.stdin.on('end', () => {
    clearTimeout(stdinTimeout);

    try {
      const data = JSON.parse(input);
      const homeDir = os.homedir();
      const dir = data.workspace?.current_dir || process.cwd();
      const model = data.model?.display_name || 'Claude';
      const sessionId = data.session_id || '';
      const remaining = data.context_window?.remaining_percentage;

      const state = formatAnsState(readAnsState(dir));
      const directory = path.basename(dir);
      const update = readUpdateBanner(homeDir);
      const context = formatContext(remaining, sessionId);

      const center = state || directory;
      process.stdout.write(`${update}${model} │ ${center}${context}`);
    } catch {
      process.exit(0);
    }
  });
}

main();
