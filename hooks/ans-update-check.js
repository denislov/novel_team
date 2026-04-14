#!/usr/bin/env node
// ans-hook-version: {{ANS_VERSION}}
// Check for ANS updates in the background and cache the result.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const MANAGED_HOOKS = [
  'ans-context-monitor.js',
  'ans-statusline.js',
  'ans-update-check.js',
];

function detectConfigDir(baseDir) {
  const envCandidates = [
    process.env.CLAUDE_CONFIG_DIR,
    process.env.GEMINI_CONFIG_DIR,
    process.env.CODEX_HOME,
    process.env.COPILOT_CONFIG_DIR,
    process.env.CURSOR_CONFIG_DIR,
    process.env.WINDSURF_CONFIG_DIR,
    process.env.OPENCODE_CONFIG_DIR,
    process.env.ANTIGRAVITY_CONFIG_DIR,
  ].filter(Boolean);

  for (const candidate of envCandidates) {
    if (fs.existsSync(path.join(candidate, 'ai-novel-studio', 'VERSION'))) {
      return candidate;
    }
  }

  const dirs = [
    '.claude',
    '.gemini',
    '.codex',
    '.copilot',
    '.cursor',
    '.windsurf',
    path.join('.config', 'opencode'),
    path.join('.gemini', 'antigravity'),
  ];

  for (const dir of dirs) {
    const fullPath = path.join(baseDir, dir);
    if (fs.existsSync(path.join(fullPath, 'ai-novel-studio', 'VERSION'))) {
      return fullPath;
    }
  }

  return path.join(baseDir, '.claude');
}

const homeDir = os.homedir();
const cwd = process.cwd();
const globalConfigDir = detectConfigDir(homeDir);
const projectConfigDir = detectConfigDir(cwd);
const cacheDir = path.join(homeDir, '.cache', 'ans');
const cacheFile = path.join(cacheDir, 'ans-update-check.json');

const projectVersionFile = path.join(projectConfigDir, 'ai-novel-studio', 'VERSION');
const globalVersionFile = path.join(globalConfigDir, 'ai-novel-studio', 'VERSION');

fs.mkdirSync(cacheDir, { recursive: true });

const child = spawn(process.execPath, ['-e', `
  const fs = require('fs');
  const path = require('path');
  const { execSync } = require('child_process');

  function parseVersion(value) {
    return String(value || '')
      .replace(/^v/, '')
      .split('.')
      .map((part) => Number(String(part).replace(/-.*/, '')) || 0);
  }

  function isNewer(a, b) {
    const pa = parseVersion(a);
    const pb = parseVersion(b);
    for (let i = 0; i < 3; i++) {
      if ((pa[i] || 0) > (pb[i] || 0)) return true;
      if ((pa[i] || 0) < (pb[i] || 0)) return false;
    }
    return false;
  }

  const cacheFile = ${JSON.stringify(cacheFile)};
  const projectVersionFile = ${JSON.stringify(projectVersionFile)};
  const globalVersionFile = ${JSON.stringify(globalVersionFile)};
  const managedHooks = ${JSON.stringify(MANAGED_HOOKS)};

  let installed = '0.0.0';
  let configDir = '';
  try {
    if (fs.existsSync(projectVersionFile)) {
      installed = fs.readFileSync(projectVersionFile, 'utf8').trim();
      configDir = path.dirname(path.dirname(projectVersionFile));
    } else if (fs.existsSync(globalVersionFile)) {
      installed = fs.readFileSync(globalVersionFile, 'utf8').trim();
      configDir = path.dirname(path.dirname(globalVersionFile));
    }
  } catch {}

  const staleHooks = [];
  if (configDir) {
    const hooksDir = path.join(configDir, 'hooks');
    try {
      if (fs.existsSync(hooksDir)) {
        const hookFiles = fs.readdirSync(hooksDir).filter((name) => managedHooks.includes(name));
        for (const hookFile of hookFiles) {
          try {
            const content = fs.readFileSync(path.join(hooksDir, hookFile), 'utf8');
            const match = content.match(/\\/\\/ ans-hook-version:\\s*(.+)/);
            if (!match) {
              staleHooks.push({ file: hookFile, hookVersion: 'unknown', installedVersion: installed });
              continue;
            }
            const hookVersion = match[1].trim();
            if (hookVersion.includes('{{')) continue;
            if (isNewer(installed, hookVersion)) {
              staleHooks.push({ file: hookFile, hookVersion, installedVersion: installed });
            }
          } catch {}
        }
      }
    } catch {}
  }

  let latest = null;
  try {
    latest = execSync('npm view ans-tool version', {
      encoding: 'utf8',
      timeout: 10000,
      windowsHide: true,
    }).trim();
  } catch {}

  const result = {
    update_available: latest && isNewer(latest, installed),
    installed,
    latest: latest || 'unknown',
    checked: Math.floor(Date.now() / 1000),
    stale_hooks: staleHooks.length > 0 ? staleHooks : undefined,
  };

  fs.writeFileSync(cacheFile, JSON.stringify(result));
`], {
  stdio: 'ignore',
  windowsHide: true,
  detached: true,
});

child.unref();
