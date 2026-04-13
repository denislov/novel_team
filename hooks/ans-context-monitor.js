#!/usr/bin/env node
// ans-hook-version: {{ANS_VERSION}}
// Context Monitor — PostToolUse/AfterTool hook for AI Novel Studio
// Ported from GSD's gsd-context-monitor.js, adapted for novel writing.
//
// Novel writing sessions consume context faster than coding sessions because:
// - Each chapter is 3000-5000 Chinese characters
// - Multiple reference files (CHARACTERS.md, TIMELINE.md) are loaded
// - Cross-chapter context is needed for consistency
//
// Thresholds (more aggressive than GSD):
//   WARNING  (remaining <= 40%): Agent should finish current chapter and pause
//   CRITICAL (remaining <= 25%): Agent should save progress immediately
//
// Debounce: 5 tool uses between warnings

const fs = require('fs');
const os = require('os');
const path = require('path');

const WARNING_THRESHOLD = 40;  // remaining_percentage <= 40% (GSD uses 35%)
const CRITICAL_THRESHOLD = 25; // remaining_percentage <= 25%
const STALE_SECONDS = 60;
const DEBOUNCE_CALLS = 5;

let input = '';
const stdinTimeout = setTimeout(() => process.exit(0), 10000);
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  clearTimeout(stdinTimeout);
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id;

    if (!sessionId) {
      process.exit(0);
    }

    // Check if context warnings are disabled via config
    const cwd = data.cwd || process.cwd();
    const configPath = path.join(cwd, 'config.json');
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const threshold = config.workflow?.context_monitor_threshold;
        if (threshold === 0 || threshold === false) {
          process.exit(0);
        }
      } catch (e) {
        // Ignore config parse errors
      }
    }

    const tmpDir = os.tmpdir();
    const metricsPath = path.join(tmpDir, `claude-ctx-${sessionId}.json`);

    if (!fs.existsSync(metricsPath)) {
      process.exit(0);
    }

    const metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf8'));
    const now = Math.floor(Date.now() / 1000);

    if (metrics.timestamp && (now - metrics.timestamp) > STALE_SECONDS) {
      process.exit(0);
    }

    const remaining = metrics.remaining_percentage;
    const usedPct = metrics.used_pct;

    if (remaining > WARNING_THRESHOLD) {
      process.exit(0);
    }

    // Debounce
    const warnPath = path.join(tmpDir, `ans-ctx-${sessionId}-warned.json`);
    let warnData = { callsSinceWarn: 0, lastLevel: null };
    let firstWarn = true;

    if (fs.existsSync(warnPath)) {
      try {
        warnData = JSON.parse(fs.readFileSync(warnPath, 'utf8'));
        firstWarn = false;
      } catch (e) { /* reset */ }
    }

    warnData.callsSinceWarn = (warnData.callsSinceWarn || 0) + 1;

    const isCritical = remaining <= CRITICAL_THRESHOLD;
    const currentLevel = isCritical ? 'critical' : 'warning';

    const severityEscalated = currentLevel === 'critical' && warnData.lastLevel === 'warning';
    if (!firstWarn && warnData.callsSinceWarn < DEBOUNCE_CALLS && !severityEscalated) {
      fs.writeFileSync(warnPath, JSON.stringify(warnData));
      process.exit(0);
    }

    warnData.callsSinceWarn = 0;
    warnData.lastLevel = currentLevel;
    fs.writeFileSync(warnPath, JSON.stringify(warnData));

    // Detect if ANS project is active
    const isAnsActive = fs.existsSync(path.join(cwd, 'PROJECT.md')) && fs.existsSync(path.join(cwd, 'STATE.md'));

    // Build warning message — novel-specific advice
    let message;
    if (isCritical) {
      message = isAnsActive
        ? `⚠️ 上下文即将耗尽：已使用 ${usedPct}%，剩余 ${remaining}%。` +
          '请立即完成当前段落，使用 ans-tools.cjs state refresh 保存进度。' +
          '不要开始新章节。告知用户上下文不足，建议在下次 session 继续。'
        : `⚠️ CONTEXT CRITICAL: Usage at ${usedPct}%. Remaining: ${remaining}%. ` +
          'Context is nearly exhausted. Inform the user and save progress.';
    } else {
      message = isAnsActive
        ? `⚡ 上下文提醒：已使用 ${usedPct}%，剩余 ${remaining}%。` +
          '建议完成当前章节后暂停，不要开始新章节的写作。如果正在批量创作，建议插入一个暂停点。'
        : `⚡ CONTEXT WARNING: Usage at ${usedPct}%. Remaining: ${remaining}%. ` +
          'Be aware that context is getting limited.';
    }

    const output = {
      hookSpecificOutput: {
        hookEventName: process.env.GEMINI_API_KEY ? "AfterTool" : "PostToolUse",
        additionalContext: message
      }
    };

    process.stdout.write(JSON.stringify(output));
  } catch (e) {
    process.exit(0);
  }
});
