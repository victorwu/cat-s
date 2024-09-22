const fs = require('fs');
const path = require('path');
const os = require('os');

function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    createDefaultConfig(configPath);
  }
  try {
    const rawData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(rawData);

    // Expand '~' to the actual home directory in outputDir
    if (config.outputDir.startsWith('~')) {
      config.outputDir = path.join(os.homedir(), config.outputDir.slice(1));
    }

    return config;
  } catch (err) {
    console.error('Error parsing config.json:', err);
    process.exit(1);
  }
}

function createDefaultConfig(configPath) {
  const defaultConfig = {
    useGitignore: true,
    include: [".js", ".jsx", ".json", ".md", ".sh", ".ts", ".tsx", ".yaml", ".yml", "Dockerfile"],
    exclude: [".env", ".jpg", ".mp4", ".tsbuildinfo", "package-lock.json"],
    ignorePaths: [".git", "build", "config", "dist", "node_modules"],
    outputDir: path.join(os.homedir(), 'Downloads', 'cats'),
    maxFileSize: 1024  // Default to 1024 KB
  };
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
}

module.exports = {
  loadConfig,
  createDefaultConfig
};
