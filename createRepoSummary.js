const fs = require('fs');
const path = require('path');
const ignore = require('ignore');
const cliProgress = require('cli-progress');
const { execSync } = require('child_process');

// Load .gitignore and setup ignore filter
const ig = ignore();
if (fs.existsSync('.gitignore')) {
  const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
  ig.add(gitignoreContent.split('\n').filter(Boolean));
}

// Whitelist and blacklist configurations
const whitelist = ['.js', '.json', '.tsx'];
const blacklist = ['.jpg', '.mp4'];

// Check if a file should be processed based on whitelist and blacklist
function shouldProcessFile(file) {
  const ext = path.extname(file);
  if (blacklist.includes(ext)) return false;
  if (whitelist.length > 0) return whitelist.includes(ext);
  return true;
}

// Function to traverse directory and collect file information
function traverseDir(dir, fileStructure = {}, baseDir = dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(baseDir, filePath);
    const stats = fs.statSync(filePath);

    if (ig.ignores(relativePath)) return;

    if (stats.isDirectory()) {
      fileStructure[relativePath] = {};
      traverseDir(filePath, fileStructure[relativePath], baseDir);
    } else if (shouldProcessFile(file)) {
      fileStructure[relativePath] = null;
    }
  });

  return fileStructure;
}

// Function to generate sitemap
function generateSitemap(fileStructure, indent = '') {
  let sitemap = '';
  Object.keys(fileStructure).forEach((key) => {
    sitemap += `${indent}${key}\n`;
    if (fileStructure[key]) {
      sitemap += generateSitemap(fileStructure[key], indent + '  ');
    }
  });
  return sitemap;
}

// Function to append file contents to the output
function appendFileContents(dir, fileStructure, outputStream, progress) {
  Object.keys(fileStructure).forEach((key) => {
    const filePath = path.join(dir, key);
    if (fileStructure[key]) {
      appendFileContents(dir, fileStructure[key], outputStream, progress);
    } else {
      outputStream.write(`\n\n===== ${key} =====\n\n`);
      const content = fs.readFileSync(filePath, 'utf8');
      outputStream.write(content);
    }
    progress.increment();
  });
}

// Function to get the current git commit hash
function getCurrentCommitHash(repoPath) {
  try {
    return execSync('git rev-parse HEAD', { cwd: repoPath, encoding: 'utf8' }).trim().substring(0, 8);
  } catch (error) {
    console.warn('Could not retrieve git commit hash');
    return null;
  }
}

// Function to extract the actual repository name
function getRepoName(repoPath) {
  return path.basename(path.resolve(repoPath));
}

// Main function to create the repo summary file
function createRepoSummary(repoPath) {
  console.log('Scanning files...');
  const fileStructure = traverseDir(repoPath);
  const fileCount = Object.keys(fileStructure).reduce((count, key) => {
    return count + (fileStructure[key] ? Object.keys(fileStructure[key]).length : 1);
  }, 0);

  const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progress.start(fileCount, 0);

  const sitemap = generateSitemap(fileStructure);

  const repoName = getRepoName(repoPath);
  const commitHash = getCurrentCommitHash(repoPath);
  const outputFileName = commitHash
    ? `repoSummary_${repoName}_(${commitHash}).js`
    : `repoSummary_${repoName}.js`;

  const outputStream = fs.createWriteStream(outputFileName);
  outputStream.write('File Structure Sitemap:\n\n');
  outputStream.write(sitemap);

  appendFileContents(repoPath, fileStructure, outputStream, progress);
  outputStream.end(() => {
    progress.stop();
    console.log(`Repo summary created in ${outputFileName}`);
  });
}

// Run the script with the repository path
const repoPath = process.argv[2] || '.';
createRepoSummary(repoPath);
