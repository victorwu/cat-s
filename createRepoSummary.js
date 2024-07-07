#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');
const { execSync } = require('child_process');
const { loadConfig } = require('./configLoader');
const { setupIgnore, traverseDir } = require('./fileTraversal');
const { appendFileContents } = require('./fileProcessing');
const yargs = require('yargs');

// Load configuration
const configPath = path.join(__dirname, 'config.json');
const config = loadConfig(configPath);

// Setup ignore filter
const ig = setupIgnore(config);

// Traverse the directory and build the file structure
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

// Function to get the current git commit hash
function getCurrentCommitHash(repoPath) {
  try {
    return execSync('git rev-parse HEAD', { cwd: repoPath, encoding: 'utf8' }).trim().substring(0, 8);
  } catch (error) {
    console.warn('Could not retrieve git commit hash');
    return null;
  }
}

// Function to get the current timestamp
function getCurrentTimestamp() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

// Function to extract the actual repository name
function getRepoName(repoPath) {
  return path.basename(path.resolve(repoPath));
}

// Main function to create the repo summary files
function createRepoSummary(repoPath) {
  console.log('Scanning files...');
  const fileStructure = traverseDir(repoPath, {}, repoPath, ig, config.include, config.exclude, config);
  const fileCount = Object.keys(fileStructure).reduce((count, key) => {
    return count + (fileStructure[key] ? Object.keys(fileStructure[key]).length : 1);
  }, 0);

  console.log(`Total files to process: ${fileCount}`);

  const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progress.start(fileCount, 0);

  const sitemap = generateSitemap(fileStructure);

  const repoName = getRepoName(repoPath);
  const commitHash = getCurrentCommitHash(repoPath);
  const timestamp = getCurrentTimestamp();
  const sitemapFileName = commitHash
    ? `repoSummary_${repoName}_(${commitHash}_${timestamp}).txt`
    : `repoSummary_${repoName}_${timestamp}.txt`;

  const outputDir = path.resolve(config.outputDir.replace('~', process.env.HOME));
  console.log(`Output directory resolved to: ${outputDir}`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }
  const sitemapPath = path.join(outputDir, sitemapFileName);

  const outputStream = fs.createWriteStream(sitemapPath);
  outputStream.write(`# File Structure Sitemap\n\n${sitemap}\n`);
  console.log(`Sitemap written: ${sitemapPath}`);

  appendFileContents(repoPath, fileStructure, outputStream, repoPath, progress);
  outputStream.end(() => {
    progress.stop();
    console.log(`Repo summary created in ${sitemapPath}`);
  });
}

// Define command-line options
const argv = yargs
  .usage('Usage: cpr [options] <repoPath>')
  .command('config', 'Edit the configuration file', {}, () => {
    const editor = process.env.EDITOR || 'vi';
    const configFilePath = path.resolve(configPath);
    execSync(`${editor} ${configFilePath}`, { stdio: 'inherit' });
  })
  .help('h')
  .alias('h', 'help')
  .argv;

// Handle the repo path argument
const repoPath = argv._[0] || '.';

createRepoSummary(repoPath);
