const path = require('path');
const fs = require('fs');

//
// Setup our configuration so we can get access to auth information if needed.
//
const config = require('nconf');
config.env();

//
// Check if a config file was placed in our root.
//
const root = path.join(__dirname, 'config.json');
if (fs.existsSync(root)) {
  config.file({ file: root });
}

//
// Expose our config
//
module.exports = config;
