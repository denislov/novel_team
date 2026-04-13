const fs = require('node:fs');
const path = require('node:path');

const {
  IGNORED_DIRS,
  STRUCTURED_DIRS,
  TEXT_SUFFIXES,
} = require('./constants.cjs');
const { classifyFile } = require('./classify.cjs');

function shouldSkipRelativeDir(relativeDir) {
  if (!relativeDir || relativeDir === '.') return false;
  return relativeDir.split(path.sep).some((part) => IGNORED_DIRS.has(part) || STRUCTURED_DIRS.has(part));
}

function walkFiles(rootDir) {
  const results = [];
  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const fullPath = path.join(current, entry.name);
      const relativeDir = path.relative(rootDir, entry.isDirectory() ? fullPath : path.dirname(fullPath));
      if (entry.isDirectory()) {
        if (shouldSkipRelativeDir(relativeDir)) continue;
        stack.push(fullPath);
      } else if (TEXT_SUFFIXES.has(path.extname(entry.name).toLowerCase()) && !shouldSkipRelativeDir(path.relative(rootDir, path.dirname(fullPath)))) {
        results.push(fullPath);
      }
    }
  }
  return results.sort();
}

function scanCandidates(sourceDir, readText) {
  return walkFiles(sourceDir).map((filePath) => classifyFile(filePath, sourceDir, readText));
}

module.exports = {
  scanCandidates,
  shouldSkipRelativeDir,
  walkFiles,
};
