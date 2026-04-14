#!/usr/bin/env node

/**
 * ans-tools.cjs — Unified CLI for AI Novel Studio
 *
 * Central command router. All workflow and agent interactions with the
 * filesystem should go through this tool, replacing fragile inline bash.
 *
 * Usage:
 *   node ans-tools.cjs <command> [subcommand] [args] [--raw] [--pick <field>]
 *
 * Commands:
 *   state load|get|update|patch|refresh|json|write-target|range-target
 *   chapter inspect|list|budget|budget-sync|promote|paths
 *   init write-chapter|plan-batch|autonomous|manager|new-project|review|progress
 *   check budget
 *   verify extract
 *   validate consistency|health
 *   config get|set
 */

const path = require('node:path');
const { findProjectRoot, parseNamedArgs, error } = require('./lib/core.cjs');

// ─── Arg parsing ──────────────────────────────────────────────────────────────

function parseTopArgs(argv) {
  if (argv.length === 0) {
    printUsage();
    process.exit(0);
  }

  const command = argv[0];
  const subcommand = argv[1] && !argv[1].startsWith('--') ? argv[1] : null;
  const restStart = subcommand ? 2 : 1;
  const rest = argv.slice(restStart);

  // Extract global flags
  const rawIdx = rest.indexOf('--raw');
  const raw = rawIdx !== -1;
  if (rawIdx !== -1) rest.splice(rawIdx, 1);

  const pickIdx = rest.indexOf('--pick');
  let pick = null;
  if (pickIdx !== -1) {
    pick = rest[pickIdx + 1] || null;
    rest.splice(pickIdx, 2);
  }

  // Extract --root
  const rootIdx = rest.indexOf('--root');
  let rootArg = '.';
  if (rootIdx !== -1) {
    rootArg = rest[rootIdx + 1] || '.';
    rest.splice(rootIdx, 2);
  }

  const root = path.resolve(findProjectRoot(rootArg));

  return { command, subcommand, rest, raw, pick, root };
}

function printUsage() {
  const usage = `ans-tools.cjs — AI Novel Studio CLI

Usage: node ans-tools.cjs <command> [subcommand] [args] [--raw] [--pick <field>] [--root <dir>]

Commands:
  state load                        Load full project stats as JSON
  state get [field]                 Get a specific field or full stats
  state update <field> <value>      Update a single STATE.md field
  state patch --field1 v1 ...       Batch update STATE.md fields
  state refresh                     Recompute state from filesystem
  state json                        STATE.md frontmatter as JSON
  state write-target [--chapter N]  Resolve next chapter to write
  state range-target --kind <k>     Resolve range (plan|review|polish)

  chapter inspect <N>               Inspect chapter file status
  chapter list                      List all chapters with status
  chapter budget <N> [--source s]   Analyze chapter word budget
  chapter budget-sync <N>           Sync budget to frontmatter
  chapter promote <N> [--source s]  Promote draft to formal
  chapter paths <N>                 Get artifact paths for chapter

  init write-chapter [N]            Context for write-chapter workflow
  init plan-batch [START-END]       Context for plan-batch workflow
  init autonomous                   Context for autonomous workflow
  init manager                      Context for manager workflow
  init new-project                  Context for new-project workflow
  init review [N]                   Context for review workflow
  init progress                     Context for progress workflow

  check budget --chapter N          Analyze chapter budget (alias of chapter budget)
  verify extract --report <path>    Extract structured verdict JSON from review report

  validate consistency              Cross-chapter name consistency
  validate health                   Project file integrity check

  config get [key]                  Read config value (dot-notation)
  config set <key> <value>          Write config value

Global Flags:
  --raw          Output raw value (for shell consumption)
  --pick <f>     Output only the named field from result JSON
  --root <dir>   Project root directory (default: auto-detect)
`;
  console.log(usage);
}

// ─── Command dispatch ─────────────────────────────────────────────────────────

function main() {
  const { command, subcommand, rest, raw, pick, root } = parseTopArgs(process.argv.slice(2));

  try {
    switch (command) {
      case 'state':
        return routeState(root, subcommand, rest, raw);
      case 'chapter':
        return routeChapter(root, subcommand, rest, raw);
      case 'init':
        return routeInit(root, subcommand, rest, raw);
      case 'check':
        return routeCheck(root, subcommand, rest, raw);
      case 'verify':
        return routeVerify(root, subcommand, rest, raw);
      case 'validate':
        return routeValidate(root, subcommand, rest, raw);
      case 'config':
        return routeConfig(root, subcommand, rest, raw);
      case 'help':
      case '--help':
      case '-h':
        printUsage();
        return;
      default:
        error(`unknown command: ${command}. Run with --help for usage.`);
    }
  } catch (e) {
    error(e.message);
  }
}

// ─── State routes ─────────────────────────────────────────────────────────────

