const { describe, it } = require('mocha');
const config = require('../config');
const request = require('request');
const assume = require('assume');
const Server = require('../');
const path = require('path');

config.file({ file: path.join(__dirname, 'config.json') });

describe('Server', function () {
  let server;

  before(function (next) {
    server = new Server();
    server.start(next);
  });

  after(function (next) {
    server.stop(next);
  });

  it('rejects the request when missing auth', function (next) {
    request.get({
      uri: `http://localhost:8080/healthcheck`
    }, function (err, res, body) {
      if (err) return next(err);

      assume(res.statusCode).equals(401);
      assume(res.body).equals('Access denied');

      next();
    });
  });

  it('accepts the connection with basic auth', function (next) {
    request({
      uri: `http://localhost:8080/healthcheck`,
      auth: {
        user: config.get('name'),
        pass: config.get('pass')
      }
    }, function (err, res, body) {
      if (err) return next(err);

      assume(res.statusCode).equals(200);
      assume(res.body).equals('Still alive');

      next();
    });
  });

  it('rejects if there isnt a payload query', function (next) {
    request({
      uri: `http://localhost:8080/`,
      auth: {
        user: config.get('name'),
        pass: config.get('pass')
      }
    }, function (err, res, body) {
      if (err) return next(err);

      assume(res.statusCode).equals(400);
      assume(res.body).equals('Missing required parameters');

      next();
    });
  });
});
