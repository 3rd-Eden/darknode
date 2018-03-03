const EventSource = require('serversentevent');
const Gjallarhorn = require('gjallarhorn');
const { fork } = require('child_process');
const Expired = require('./expired-tmp');
const request = require('request');
const logger = require('./logger');
const config = require('./config');

/**
 * List of extensions that classify as a video upload.
 *
 * @type {Array}
 * @private
 */
const video = ['.mp4'];

//
// Setup our gjallarhorn instance, we want to spawn multiple node processes
// as we want to get a useful feed of events.
//
const ghorn = new Gjallarhorn({
  concurrency: config.get('concurrency'),
  timeout: config.get('timeout'),
  retries: config.get('retries')
});

//
// Specify the actual factory that creates the darkweb instances.
//
ghorn.reload(function factory(payload) {
  const darknet = fork(path.resolve('darknode.js'), {}, {
    silent: true
  });

  darknet.send(payload);
  return darknet;
});

//
// Setup our expirable directory structure. This will be used to store the
// assets we're downloading, creating, recording.
//
const tmp = new Expired({
  duration: config.get('expiree'),
  root: config.get('root')
});

/**
 * Download a new request into a folder.
 *
 * @param {String} uri The URI to download.
 * @param {Function} fn Completion callback.
 * @private
 */
function download(uri, fn) {
  tmp.create(function created(err, dir) {
    if (err) return fn(err);

    const name = path.basename(uri);
    const dest = path.join(dir, name);

    request(uri)
    .once('end', function () {
      fn(null, dest);
    })
    .pipe(fs.createWriteStream());
  });
}

/**
 * Start processing payload with darknode.
 *
 * Options:
 * - req, reference to incoming HTTP request.
 * - res, reference to outgoing HTTP response.
 * - stream, should we stream responses.
 * - payload, location of the asset to process.
 *
 * @param {Object} options Darknode configuration.
 * @public
 */
module.exports = function darknode(options) {
  const { req, res, data } = options;
  const messages = [];
  let stream;

  //
  // We want to support 2 API's, a streaming API where we need to get the data
  // asap, in case of a real-time conversion that has higher priority vs
  // updating older data. For a streaming API we want to support the EventSource
  // API. So we can transmit progress events while we're detecting.
  //
  if (options.stream) stream = new EventSource(req, res);

  /**
   * Generic handler of failures, so we can correctly handle responses.
   *
   * @param {Error} err Error that happened while processing, download.
   * @private
   */
  function failure(err) {
    if (err) {
      if (stream) {
        stream.write(JSON.stringify({
          name: 'error',
          data: err.message
        }));
        
        return res.end();
      }

      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      return res.end('Received an error while processing');
    }
  }

  //
  // Start downloading the file before we start the cluster as we don't want to
  // leave our spawns waiting, doing nothing.
  //
  download(data.payload, function dowloaded(err, asset) {
    if (err) return failure(err);

    //
    // So we now have a tmp folder, and the downloaded asset.
    // We need to figure out if it's an image or movie.
    //
    const payload = Object.assign({}, data);
    const ext = path.extname(asset);

    if (~video.indexOf(ext)) payload.video = asset;
    else payload.image = asset;

    //
    // Process the rest of the options, we don't want **any** use input
    // as arguments so we're going to process them our selfs.
    //
    if (query.record) payload.record = true;
    if (query.bgr24) payload.bgr24 = true;

    ghorn.launch(payload, {
      message: function message(data) {
        if (!stream) return messages.push(data);

        stream.write(JSON.stringify({
          name: 'detection',
          data
        }));
      }
    }, function done(errs) {
      if (errs) return failure(errs);
      if (stream) return res.end();

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end(JSON.stringify(messages));
    });
  });
}
