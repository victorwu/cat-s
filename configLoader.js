const fs = require('fs');
const path = require('path');

function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    createDefaultConfig(configPath);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function createDefaultConfig(configPath) {
  const defaultConfig = {
    outputDir: '~/Downloads/cpr',
    include: [],
    exclude: [],
    ignorePaths: ['node_modules', '.git']
  };
  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
}

module.exports = {
  loadConfig,
  createDefaultConfig
};
