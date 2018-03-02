const { it, describe } = require('mocha');
const Expired = require('../expired-tmp');
const EventEmitter = require('events');
const assume = require('assume');
const path = require('path');

describe('Expired Temp Folders', function () {
  let tmp;

  beforeEach(function (next) {
    tmp = new Expired({
      root: path.join(__dirname, 'fixture'),

      //
      // We set the test to 1 sec, so we know the library nukes the folder.
      //
      duration: '1 sec'
    });

    tmp.once('initialized', next);
  });

  afterEach(function () {
    tmp.end();
  });

  it('is instanceOf EventEmitter', function () {
    assume(tmp).is.instanceOf(EventEmitter);
  });

  describe('#name', function () {
    it('returns a unique lowercase string', function () {
      assume(tmp.name()).does.not.equal(tmp.name());

      const lower = tmp.name();

      assume(lower).equals(lower.toLowerCase());
    });
  });

  describe('#existing', function () {
    it('reads out the directory', function (next) {
      tmp.existing(function (err, paths) {
        assume(err).is.not.a('error');
        assume(paths).is.a('array');

        next();
      });
    });
  });

  describe('#age', function () {
    it('returns the age of given directory', function (next) {
      tmp.age(__dirname, function (err, created) {
        if (err) return next(err);

        assume(created).is.a('date');
        next();
      });
    });
  });

  describe('#create', function () {
    it('creates a new folder', function (next) {
      tmp.create(function (err, dir) {
        assume(err).is.not.a('error');
        assume(dir).is.a('string');
        assume(dir.indexOf(tmp.root)).equals(0);

        tmp.existing(function (err, paths) {
          if (err) return next(err);

          assume(dir).contains(paths[0]);
          next();
        });
      });
    });

    it('automatically deletes the directoy after the set duration', function (next) {
      tmp.create(function (err, dir) {
        if (err) return next(err);

        tmp.existing(function (err, paths) {
          if (err) return next(err);

          assume(paths).is.not.length(0);

          setTimeout(function wait() {
            tmp.existing(function (err, paths) {
              if (err) return next(err);

              assume(paths).has.length(0);
              next();
            });
          }, 1000);
        });
      });
    });
  });
});
