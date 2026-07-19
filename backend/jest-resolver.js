const path = require('path');
const fs = require('fs');

let srcFileMap = null;

function buildSrcFileMap() {
  const map = new Map();
  const srcDir = path.resolve(__dirname, 'src');

  function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (stat.isFile()) {
        map.set(file, dir);
      }
    }
  }

  if (fs.existsSync(srcDir)) {
    walk(srcDir);
  }
  return map;
}

module.exports = (request, options) => {
  // 1. Resolve third-party modules using backend/node_modules
  if (!request.startsWith('.')) {
    options.basedir = path.resolve(__dirname);
    return options.defaultResolver(request, options);
  }

  // 2. Resolve relative imports inside backend tests
  if (options.basedir && options.basedir.includes('tests/be-tests')) {
    const stack = new Error().stack;
    const match = stack.match(/tests\/be-tests\/([^:\s)]+)/);
    if (match) {
      const specFile = match[1]; // e.g. "wall.service.spec.ts"
      const sourceFile = specFile.replace('.spec.ts', '.ts');

      if (!srcFileMap) {
        srcFileMap = buildSrcFileMap();
      }

      const targetDir = srcFileMap.get(sourceFile);
      if (targetDir) {
        // Resolve the request relative to the found source directory
        const resolvedPath = path.resolve(targetDir, request);
        return options.defaultResolver(resolvedPath, options);
      }
    }
  }

  return options.defaultResolver(request, options);
};
