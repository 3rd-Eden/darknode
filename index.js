const cluster = require('./cluster');
const listen = require('connected');
const basic = require('basic-auth');
const config = require('./config');
const logger = require('./logger');
const URL = require('url-parse');
const https = require('https');
const http = require('http');

//
// Start handling the incoming HTTP requests.
//
const server = http.createServer(function handle(req, res) {
  //
  // All requests need to be authorized using basic auth with fixed
  // credentials.
  //
  const { name, pass } = (basic(req) || {});

  if (name !== config.get('name') || pass !== config.get('pass')) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Basic realm="DarkNode"');
    res.setHeader('Content-Type', 'text/plain');

    return res.end('Access denied');
  }

  //
  // Validate if we have all required params.
  //
  const url = URL.parse(`http://dark.node${req.url}`, true);

  if (!url.query.payload) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'text/plain');

    return res.end('Missing required parameters');
  }

  cluster({ data: url.query, req, res, stream: url.pathname === '/events' });
});

//
// Start the server.
//
listen(server, config.get('port') || 8080, function listening(err) {
  if (!err) return logger.debug('server is now running', server.address());
});
