const winston = require('winston');
const config = require('./config');

//
// Setup our request logger so we can get some information about the payloads
// that we're processing.
//
const logger = new winston.Logger({
  level: config.get('loglevel') || 'info',
  transports: [
    new (winston.transports.Console)(),
    new (require('winston-daily-rotate-file'))({
      maxDays: 365,
      prepend: true,
      createTree: true,
      filename: './log',
      datePattern: '/yyyy/MM/dd.log',
      level: config.get('NODE_ENV') === 'development' ? 'debug' : 'info'
    })
  ]
});

//
// Expose our configured logger instance.
//
module.exports = logger;
