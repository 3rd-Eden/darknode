const TickTock = require('tick-tock');
const ms = require('millisecond');
const rimraf = require('rimraf');
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
class Expired {
  constructor(options) {
    this.root = options.root || require('os').tmpDir;
    this.duration = ms(options.duration);
    this.timers = new TickTick(this);

    this.initialize();
  }

  /**
   * Clean up previous folders if they exist, or setup timers for those who
   * are about to expire.
   *
   * @private;
   */
  initialize() {
    this.existing((err, dirs) => {
      dirs.forEach((name) => {
        const dir = path.join(this.root, name);

        this.age(dir, (err, date) => {
          const epoch = +date;
          const expiree = epoch + this.duration;

          //
          // If the directory is already expired, we should just nuke the shit
          // out of it. Kill, kill, kill!
          //
          if (expiree < Date.now()) return this.remove(dir);

          //
          // Not yet expired, set our timers so we will delete it once it's
          // expired.
          //
          this.timers.setTimeout(dir, () => {
            this.remove(dir);
          }, Date.now() - epoch);
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
    if (dir.indexOf(this.root) !== 0) return fn(new Error('Unknown directory'));

    rimraf(dir, fn);
  }

  /**
   * Check if there are any existing folders.
   *
   * @param {Function} fn Completion callback
   * @private
   */
  existing(fn) {
    fs.readdir(this.root, fn);
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

    fs.mkdir(directory, (err) => {
      if (err) {
        if (err.code === 'EEXIST') return this.create(fn);
        return fn(err);
      }

      //
      // Schedule the deletion now that we have directory we can work with.
      //
      this.timers.setTimeout(directory, () => {
        this.remove(directory);
      }, this.duration);

      fn(null, directory):
    });
  }

  /**
   * Clear all timers.
   *
   * @private
   */
  end() {
    this.timers.end();
  }
}
