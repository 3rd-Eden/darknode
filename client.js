const EventSource = require('eventsource');
const request = require('request');
const URL = require('url-parse');

/**
 * Client interface for DarkNode.
 *
 * @constructor
 * @param {Object} options Configuration for the API call.
 * @public
 */
class Client {
  constructor(options) {
    this.api = new URL(options.api);
    this.api.set('username', options.username || this.api.username);
    this.api.set('password', options.password || this.api.password);
  }

  /**
   * Returns the full URL to the hosted API.
   *
   * @returns {String} The server URL.
   * @public
   */
  server(options) {
    const clone = URL.parse(this.api.href, true);
    const query = {};

    query.payload = options.payload;

    if (options.record) query.record = true;
    if (options.bgr24) query.bgr24 = true;

    clone.set('query', query);

    return clone;
  }

  /**
   * Instead of waiting for the movies, images to be completed we receive
   * real-time updates about the progress and the captures.
   *
   * @param {Object} options Request options.
   * @returns {EventSource}
   * @public
   */
  stream(options) {
    const server = this.server(options);
    server.set('pathname', '/stream');

    return new EventSource(server.href);
  }

  /**
   * Process the payload.
   *
   * @param {Object} options Request options.
   * @param {Function} fn Completion callback.
   * @public
   */
  fetch(options, fn) {
    const server = this.server(options);

    return request({
      method: 'GET',
      uri: server,
    }, (err, res, body) => {
      if (err) return fn(err);
      if (res.statusCode !== 200) return fn(new Error(`Invalid statusCode(${res.statusCode}) received`));

      fn(null, JSON.parse(body));
    });
  }
}

//
// Expose the module.
//
module.exports = Client;
