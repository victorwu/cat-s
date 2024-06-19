const fs = require('fs');
const path = require('path');

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

function appendFileContents(dir, fileStructure, outputStream, baseDir, progress) {
  Object.keys(fileStructure).forEach((key) => {
    const filePath = path.join(dir, key);
    const relativePath = path.relative(baseDir, filePath);
    if (fileStructure[key]) {
      appendFileContents(filePath, fileStructure[key], outputStream, baseDir, progress);
    } else {
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.size > 1024 * 1024) {
            console.log(`Skipping large file: ${relativePath}`);
            return;
          }
          const content = fs.readFileSync(filePath, 'utf8');
          const extension = path.extname(filePath);
          const language = getLanguage(extension);
          const mdContent = `\n\n## ${relativePath}\n\n\`\`\`${language}\n${content}\n\`\`\`\n`;

          outputStream.write(mdContent);
          console.log(`Content appended for: ${relativePath}`);
        } else {
          console.log(`File does not exist: ${relativePath}`);
        }
      } catch (err) {
        console.error(`Error reading file ${filePath}: ${err.message}`);
      }
    }
    progress.increment();
  });
}

module.exports = { appendFileContents };
