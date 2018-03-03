const { spawn } = require('child_process');
const EventEmitter = require('events');
const yolo = require('@moovel/yolo');
const path = require('path');

/**
 * Our Darknet Nodejs instance.
 *
 * Options:
 *
 * - record: Save the modified result.
 * - video: Path the video that needs processing.
 *
 * @constructor
 * @param {Object} options Configuration.
 * @public
 */
class DarkNode extends EventEmitter {
  constructor(options) {
    super();

    this.name = options.video || options.image;
    this.extract = this.extract.bind(this);
    this.record = !!options.record;
    this.spawn = null;

    if (options.video) this.video(options);
    else this.image(options);
  }

  /**
   * Get the correct weights for discovery.
   *
   * @returns {String} Correct weights.
   * @private
   */
  weights(options) {
    return options.tiny ? './cfg/tiny-yolo-voc.weights' : './cfg/yolo.weights';
  }

  /**
   * Return a renamed absolute path of the oringal file.
   *
   * @returns {String} renamed file.
   * @public
   */
  rename() {
    return path.join(path.dirname(this.name), `${path.basename(this.name)}.yolo`);
  }

  /**
   * Get the correct pixel formatting for ffmpeg.
   *
   * @returns {String} Correct weights.
   * @private
   */
  pixels(options) {
    return options.bgr24 ? 'bgr24' : 'rgb24';
  }

  /**
   * Start the yolo detection of images.
   *
   * @param {Object} options Yolo configuration.
   * @private
   */
  image(options) {
    yolo.detectImage({
      weights: this.weights(options),
      data: './cfg/coco.data',
      cfg: './cfg/yolo.cfg',

      image: this.name
    }, this.extact([
      '-loglevel', 'warning',
      '-f', 'rawvideo',
      '-pix_fmt', this.pixels(options),
      '-y',
      '-i', '-'
    ]));
  }

  /**
   * Start the yolo detection of video's
   *
   * @param {Object} options Yolo configuration.
   * @private
   */
  video(options) {
    yolo.detect({
      weights: this.weights(options),
      data: './cfg/coco.data',
      cfg: './cfg/yolo.cfg',

      cameraIndex: 0,       // optional, default: 0,
      thresh: 0.24,         // optional, default: 0.24
      hierThresh: 0.5,      // optional, default: 0.5
      video: this.name
    }, this.extract([
      '-y',
      '-loglevel', 'warning',
      '-re',
      '-f', 'rawvideo',
      '-pix_fmt', this.pixels(options),
      '-i', '-',
      '-r', '10'
    ]));
  }

  /**
   * Setup our data extraction.
   *
   * @param {Array} param Params for ffmpeg incase we need to record.
   * @returns {Function} Processing function.
   * @private
   */
  extract(params) {
    /**
    * Process the responses from the yolo detection.
    *
    * @param {Buffer} modified Modified frame with detections added.
    * @param {Buffer} original Original frame used for detection.
    * @param {Object} detections Found objects.
    * @param {Object} dimensions Size of the video.
    */
    return (modified, original, detections, dimensions) => {
      this.emit('data', detections);

      if (!this.record) return;

      //
      // User also wanted us to record the modifications as video. So we need
      // proxy the results to an ffmpeg instance.
      //
      if (!this.ffmpeg) this.ffmpeg = spawn('ffmpeg', params.concat([
        '-s', `${dimensions.width}x${dimensions.height}`,
        this.rename()
      ]), { silent: true });

      //
      // Write the modified frame to the ffmpeg instance so we can generate
      // the resulting video.
      //
      this.ffmpeg.stdin.write(modified);
    }
  }
}

//
// If we are spawned as child process with IPC, we want to start processing
// instead of just exporting the Darknode API interface.
//
if (process.send) {
  process.on('message', function onmessage(payload) {
    const node = new DarkNode(payload);

    node.on('data', process.send.bind(process));
  });
}

//
// Expose the module interface, so we can test this in our test suite.
//
module.exports = DarkNode;
