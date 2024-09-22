const fs = require('fs');
const path = require('path');
const ignore = require('ignore');

function setupIgnore(config) {
  const ig = ignore();
  if (config.useGitignore && fs.existsSync('.gitignore')) {
    const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
    ig.add(gitignoreContent.split('\n').filter(Boolean));
  }
  ig.add(config.ignorePaths);
  return ig;
}

function shouldProcessFile(file, includeExtensions, excludeExtensions) {
  const ext = path.extname(file);
  if (excludeExtensions.includes(ext)) return false;
  if (includeExtensions.length > 0) return includeExtensions.includes(ext);
  return true;
}

function traverseDir(dir, fileStructure = {}, baseDir = dir, ig, includeExtensions, excludeExtensions, config) {
  let files;
  try {
    files = fs.readdirSync(dir);
  } catch (err) {
    console.error(`Error reading directory ${dir}: ${err.message}`);
    return fileStructure;
  }

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(baseDir, filePath);
    let stats;
    try {
      stats = fs.statSync(filePath);
    } catch (err) {
      console.error(`Error stating file ${filePath}: ${err.message}`);
      return;
    }

    if (ig.ignores(relativePath) || config.ignorePaths.includes(relativePath)) return;

    if (stats.isDirectory()) {
      console.log(`Traversing directory: ${relativePath}`);
      fileStructure[file] = {};
      traverseDir(filePath, fileStructure[file], baseDir, ig, includeExtensions, excludeExtensions, config);
    } else if (shouldProcessFile(file, includeExtensions, excludeExtensions)) {
      console.log(`Found file: ${relativePath}`);
      fileStructure[file] = null;
    }
  });

  return fileStructure;
}

function countFiles(fileStructure) {
  let count = 0;
  Object.keys(fileStructure).forEach((key) => {
    if (fileStructure[key] && typeof fileStructure[key] === 'object') {
      count += countFiles(fileStructure[key]);
    } else {
      count += 1;
    }
  });
  return count;
}

module.exports = { setupIgnore, traverseDir, shouldProcessFile, countFiles };
