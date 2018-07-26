"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var bulk = require("bulk-write-stream");
var events_1 = require("events");
var hyperdbput = require("hyperdb/lib/put");
var hyperdbmessages = require("hyperdb/lib/messages");
var util = require("./util");
var messages = require("./messages");
var Stream = /** @class */ (function (_super) {
    __extends(Stream, _super);
    function Stream(db, id, cb) {
        var _this = _super.call(this) || this;
        _this.db = db;
        _this.id = id;
        _this.path = 'streams/' + _this.id;
        _this.feed = null;
        _this.metadata = null;
        _this._dbfeed = null;
        if (!_this.db.opened) {
            throw new Error('not ready');
        }
        var feedKey = util.streamIDToFeedKey(id);
        _this.getMetadata(function (err, metadata) {
            if (err) {
                return cb(err);
            }
            _this.metadata = metadata;
            // done here because the feeds may be inadvertently loaded in the request for metadata
            util.keyToFeeds(_this.db, feedKey, function (error, dbfeed, contentfeed) {
                if (error) {
                    return cb(error);
                }
                _this._dbfeed = dbfeed;
                _this.feed = contentfeed;
                cb(null, _this);
            });
        });
        return _this;
    }
    Stream.prototype.getMetadata = function (cb) {
        var _this = this;
        // TODO: since hyperdb doesn't have access restrictions yet, ignore updates to this file by others
        // (can catch in fsck too)
        this.db.get(this.path + '/stream.json', function (err, nodes) {
            if (err) {
                return cb(err);
            }
            if (nodes.length > 1) {
                return cb(new Error('metadata conflict'));
            }
            if (!nodes[0]) {
                // TODO: set owner to the feed that authorized this feed, or at least provide a way to easily do this
                cb(null, {
                    name: _this.id,
                    owner: _this.id,
                    media: 'application/octet-stream',
                    source: 'unknown'
                });
            }
            else {
                cb(null, JSON.parse(nodes[0].value.toString()));
            }
        });
    };
    Stream.prototype.validateMetadata = function (metadata, cb) {
        if (!metadata.name || metadata.name === this.id) {
            return cb(new Error('stream has no name'));
        }
        if (this.metadata.media === 'application/x.hyper-protobuf' &&
            metadata.media !== this.metadata.media &&
            this.feed &&
            this.feed.length > 0) {
            return cb(new Error('cannot change special media type'));
        }
        util.keyToFeeds(this.db, util.streamIDToFeedKey(metadata.owner), function (err) {
            if (err) {
                return cb(new Error("can't find owner feed: " + err.message));
            }
            cb(null);
        });
    };
    Stream.prototype.setMetadata = function (metadata, cb) {
        var _this = this;
        this.validateMetadata(metadata, function (err) {
            if (err) {
                return cb(err);
            }
            _this.db.put(_this.path + '/stream.json', JSON.stringify(metadata), function (error2, node) {
                if (error2) {
                    return cb(error2);
                }
                _this.metadata = JSON.parse(node.value.toString());
                cb(null, _this.metadata);
            });
        });
    };
    Stream.prototype.listen = function () {
        var _this = this;
        if (this._checkpointwatcher) {
            throw new Error('already listening');
        }
        var seqs = [];
        var onwatchcheckpoint = function () {
            _this.db.get(_this.path + '/checkpoint.protobuf', oncheckpoint);
        };
        this.db.get(this.path + '/checkpoint.protobuf', initialize);
        this._checkpointwatcher = this.db.watch(this.path + '/checkpoint.protobuf', onwatchcheckpoint);
        function initialize(err, checkpoints) {
            seqs = [];
            if (err) {
                return emit(err, checkpoints);
            }
            for (var i = 0; i < checkpoints.length; ++i) {
                var cp = checkpoints[i];
                seqs[cp.feed] = cp.seq;
            }
        }
        var oncheckpoint = function (err, checkpoints) {
            if (err) {
                return emit(err, checkpoints);
            }
            if (checkpoints === []) {
                emit(null, null);
            }
            for (var i = 0; i < checkpoints.length; ++i) {
                var cp = checkpoints[i];
                var feed = cp.feed;
                var last = seqs[feed];
                var cur = cp.seq;
                if (!last || last !== cur) {
                    seqs[feed] = cur;
                    _this._decodeCheckpoint(cp, emit);
                }
            }
        };
        var emit = function (err, checkpoint) {
            if (err) {
                return _this.emit('error', err);
            }
            _this.emit('checkpoint', checkpoint);
        };
    };
    Stream.prototype.listening = function () {
        return !!this._checkpointwatcher;
    };
    Stream.prototype.ignore = function () {
        if (!this._checkpointwatcher) {
            throw new Error('not listening');
        }
        this._checkpointwatcher.destroy();
        this._checkpointwatcher = null;
    };
    Stream.prototype.checkpoints = function (opts) {
        var _this = this;
        var it = this.db.history(opts);
        var next = function (cb) {
            _next.call(it, function (err, val) {
                if (err)
                    return cb(err);
                if (!val)
                    return cb(null, null);
                if (val.key !== _this.path + '/checkpoint.protobuf')
                    return next.call(it, cb);
                _this._decodeCheckpoint(val, cb);
            });
        };
        var _next = it._next;
        it._next = next;
        return it;
    };
    Stream.prototype.verify = function (checkpoint, cb) {
        var _this = this;
        if (checkpoint.author !== this.id) {
            return cb(new Error('incorrect author'));
        }
        if (!this.feed ||
            !checkpoint._feeds ||
            Buffer.compare(checkpoint._feeds[0], this.feed.key)) {
            return cb(new Error('incorrect feed'));
        }
        var feeds = [this.feed];
        var feedsGotten = 0;
        // seek to spot to make sure root hashes are loaded
        this.feed.seek(checkpoint.byteLength - 1, { hash: true }, seeked);
        var addFeed = function (index) {
            if (!checkpoint._feeds) {
                return;
            }
            util.keyToFeeds(_this.db, checkpoint._feeds[index], function (err, feed) {
                if (err || !checkpoint._feeds) {
                    return cb(err);
                }
                feeds[index] = feed;
                ++feedsGotten;
                if (feedsGotten === checkpoint._feeds.length) {
                    doHash();
                }
            });
        };
        for (var i = 1; i < checkpoint._feeds.length; ++i) {
            addFeed(i);
        }
        function seeked(err) {
            if (err || !checkpoint._feeds) {
                return cb(err);
            }
            ++feedsGotten;
            if (feedsGotten === checkpoint._feeds.length) {
                doHash();
            }
        }
        function doHash() {
            if (checkpoint._lengths === undefined) {
                return;
            }
            util.hashRoots(feeds, checkpoint._lengths, function (err, hash, byteLengths) {
                if (err) {
                    return cb(err);
                }
                if (byteLengths && byteLengths[0] !== checkpoint.byteLength) {
                    return cb(new Error('incorrect byteLength'));
                }
                if (Buffer.compare(checkpoint.rootsHash, hash)) {
                    return cb(new Error('hash failure'));
                }
                cb(null, true);
            });
        }
    };
    Stream.prototype.findValidCheckpoint = function (opts, cb, invalidcb) {
        var _this = this;
        var checkpoints = this.checkpoints(opts);
        var seekValid = function (err, checkpoint) {
            if (err) {
                if (invalidcb) {
                    invalidcb(err);
                }
                return checkpoints.next(seekValid);
            }
            if (checkpoint === null) {
                return cb();
            }
            _this.verify(checkpoint, function (error2) {
                if (error2) {
                    if (invalidcb) {
                        invalidcb(error2, checkpoint);
                    }
                    return checkpoints.next(seekValid);
                }
                else {
                    return cb(null, checkpoint);
                }
            });
        };
        checkpoints.next(seekValid);
    };
    Stream.prototype.createWriteStream = function () {
        var _this = this;
        var write = function (batch, cb) {
            if (!_this.feed) {
                return;
            }
            _this.feed.append(batch, function (err) {
                // nextTick is used because if an error is thrown here, the hypercore batcher will crash
                if (err) {
                    return process.nextTick(cb, err);
                }
                _this._writeCheckpoint(cb);
            });
        };
        return bulk.obj(write);
    };
    Stream.prototype.write = function (data, cb) {
        var _this = this;
        if (!this.feed) {
            return;
        }
        this.feed.append(data, function (err) {
            // nextTick is used because if an error is thrown here, the hypercore batcher will crash
            if (err) {
                return process.nextTick(cb, err);
            }
            _this._writeCheckpoint(cb);
        });
    };
    Stream.prototype.read = function (start, length, opts, cb) {
        // TODO: find a checkpoint that covers this data and verify it
        var _this = this;
        if (!this.feed) {
            return;
        }
        if (!start) {
            start = 0;
        }
        if (!length) {
            length = this.feed.byteLength - start;
        }
        if (!opts) {
            opts = {};
        }
        opts.valueEncoding = 'binary';
        var startIndex = null;
        var startOffset = null;
        var tailIndex = null;
        var blocks = [];
        var totalBlocks = null;
        var completedBlocks = 0;
        var seekStart = function (err, index, offset) {
            if (err) {
                return cb(err);
            }
            startIndex = index;
            startOffset = offset;
            if (tailIndex != null) {
                seekDone();
            }
        };
        var seekTail = function (err, index, offset) {
            if (err) {
                return cb(err);
            }
            tailIndex = index;
            if (startIndex != null) {
                seekDone();
            }
        };
        var seekDone = function () {
            var getOne = function (index) {
                if (!_this.feed) {
                    return;
                }
                _this.feed.get(index, opts, function (err, data) {
                    if (err || startIndex === null) {
                        return cb(err);
                    }
                    blocks[index - startIndex] = data;
                    ++completedBlocks;
                    if (totalBlocks === completedBlocks) {
                        finish();
                    }
                });
            };
            if (startIndex === null || tailIndex === null) {
                return;
            }
            totalBlocks = 1 + tailIndex - startIndex;
            for (var i = startIndex; i <= tailIndex; ++i) {
                getOne(i);
            }
        };
        this.feed.seek(start, {}, seekStart);
        this.feed.seek(start + length - 1, {}, seekTail);
        function finish() {
            blocks[0] = blocks[0].slice(startOffset);
            cb(null, Buffer.concat(blocks, length));
        }
    };
    Stream.prototype._writeCheckpoint = function (cb) {
        var _this = this;
        // wrapping code taken from HyperDB.prototype.put to ensure our sequence numbers are the same as in the put
        // this is needed because put only lets us know what vector clock it used after it has already submitted the data
        // TODO: submit an issue/pr to hyperdb mentioning this use case and brainstorm a solution to propose
        this.db._lock(function (release) {
            var unlock = function (err) {
                release(cb, err);
            };
            _this.db.heads(function (err, heads) {
                if (err) {
                    return unlock(err);
                }
                if (!_this.feed) {
                    return;
                }
                var clock = _this.db._clock();
                // taken from Writer.prototype.append which is called after the put node is constructed and adjusts local clock
                var writer = _this.db._byKey.get(_this._dbfeed.key.toString('hex'));
                if (!writer) {
                    return;
                }
                var hdbid = writer._id;
                if (!clock[hdbid]) {
                    clock[hdbid] = _this._dbfeed.length;
                }
                var checkpoint = {
                    rootsHash: new Uint8Array(0),
                    timestamp: Date.now(),
                    length: _this.feed.length,
                    byteLength: _this.feed.byteLength
                };
                util.hashRoots([_this.feed].concat(_this.db.feeds), [checkpoint.length].concat(clock), function (error2, contentHash) {
                    if (error2) {
                        return process.nextTick(cb, error2);
                    }
                    checkpoint.rootsHash = contentHash;
                    hyperdbput(_this.db, clock, heads, _this.path + '/checkpoint.protobuf', messages.Checkpoint.encode(checkpoint), unlock);
                });
            });
        });
    };
    Stream.prototype._decodeCheckpoint = function (node, cb) {
        var checkpoint;
        try {
            checkpoint = messages.Checkpoint.decode(node.value);
        }
        catch (e) {
            return cb(e);
        }
        checkpoint.author = util.feedToStreamID(this.db.feeds[node.feed]);
        // TODO: submit an issue / PR to hyperdb to include original raw clocks in node results which are needed for
        //       for comparing root hashes correctly
        // this hack converts the returned clock to the original clock
        var writer = this.db._byKey.get(this._dbfeed.key.toString('hex'));
        if (!writer) {
            return;
        }
        node.clock = writer._mapList(node.clock, writer._encodeMap, null);
        checkpoint._lengths = [checkpoint.length].concat(node.clock);
        --checkpoint._lengths[node.feed + 1];
        // TODO: submit an issue / PR to hyperdb to allow for retrieving feeds at an arbitrary point in history
        //       which is needed to interpret historic vector clocks.
        //       For now we use InflatedEntry to decode them by hand.
        this.db.feeds[node.feed].get(node.inflate, function (err, inflatebuf) {
            if (err) {
                return cb(err);
            }
            var inflate = hyperdbmessages.InflatedEntry.decode(inflatebuf);
            checkpoint._feeds = [inflate.contentFeed];
            for (var i = 0; i < inflate.feeds.length; ++i) {
                checkpoint._feeds[i + 1] = inflate.feeds[i].key;
            }
            cb(null, checkpoint);
        });
    };
    return Stream;
}(events_1.EventEmitter));
exports.Stream = Stream;
