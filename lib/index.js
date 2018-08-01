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
var HyperDB = require("hyperdb");
var thunky = require("thunky");
var events_1 = require("events");
var util = require("./util");
var stream_1 = require("./stream");
var HyperStream = /** @class */ (function (_super) {
    __extends(HyperStream, _super);
    function HyperStream(storage, key, opts) {
        var _this = _super.call(this) || this;
        if (!(_this instanceof HyperStream)) {
            return new HyperStream(storage, key, opts);
        }
        if (typeof key === 'object' && !!key && !Buffer.isBuffer(key)) {
            opts = key;
            key = null;
        }
        if (!opts) {
            opts = {};
        }
        if (!opts.contentFeed) {
            opts.contentFeed = true;
        }
        _this.db = new HyperDB(storage, key, opts);
        _this.ready = thunky(_this._ready.bind(_this));
        _this._streamCache = {};
        _this.ready();
        return _this;
    }
    HyperStream.prototype.getStreams = function () {
        var ret = [];
        for (var i = 0; i < this.db.feeds.length; ++i) {
            ret[i] = util.feedToStreamID(this.db.feeds[i]);
        }
        return ret;
    };
    HyperStream.prototype.getStream = function (id, cb) {
        var stream = this._streamCache[id];
        if (!stream) {
            this._streamCache[id] = new stream_1.Stream(this.db, id, cb);
            stream = this._streamCache[id];
        }
        else if (cb) {
            process.nextTick(cb, null, stream);
        }
        return stream;
    };
    HyperStream.prototype.write = function (data, cb) {
        if (!this.localStream) {
            return cb(new Error('not ready'));
        }
        this.localStream.write(data, cb);
    };
    HyperStream.prototype.createWriteStream = function () {
        if (!this.localStream) {
            throw new Error('not ready');
        }
        return this.localStream.createWriteStream();
    };
    HyperStream.prototype._ready = function (cb) {
        var _this = this;
        this.db.ready(function (err) {
            if (err) {
                return cb(err);
            }
            _this.id = util.feedToStreamID(_this.db.local);
            _this.localStream = _this.getStream(_this.id, cb);
        });
    };
    return HyperStream;
}(events_1.EventEmitter));
exports["default"] = HyperStream;
