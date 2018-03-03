const debug = require('diagnostics')('darknode:folder');
const EventEmitter = require('events');
const TickTock = require('tick-tock');
const ms = require('millisecond');
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const async = require('async');
const v4 = require('uuid/v4');
const path = require('path');
const fs = require('fs');

/**
 * Auto expiring file system so we can clean up after our selfs. We don't
 * want to leave data lingering around.
 *
 * Options:
 *
 * - root: Root folder where all temp files are stored.
 * - duration: How long can a single folder be alive.
 *
 * @param {Object} options Configuration.
 * @public
 */
class Expired extends EventEmitter {
  constructor(options) {
    super();

    this.root = options.root || require('os').tmpdir();
    this.duration = ms(options.duration || '10 min');
    this.timers = new TickTock(this);

    this.on('error', function intercept(err) {
      debug('received an error', err);
    });

    this.initialize();
  }

  /**
   * Clean up previous folders if they exist, or setup timers for those who
   * are about to expire.
   *
   * @private;
   */
  initialize() {
    mkdirp(this.root, (e) => {
      if (e) return this.emit('error', e);

      this.existing((err, dirs) => {
        if (err) return this.emit('error', err);

        async.each(dirs, (name, next) => {
          const dir = path.join(this.root, name);

          this.age(dir, (errs, date) => {
            if (err) return next(errs);

            const epoch = +date;
            const now = Date.now();
            const ago = now - epoch;
            const remaining = this.duration - ago;
            const expiree = epoch + this.duration;

            //
            // If the directory is already expired, we should just nuke the shit
            // out of it. Kill, kill, kill!
            //
            if (expiree < now) {
              debug(`initialize found out of date folder ${dir}, removing`);
              return this.remove(dir, next);
            }

            //
            // Not yet expired, set our timers so we will delete it once it's
            // expired.
            //
            debug(`folder ${dir} still has ${remaining} ms, scheduling delete`);
            this.timers.setTimeout(dir, () => {
              debug(`previous discoverd folder ${dir} expired, deleting`);
              this.remove(dir);
            }, remaining);

            next();
          });
        }, (errs) => {
          if (errs) return this.emit('error', errs);
          this.emit('initialized');
        });

        dirs.forEach((name) => {
        });
      });
    });
  }

  /**
   * A directory has expired, remove it and it's contents.
   *
   * @param {String} dir The directory and all it's files we need to remove.
   * @param {Function} fn  Optional completion callback.
   * @public
   */
  remove(dir, fn = () => {}) {
    if (dir.indexOf(this.root) !== 0) {
      debug('asked to delete a dir that is not in our root');
      return fn(new Error('Unknown directory'));
    }

    rimraf(dir, fn);
  }

  /**
   * Check if there are any existing folders.
   *
   * @param {Function} fn Completion callback
   * @private
   */
  existing(fn) {
    fs.readdir(this.root, (err, paths) => {
      if (err) return fn(err);

      async.filter(paths, (name, next) => {
        fs.lstat(path.join(this.root, name), function lstat(errs, stat) {
          if (errs) {
            if (errs.code === 'ENOENT') {
              debug('found folder was deleted, got ENOENT, filtering out');
              return next(null, false);
            }

            debug('received error while retreiving folder stats', errs);
            return next(errs);
          }

          next(null, stat.isDirectory());
        });
      }, fn);
    });
  }

  /**
   * Get the age of a given directory.
   *
   * @param {String} dir Directory.
   * @param {Function} fn Completion callback.
   * @public
   */
  age(dir, fn) {
    fs.stat(dir, function stat(err, stats) {
      if (err) return fn(err);

      fn(null, stats.birthtime);
    });
  }

  /**
   * Generates a new unique directory name.
   *
   * @returns {String} The name of the new directory.
   * @public
   */
  name() {
    return v4().toLowerCase();
  }

  /**
   * Create a new temporary folder.
   *
   * @param {Function} fn Completion callback.
   * @public
   */
  create(fn) {
    const name = this.name();
    const directory = path.join(this.root, name);

    debug('creating new tmp folder', directory);

    mkdirp(directory, (err) => {
      if (err) {
        if (err.code === 'EEXIST') return this.create(fn);
        return fn(err);
      }

      //
      // Schedule the deletion now that we have directory we can work with.
      //
      this.timers.setTimeout(directory, () => {
        debug(`${directory} expired, deleting`);
        this.remove(directory);
      }, this.duration);

      fn(null, directory);
    });
  }

  /**
   * Clear all timers.
   *
   * @private
   */
  end() {
    debug('shutting down instance.');
    this.timers.end();
  }
}

//
// Export the module
//
module.exports = Expired;
