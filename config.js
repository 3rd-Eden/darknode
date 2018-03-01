const path = require('path');
const fs = require('fs');

//
// Setup our configuration so we can get access to auth information if needed.
//
const config = require('nconf');
config.env();

// @TODO scan for config files.

//
// Expose our config
//
module.exports = config;
