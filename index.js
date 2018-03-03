const connected = require('connected');
const cluster = require('./cluster');
const basic = require('basic-auth');
const config = require('./config');
const logger = require('./logger');
const parse = require('url-parse');
const https = require('https');
const http = require('http');

/**
 * Simple class to create, start and stop the HTTP server.
 *
 * @constructor
 * @public
 */
class Server {
  constructor() {
    this.handle = this.handle.bind(this);
    this.server = http.createServer(this.handle);
  }

  /**
   * Handle incoming HTTP requests
   *
   * @param {Request} req Incoming HTTP request.
   * @param {Response} res Outgoing HTTP response.
   * @private
   */
  handle(req, res) {
    //
    // All requests need to be authorized using basic auth with fixed
    // credentials.
    //
    const { name, pass } = (basic(req) || {});

    if (!name || !pass || name !== config.get('name') || pass !== config.get('pass')) {
      res.statusCode = 401;
      res.setHeader('WWW-Authenticate', 'Basic realm="DarkNode"');
      res.setHeader('Content-Type', 'text/plain');

      return res.end('Access denied');
    }

    //
    // Validate if we have all required params.
    //
    const url = parse(`http://dark.node${req.url}`, true);

    if (url.pathname === '/healthcheck') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      return res.end('Still alive');
    }

    if (!url.query.payload) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'text/plain');

      return res.end('Missing required parameters');
    }

    cluster({ data: url.query, req, res, stream: url.pathname === '/events' });
  }

  /**
   * Start the server.
   *
   * @param {Function} fn Completion callback
   * @public
   */
  start(fn) {
    connected(this.server, config.get('port') || 8080, (err) => {
      if (!err) {
        logger.debug('server is now running', this.server.address());
        return fn && fn(err);
      }

      return fn && fn();
    });
  }

  /**
   * Stop the created server.
   *
   * @param {Function} fn Completion callback.
   * @public
   */
  stop(fn) {
    this.server.close((err) => {
      return fn && fn(err);
    });
  }
}

//
// Expose the server
//
module.exports = Server;
