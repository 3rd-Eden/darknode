const request = require('request');
const async = require('async');
const path = require('path');
const fs = require('fs');

/**
 * The location where all files need to be downloaded.
 *
 * @type {String}
 * @private
 */
const destination = path.join(__dirname, 'cfg');

/**
 * Download all the required files.
 *
 * @param {Function} fn Completion callback.
 * @private
 */
function download(fn) {
  async.each([
    'https://github.com/pjreddie/darknet/raw/master/cfg/tiny-yolo-voc.cfg',
    'https://pjreddie.com/media/files/tiny-yolo-voc.weights',
    'https://pjreddie.com/media/files/yolo.weights'
  ], function downloadWeights(url, next) {
    const name = path.basename(url);
    const file = path.join(destination, name);
    console.log('Downloading weights: ', url);

    //
    // Files are quite large, so we're going to skip if it already exists.
    //
    if (fs.existsSync(file)) {
      console.log('File already exists on disk, skipping, ', name);
      return next();
    }

    request(url)
    .once('error', function (err) { next(err); })
    .once('end', function () { next(); })
    .pipe(fs.createWriteStream(file));
  }, fn);
}

//
// Download the files when we're invoked directly using `node install.js`
//
if (require.main === module) {
  download((err) => {
    if (err) throw err;
  });
}

//
// Export the module so we can use it for testing.
//
module.exports = download;
