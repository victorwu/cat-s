const fs = require('fs');
const path = require('path');
const ignore = require('ignore');
const cliProgress = require('cli-progress');
const { execSync } = require('child_process');

// Load configuration
const configPath = path.join(__dirname, 'config.json');
let config;

if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error(`Error reading configuration file at ${configPath}: ${err.message}`);
    process.exit(1);
  }
} else {
  console.error(`Configuration file not found at ${configPath}`);
  process.exit(1);
}

// Rename whitelist and blacklist to include and exclude
const includeExtensions = config.include || [];
const excludeExtensions = config.exclude || [];
config.ignorePaths.push('pnpm-lock.yaml');  // Add pnpm-lock.yaml to the ignore list

// Load .gitignore and setup ignore filter
const ig = ignore();
if (config.useGitignore && fs.existsSync('.gitignore')) {
  const gitignoreContent = fs.readFileSync('.gitignore', 'utf8');
  ig.add(gitignoreContent.split('\n').filter(Boolean));
}

// Add additional paths to ignore
ig.add(config.ignorePaths);

// Check if a file should be processed based on include and exclude
function shouldProcessFile(file) {
  const ext = path.extname(file);
  if (excludeExtensions.includes(ext)) return false;
  if (includeExtensions.length > 0) return includeExtensions.includes(ext);
  return true;
}

// Function to traverse directory and collect file information
function traverseDir(dir, fileStructure = {}, baseDir = dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(baseDir, filePath);
    const stats = fs.statSync(filePath);

    if (ig.ignores(relativePath) || config.ignorePaths.includes(relativePath)) return;

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

// Function to get the correct language for syntax highlighting
function getLanguage(extension) {
  const languages = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.json': 'json',
    '.md': 'markdown',
    '.sh': 'shell',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    'Dockerfile': 'docker'
    // Add more extensions and their corresponding languages as needed
  };
  return languages[extension] || '';
}

// Function to append file contents to the output
function appendFileContents(dir, fileStructure, outputStream, baseDir, progress) {
  Object.keys(fileStructure).forEach((key) => {
    const filePath = path.join(dir, key);
    const relativePath = path.relative(baseDir, filePath);
    if (fileStructure[key]) {
      appendFileContents(filePath, fileStructure[key], outputStream, baseDir, progress);
    } else {
      try {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          const extension = path.extname(filePath);
          const language = getLanguage(extension);
          const mdContent = `\n\n## ${relativePath}\n\n\`\`\`${language}\n${content}\n\`\`\`\n`;

          outputStream.write(mdContent);
          console.log(`Content appended for: ${relativePath}`);
        }
      } catch (err) {
        console.error(`Error reading file ${filePath}: ${err.message}`);
      }
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
  const fileStructure = traverseDir(repoPath);
  const fileCount = Object.keys(fileStructure).reduce((count, key) => {
    return count + (fileStructure[key] ? Object.keys(fileStructure[key]).length : 1);
  }, 0);

  const progress = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
  progress.start(fileCount, 0);

  const sitemap = generateSitemap(fileStructure);

  const repoName = getRepoName(repoPath);
  const commitHash = getCurrentCommitHash(repoPath);
  const timestamp = getCurrentTimestamp();
  const sitemapFileName = commitHash
    ? `repoSummary_${repoName}_(${commitHash}_${timestamp}).md`
    : `repoSummary_${repoName}_${timestamp}.md`;

  const outputDir = path.resolve(config.outputDir);
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

// Run the script with the repository path
const repoPath = process.argv[2] || '.';
createRepoSummary(repoPath);