function routeState(root, sub, rest, raw) {
  const state = require('./lib/state.cjs');
  const named = parseNamedArgs(rest,
    ['chapter', 'kind', 'range', 'field', 'status', 'current-arc', 'latest-completed', 'next-goal'],
    ['next', 'dry-run', 'json']
  );

  switch (sub) {
    case 'load':
      return state.cmdStateLoad(root, raw);
    case 'json':
      return state.cmdStateJson(root, raw);
    case 'get':
      return state.cmdStateGet(root, rest[0] || named.field, raw);
    case 'update': {
      const value = rest[1] === '--set' ? rest[2] : rest[1];
      return state.cmdStateUpdate(root, rest[0], value);
    }
    case 'patch': {
      // Parse remaining --key value pairs
      const patches = {};
      for (let i = 0; i < rest.length; i++) {
        if (rest[i].startsWith('--') && rest[i + 1] && !rest[i + 1].startsWith('--')) {
          patches[rest[i].slice(2)] = rest[i + 1];
          i++;
        }
      }
      return state.cmdStatePatch(root, patches, raw);
    }
    case 'refresh':
      return state.cmdStateRefresh(root, named, raw);
    case 'write-target':
      return state.cmdStateWriteTarget(root, named.chapter, named.next, raw);
    case 'range-target':
      return state.cmdStateRangeTarget(root, named.kind, named.range, raw);
    default:
      error(`unknown state subcommand: ${sub}. Try: load, get, update, patch, refresh, json, write-target, range-target`);
  }
}

// ─── Chapter routes ───────────────────────────────────────────────────────────

function routeChapter(root, sub, rest, raw) {
  const chapter = require('./lib/chapter.cjs');
  const named = parseNamedArgs(rest, ['source'], ['force', 'dry-run']);
  const chapterNum = rest[0] && /^\d+$/.test(rest[0]) ? rest[0] : null;

  switch (sub) {
    case 'inspect':
      return chapter.cmdChapterInspect(root, chapterNum, raw);
    case 'list':
      return chapter.cmdChapterList(root, raw);
    case 'budget':
      return chapter.cmdChapterBudget(root, chapterNum, named.source, raw);
    case 'budget-sync':
      return chapter.cmdChapterBudgetSync(root, chapterNum, named.source, raw);
    case 'promote':
      return chapter.cmdChapterPromote(root, chapterNum, named.source, named.force, named['dry-run'], raw);
    case 'paths':
      return chapter.cmdChapterPaths(root, chapterNum, raw);
    default:
      error(`unknown chapter subcommand: ${sub}. Try: inspect, list, budget, budget-sync, promote, paths`);
  }
}

// ─── Init routes ──────────────────────────────────────────────────────────────

function routeInit(root, sub, rest, raw) {
  const init = require('./lib/init.cjs');
  const chapterNum = rest[0] && /^\d+$/.test(rest[0]) ? rest[0] : null;

  switch (sub) {
    case 'write-chapter':
      return init.cmdInitWriteChapter(root, chapterNum, raw);
    case 'plan-batch':
      return init.cmdInitPlanBatch(root, rest[0] || null, raw);
    case 'autonomous':
      return init.cmdInitAutonomous(root, raw);
    case 'manager':
      return init.cmdInitManager(root, raw);
    case 'new-project':
      return init.cmdInitNewProject(root, raw);
    case 'review':
      return init.cmdInitReview(root, rest[0] || null, raw);
    case 'progress':
      return init.cmdInitProgress(root, raw);
    default:
      error(`unknown init subcommand: ${sub}. Try: write-chapter, plan-batch, autonomous, manager, new-project, review, progress`);
  }
}

// ─── Validate routes ──────────────────────────────────────────────────────────

function routeCheck(root, sub, rest, raw) {
  const chapter = require('./lib/chapter.cjs');
  const named = parseNamedArgs(rest, ['chapter', 'source'], []);

  switch (sub) {
    case 'budget':
      return chapter.cmdChapterBudget(root, named.chapter || rest[0], named.source || 'formal', raw);
    default:
      error(`unknown check subcommand: ${sub}. Try: budget`);
  }
}

function routeVerify(root, sub, rest, raw) {
  const verify = require('./lib/verify.cjs');
  const named = parseNamedArgs(rest, ['report'], []);

  switch (sub) {
    case 'extract':
      return verify.cmdVerifyExtract(root, named.report, raw);
    default:
      error(`unknown verify subcommand: ${sub}. Try: extract`);
  }
}

function routeValidate(root, sub, rest, raw) {
  const verify = require('./lib/verify.cjs');

  switch (sub) {
    case 'consistency':
      return verify.cmdValidateConsistency(root, raw);
    case 'health':
      return verify.cmdValidateHealth(root, raw);
    default:
      error(`unknown validate subcommand: ${sub}. Try: consistency, health`);
  }
}

// ─── Config routes ────────────────────────────────────────────────────────────

function routeConfig(root, sub, rest, raw) {
  const config = require('./lib/config.cjs');

  switch (sub) {
    case 'get':
      return config.cmdConfigGet(root, rest[0], raw);
    case 'set':
      return config.cmdConfigSet(root, rest[0], rest[1], raw);
    default:
      error(`unknown config subcommand: ${sub}. Try: get, set`);
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

main();
