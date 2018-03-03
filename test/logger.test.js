const { describe, it } = require('mocha');
const logger = require('../logger');
const assume = require('assume');

describe('logger', function () {
  it('is a object', function () {
    assume(logger).is.a('object');
    assume(logger).is.instanceOf(require('winston').Logger);
  });
});
