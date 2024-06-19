const fs = require('fs');
const path = require('path');

function loadConfig(configPath) {
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config;
    } catch (err) {
      console.error(`Error reading configuration file at ${configPath}: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.error(`Configuration file not found at ${configPath}`);
    process.exit(1);
  }
}

module.exports = { loadConfig };
