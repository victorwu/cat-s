#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const cliProgress = require('cli-progress');
const { execSync } = require('child_process');
const { loadConfig, createDefaultConfig } = require('./configLoader');
const { setupIgnore, traverseDir, countFiles } = require('./fileTraversal');
const { appendFileContents } = require('./fileProcessing');
const yargs = require('yargs');
const os = require('os');

// Load configuration or create default config if it doesn't exist
const configDir = path.join(os.homedir(), '.cats');
const configPath = path.join(configDir, 'config.json');

if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });  // Ensure all parent directories are created
    createDefaultConfig(configPath);
}

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
function catSave(repoPath) {
  console.log('Scanning files...');
  const fileStructure = traverseDir(repoPath, {}, repoPath, ig, config.include, config.exclude, config);
  const fileCount = countFiles(fileStructure); // Using countFiles function

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

  const outputDir = path.resolve(config.outputDir);
  console.log(`Output directory resolved to: ${outputDir}`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created output directory: ${outputDir}`);
  }
  const sitemapPath = path.join(outputDir, sitemapFileName);

  const outputStream = fs.createWriteStream(sitemapPath);
  outputStream.write(`# File Structure Sitemap\n\n${sitemap}\n`);
  console.log(`Sitemap written: ${sitemapPath}`);

  appendFileContents(repoPath, fileStructure, outputStream, repoPath, progress, config.maxFileSize);  // Pass maxFileSize
  outputStream.end(() => {
    progress.stop();
    console.log(`Repo summary created in ${sitemapPath}`);
  });
}

// Define command-line options
const argv = yargs
  .usage('Usage: cats [options] <repoPath>')
  .option('o', {
    alias: 'output',
    description: 'Specify the output file path (default: "repo_summary.md")',
    type: 'string',
    default: 'repo_summary.md'
  })
  .option('i', {
    alias: 'ignore',
    description: 'Specify patterns to ignore (comma-separated)',
    type: 'string'
  })
  .option('m', {
    alias: 'max-file-size',
    description: 'Maximum file size in KB to include (default: 1024)',
    type: 'number',
    default: 1024
  })
  .command('config', 'Edit the configuration file', {}, () => {
    console.log(`Config file location: ${configPath}`);
    const editor = process.env.EDITOR || 'vi';
    execSync(`${editor} ${configPath}`, { stdio: 'inherit' });
  })
  .command('version', 'Show the version', {}, () => {
    const packageJson = require('./package.json');
    console.log(`cat-s version: ${packageJson.version}`);
  })
  .help('h')
  .alias('h', 'help')
  .argv;

// Handle the repo path argument
const repoPath = argv._[0] || '.';

// If command is 'config' or 'version', the respective command handler will execute
if (argv._.length === 0 && !argv.config && !argv.version) {
  yargs.showHelp();
} else {
  catSave(repoPath);
}
