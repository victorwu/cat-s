const fs = require('fs');
const path = require('path');

const outputFileName = 'repo_summary.txt';

// Function to traverse directory and collect file information
function traverseDir(dir, fileStructure = {}, baseDir = dir) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const relativePath = path.relative(baseDir, filePath);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      fileStructure[relativePath] = {};
      traverseDir(filePath, fileStructure[relativePath], baseDir);
    } else {
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
function appendFileContents(dir, fileStructure, outputStream) {
  Object.keys(fileStructure).forEach((key) => {
    const filePath = path.join(dir, key);
    if (fileStructure[key]) {
      appendFileContents(dir, fileStructure[key], outputStream);
    } else {
      outputStream.write(`\n\n===== ${key} =====\n\n`);
      const content = fs.readFileSync(filePath, 'utf8');
      outputStream.write(content);
    }
  });
}

// Main function to create the repo summary file
function createRepoSummary(repoPath) {
  const fileStructure = traverseDir(repoPath);
  const sitemap = generateSitemap(fileStructure);

  const outputStream = fs.createWriteStream(outputFileName);
  outputStream.write('File Structure Sitemap:\n\n');
  outputStream.write(sitemap);

  appendFileContents(repoPath, fileStructure, outputStream);
  outputStream.end();

  console.log(`Repo summary created in ${outputFileName}`);
}

// Run the script with the repository path
const repoPath = process.argv[2] || '.';
createRepoSummary(repoPath);
