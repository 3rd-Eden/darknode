const { it, describe } = require('mocha');
const DarkNode = require('../darknode');
const EventEmitter = require('events');
const assume = require('assume');
const path = require('path');

describe('DarkNode', function () {
  it('is an instance of EventEmitter', function () {
    const dn = new DarkNode({
      video: path.join(__dirname, 'fixtures', 'example.mp4')
    });

    assume(dn).is.instanceOf(EventEmitter);
  });
});
