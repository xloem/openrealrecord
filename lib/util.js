"use strict";
exports.__esModule = true;
var allocUnsafe = require("buffer-alloc-unsafe");
var sodium = require("sodium-universal");
function keyToFeeds(db, key, cb) {
    // TODO: submit an issue / PR to hyperdb to allow for public access feeds by key
    // // this approach does not use private members of hyperdb but is O(n)
    // for (let i = 0; i < db.feeds; ++ i) {
    //   if (0 == Buffer.compare(key, db.feeds[i].key)) {
    //     return cb(db.feeds[i], db.contentFeeds[i])
    //   }
    // }
    // this approach uses private members of hyperdb but is just a map lookup if already available locally
    var writer = db._byKey.get(key.toString('hex'));
    if (!writer) {
        cb(new Error('no feed found for key ' + exports.keyToID(key)));
    }
    else if (!writer._contentFeed) {
        writer._feed.once('append', function () {
            if (!writer) {
                return;
            }
            writer.head(function (err) {
                if (!writer) {
                    return;
                }
                if (err) {
                    return cb(err);
                }
                cb(null, writer._feed, writer._contentFeed);
            });
        });
    }
    else {
        cb(null, writer._feed, writer._contentFeed);
    }
}
exports.keyToFeeds = keyToFeeds;
function keyToID(key) {
    return key
        .toString('base64')
        .substr(0, 43)
        .split('/')
        .join('_');
}
exports.keyToID = keyToID;
function feedToStreamID(feed) {
    return keyToID(feed.key);
}
exports.feedToStreamID = feedToStreamID;
function streamIDToFeedKey(id) {
    return Buffer.from(id.split('_').join('/'), 'base64');
}
exports.streamIDToFeedKey = streamIDToFeedKey;
function hashRoots(feeds, lengths, cb) {
    var digest = allocUnsafe(32);
    var hasher = sodium.crypto_generichash_instance(digest.length);
    var totals = [];
    var index = 0;
    thisFeed();
    function thisFeed() {
        if (!lengths[index]) {
            return nextFeed(null, []);
        }
        feeds[index].rootHashes(lengths[index] - 1, nextFeed);
    }
    function nextFeed(err, roots) {
        if (err) {
            return cb(err);
        }
        var totalbytes = 0;
        for (var i = 0; i < roots.length; i++) {
            totalbytes += roots[i].size;
            hasher.update(roots[i].hash);
        }
        totals[index] = totalbytes;
        ++index;
        if (index < feeds.length) {
            thisFeed();
        }
        else {
            hasher.final(digest);
            cb(null, digest, totals);
        }
    }
}
exports.hashRoots = hashRoots;
