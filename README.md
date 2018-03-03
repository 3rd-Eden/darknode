# darknode

A micro HTTP service that runs darknet / yolo on provided images/video's. This
allows you to easily offload this heavy computing to a cloud server that has
support for GPU.

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [API Client](#api-client)
  - [stream](#stream)
  - [fetch](#fetch)

## Installation

The package is published to `npm` and can be installed by running:

```
npm install --save darknode
```

### Configuration

```js
{
  //
  // Port number the HTTP server should listen on.
  //
  "port": 8080,

  //
  // Sets a pre-configured log level as for development we want to be more
  // verbose.
  //
  "NODE_ENV": 'development',

  //
  // Basic Auth configuration. Every server is configured with basic auth by
  // default. User and pass must match this value in order to be processed.
  //
  "name": "secret-username",
  "pass": "secret-password",

  //
  // Timeout, how long do we allow the darknet process to run before we consider
  // it's computation to long and in need of killing. Can be a human readable
  // string or a number.
  //
  "timeout": "20 minutes",

  //
  // How many times should we retry in case of failure.
  //
  "retries": 3,

  //
  // Amount of process we're allowed to run concurrently so we don't accidentally
  // fork bomb our selfs
  //
  "concurrency": 10,

  //
  // Duration of how long we should leave the files we download and process
  // around. Ideally we want our server / image to stay as clean as possible.
  //
  "expiree": "30 minutes"
}
```

### API Client

The library ships a Node.js Client that can be used to interact with the
created server.

```js
const DarkNode = require('darknode/client');

const api = new DarkNode({
  username: 'matching username of what is specified in config',
  password: 'matching password of what is specified in config',
  api: 'http://address-of-server.here/'
})
```

The client expects 3 options:

- `username` The basic auth username that you configured on teh server.
- `password` The password for the basic auth username.
- `api` The actual address of your DarkNode HTTP server.

There are 2 different ways to receive the data from the DarkNode server, but
they both assume the same options as arguments:

- `payload` URL of where the asset is hosted, and requires detection.
- `record` Record the DarkNode detection.
- `bgr24` Use `bgr24` instead of `rgb24` for color encoding.

### stream

Asks the server to respond with an EventSource / ServerSentEvent response
which will receive the detections of your uploaded asset in near real-time.

```js
const stream = client.stream({
  payload: 'https://aws.cloud.server/video.mp4'
});

stream.on('data', (detection) => {
  console.log('detection')
});
```

### fetch

Waits until the all the detections is done to return the response from the
server.

```js
client.fetch({
  payload: 'https://aws.cloud.server/video.mp4'
}, function (err, payload) {
  if (err) throw err;

  console.log(payload); // Array with all detections
});
```
