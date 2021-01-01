'use strict'

// timestamps (and databsae versions) will be storeed as special streams of protobufs
// we'll need metadata to note the contents of these

//  [X] store json metadata alongside streams and timestamps
//  [ ] allow for timestamps being posted as well as streams
//  [ ] connect timestamp code to actual timestamping
//  [ ] update code to use new message structures
//  [ ] port old work to node 7 style
//  [ ] add fsck, checks local history and timestamps

// OpenRealRecord enumerates all feeds and assumes these are all Streams
// I guess we can consider a timestamp stream a stream
// but most of the streams are content streams
// we'll want to separate out the concept of content.

// right now checkpoints are being written to /streams/<id>/checkpoint

// [X] I can keep that, and just add /streams/<id>/stream.json
// [X] maybe I'll rename checkpoint to checkpoint.protobuf
// [ ] we'll also add session.json to note the current session information, I guess
//     detailed session information would be better handled by a logging service with its own feed, I think

// things to store:
//     - raw binary streams
//         -> stream.json will want to note data format, origin
//            how will we handle session information?  maybe a separate session.json
//     - timestamps that are hashes of block tips from a service
//         -> stream.json will want to reference the service, note the type, and note the service user id
//     - timestamps that are references to quick proof posts.  perhaps the checkpoint's rootsHash
//         -> stream.json will still just want to reference the service, note the type, and note the service user id
//     - timestamps that contain complete access information (hash, feeds, clock, and peer ips, maybe a url)
//         -> same
//         -> let the user enumerate these from the command line to find public databases!
//     - nested database versions
//         -> stream.json will want to note the type, and optionally metadata regarding the database or database user, notably the database public key and some peers
//            we might also be able to pull the feeds lists out of the contentfeed and store it in stream.json
//            might be easier to copy the inflated concept
// general stuff:
//     - name of the stream
//     - who 'owns' the stream (some other stream?)
//     - if the data in the stream is a processing or result of some other stream
//     - if the stream is a user or like a device or subprocess

// hmmmm I planned to separate all this stuff out into separate timestamp streams
// however, the tip information should really be stored in other checkpoints, not in its own
// a new checkpoint should be posted with the latest tip.
// maybe the tip could stream every single tip it bumps into ?
// i guess we'll need to handle sparse data like that eventually

const TIMESTAMP_REGISTRY = {
  'bcoin-tip': require('./timestamp-bcoin').Tip// ,
//  'bcoin-stamp': require('./timestamp-bcoin').Stamp,
//  'bcoin-pub': require('./timestamp-bcoin').Pub
}

class Timestamp {
  static generate (metadata, opts) {
    metadata.timestamp = opts['timestamp']
    if (metadata.timestamp in TIMESTAMP_REGISTRY) TIMESTAMP_REGISTRY[metadata.timestamp].generate(metadata, opts)
  }

  static validate (metadata, cb) {
    if (!(metadata.timestamp in TIMESTAMP_REGISTRY)) {
      return cb(new Error('timestamp must be one of ' + Object.keys(TIMESTAMP_REGISTRY).join(' ')))
    }
    TIMESTAMP_REGISTRY[this.stream.metadata.timestamp].validate(metadata, cb)
  }

  constructor (stream) {
    this.stream = stream
    if (this.stream.metadata.timestamp) {
      this.timestamp = new TIMESTAMP_REGISTRY[this.stream.metadata.timestamp](this.stream)
    }
  }

  async start (session, stoppedCB) {
    await this.timestamp.start(session, stoppedCB)
  }

  async stop (session) { }

  async requestStop () {
    await this.timestamp.requestStop()
  }
}

module.exports = Timestamp
