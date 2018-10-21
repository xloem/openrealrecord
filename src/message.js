/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const Checkpoint = $root.Checkpoint = (() => {

    /**
     * Properties of a Checkpoint.
     * @exports ICheckpoint
     * @interface ICheckpoint
     * @property {Uint8Array} rootsHash Checkpoint rootsHash
     * @property {number|Long} timestamp Checkpoint timestamp
     * @property {number|Long} length Checkpoint length
     * @property {number|Long} byteLength Checkpoint byteLength
     */

    /**
     * Constructs a new Checkpoint.
     * @exports Checkpoint
     * @classdesc Represents a Checkpoint.
     * @implements ICheckpoint
     * @constructor
     * @param {ICheckpoint=} [properties] Properties to set
     */
    function Checkpoint(properties) {
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Checkpoint rootsHash.
     * @member {Uint8Array} rootsHash
     * @memberof Checkpoint
     * @instance
     */
    Checkpoint.prototype.rootsHash = $util.newBuffer([]);

    /**
     * Checkpoint timestamp.
     * @member {number|Long} timestamp
     * @memberof Checkpoint
     * @instance
     */
    Checkpoint.prototype.timestamp = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

    /**
     * Checkpoint length.
     * @member {number|Long} length
     * @memberof Checkpoint
     * @instance
     */
    Checkpoint.prototype.length = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

    /**
     * Checkpoint byteLength.
     * @member {number|Long} byteLength
     * @memberof Checkpoint
     * @instance
     */
    Checkpoint.prototype.byteLength = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

    /**
     * Encodes the specified Checkpoint message. Does not implicitly {@link Checkpoint.verify|verify} messages.
     * @function encode
     * @memberof Checkpoint
     * @static
     * @param {ICheckpoint} message Checkpoint message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Checkpoint.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        writer.uint32(/* id 0, wireType 2 =*/2).bytes(message.rootsHash);
        writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.timestamp);
        writer.uint32(/* id 2, wireType 0 =*/16).uint64(message.length);
        writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.byteLength);
        return writer;
    };

    /**
     * Decodes a Checkpoint message from the specified reader or buffer.
     * @function decode
     * @memberof Checkpoint
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Checkpoint} Checkpoint
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Checkpoint.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Checkpoint();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 0:
                message.rootsHash = reader.bytes();
                break;
            case 1:
                message.timestamp = reader.uint64();
                break;
            case 2:
                message.length = reader.uint64();
                break;
            case 3:
                message.byteLength = reader.uint64();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        if (!message.hasOwnProperty("rootsHash"))
            throw $util.ProtocolError("missing required 'rootsHash'", { instance: message });
        if (!message.hasOwnProperty("timestamp"))
            throw $util.ProtocolError("missing required 'timestamp'", { instance: message });
        if (!message.hasOwnProperty("length"))
            throw $util.ProtocolError("missing required 'length'", { instance: message });
        if (!message.hasOwnProperty("byteLength"))
            throw $util.ProtocolError("missing required 'byteLength'", { instance: message });
        return message;
    };

    return Checkpoint;
})();

export const Timestamp = $root.Timestamp = (() => {

    /**
     * Properties of a Timestamp.
     * @exports ITimestamp
     * @interface ITimestamp
     * @property {Array.<Uint8Array>|null} [id] Timestamp id
     */

    /**
     * Constructs a new Timestamp.
     * @exports Timestamp
     * @classdesc Represents a Timestamp.
     * @implements ITimestamp
     * @constructor
     * @param {ITimestamp=} [properties] Properties to set
     */
    function Timestamp(properties) {
        this.id = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Timestamp id.
     * @member {Array.<Uint8Array>} id
     * @memberof Timestamp
     * @instance
     */
    Timestamp.prototype.id = $util.emptyArray;

    /**
     * Encodes the specified Timestamp message. Does not implicitly {@link Timestamp.verify|verify} messages.
     * @function encode
     * @memberof Timestamp
     * @static
     * @param {ITimestamp} message Timestamp message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Timestamp.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.id != null && message.id.length)
            for (let i = 0; i < message.id.length; ++i)
                writer.uint32(/* id 0, wireType 2 =*/2).bytes(message.id[i]);
        return writer;
    };

    /**
     * Decodes a Timestamp message from the specified reader or buffer.
     * @function decode
     * @memberof Timestamp
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Timestamp} Timestamp
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Timestamp.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Timestamp();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 0:
                if (!(message.id && message.id.length))
                    message.id = [];
                message.id.push(reader.bytes());
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        return message;
    };

    return Timestamp;
})();

export const Database = $root.Database = (() => {

    /**
     * Properties of a Database.
     * @exports IDatabase
     * @interface IDatabase
     * @property {Array.<number|Long>|null} [metaclock] Database metaclock
     * @property {Array.<number|Long>|null} [contentclock] Database contentclock
     * @property {Uint8Array} rootsHash Database rootsHash
     * @property {number|Long} inflate Database inflate
     */

    /**
     * Constructs a new Database.
     * @exports Database
     * @classdesc Represents a Database.
     * @implements IDatabase
     * @constructor
     * @param {IDatabase=} [properties] Properties to set
     */
    function Database(properties) {
        this.metaclock = [];
        this.contentclock = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * Database metaclock.
     * @member {Array.<number|Long>} metaclock
     * @memberof Database
     * @instance
     */
    Database.prototype.metaclock = $util.emptyArray;

    /**
     * Database contentclock.
     * @member {Array.<number|Long>} contentclock
     * @memberof Database
     * @instance
     */
    Database.prototype.contentclock = $util.emptyArray;

    /**
     * Database rootsHash.
     * @member {Uint8Array} rootsHash
     * @memberof Database
     * @instance
     */
    Database.prototype.rootsHash = $util.newBuffer([]);

    /**
     * Database inflate.
     * @member {number|Long} inflate
     * @memberof Database
     * @instance
     */
    Database.prototype.inflate = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

    /**
     * Encodes the specified Database message. Does not implicitly {@link Database.verify|verify} messages.
     * @function encode
     * @memberof Database
     * @static
     * @param {IDatabase} message Database message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    Database.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.metaclock != null && message.metaclock.length)
            for (let i = 0; i < message.metaclock.length; ++i)
                writer.uint32(/* id 0, wireType 0 =*/0).uint64(message.metaclock[i]);
        if (message.contentclock != null && message.contentclock.length)
            for (let i = 0; i < message.contentclock.length; ++i)
                writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.contentclock[i]);
        writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.rootsHash);
        writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.inflate);
        return writer;
    };

    /**
     * Decodes a Database message from the specified reader or buffer.
     * @function decode
     * @memberof Database
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {Database} Database
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    Database.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.Database();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 0:
                if (!(message.metaclock && message.metaclock.length))
                    message.metaclock = [];
                if ((tag & 7) === 2) {
                    let end2 = reader.uint32() + reader.pos;
                    while (reader.pos < end2)
                        message.metaclock.push(reader.uint64());
                } else
                    message.metaclock.push(reader.uint64());
                break;
            case 1:
                if (!(message.contentclock && message.contentclock.length))
                    message.contentclock = [];
                if ((tag & 7) === 2) {
                    let end2 = reader.uint32() + reader.pos;
                    while (reader.pos < end2)
                        message.contentclock.push(reader.uint64());
                } else
                    message.contentclock.push(reader.uint64());
                break;
            case 2:
                message.rootsHash = reader.bytes();
                break;
            case 3:
                message.inflate = reader.uint64();
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        if (!message.hasOwnProperty("rootsHash"))
            throw $util.ProtocolError("missing required 'rootsHash'", { instance: message });
        if (!message.hasOwnProperty("inflate"))
            throw $util.ProtocolError("missing required 'inflate'", { instance: message });
        return message;
    };

    return Database;
})();

export const InflatedDatabase = $root.InflatedDatabase = (() => {

    /**
     * Properties of an InflatedDatabase.
     * @exports IInflatedDatabase
     * @interface IInflatedDatabase
     * @property {Array.<number|Long>|null} [metaclock] InflatedDatabase metaclock
     * @property {Array.<number|Long>|null} [contentclock] InflatedDatabase contentclock
     * @property {Uint8Array} rootsHash InflatedDatabase rootsHash
     * @property {number|Long} inflate InflatedDatabase inflate
     * @property {Array.<Uint8Array>|null} [metafeeds] InflatedDatabase metafeeds
     * @property {Array.<Uint8Array>|null} [contentfeeds] InflatedDatabase contentfeeds
     */

    /**
     * Constructs a new InflatedDatabase.
     * @exports InflatedDatabase
     * @classdesc Represents an InflatedDatabase.
     * @implements IInflatedDatabase
     * @constructor
     * @param {IInflatedDatabase=} [properties] Properties to set
     */
    function InflatedDatabase(properties) {
        this.metaclock = [];
        this.contentclock = [];
        this.metafeeds = [];
        this.contentfeeds = [];
        if (properties)
            for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                if (properties[keys[i]] != null)
                    this[keys[i]] = properties[keys[i]];
    }

    /**
     * InflatedDatabase metaclock.
     * @member {Array.<number|Long>} metaclock
     * @memberof InflatedDatabase
     * @instance
     */
    InflatedDatabase.prototype.metaclock = $util.emptyArray;

    /**
     * InflatedDatabase contentclock.
     * @member {Array.<number|Long>} contentclock
     * @memberof InflatedDatabase
     * @instance
     */
    InflatedDatabase.prototype.contentclock = $util.emptyArray;

    /**
     * InflatedDatabase rootsHash.
     * @member {Uint8Array} rootsHash
     * @memberof InflatedDatabase
     * @instance
     */
    InflatedDatabase.prototype.rootsHash = $util.newBuffer([]);

    /**
     * InflatedDatabase inflate.
     * @member {number|Long} inflate
     * @memberof InflatedDatabase
     * @instance
     */
    InflatedDatabase.prototype.inflate = $util.Long ? $util.Long.fromBits(0,0,true) : 0;

    /**
     * InflatedDatabase metafeeds.
     * @member {Array.<Uint8Array>} metafeeds
     * @memberof InflatedDatabase
     * @instance
     */
    InflatedDatabase.prototype.metafeeds = $util.emptyArray;

    /**
     * InflatedDatabase contentfeeds.
     * @member {Array.<Uint8Array>} contentfeeds
     * @memberof InflatedDatabase
     * @instance
     */
    InflatedDatabase.prototype.contentfeeds = $util.emptyArray;

    /**
     * Encodes the specified InflatedDatabase message. Does not implicitly {@link InflatedDatabase.verify|verify} messages.
     * @function encode
     * @memberof InflatedDatabase
     * @static
     * @param {IInflatedDatabase} message InflatedDatabase message or plain object to encode
     * @param {$protobuf.Writer} [writer] Writer to encode to
     * @returns {$protobuf.Writer} Writer
     */
    InflatedDatabase.encode = function encode(message, writer) {
        if (!writer)
            writer = $Writer.create();
        if (message.metaclock != null && message.metaclock.length)
            for (let i = 0; i < message.metaclock.length; ++i)
                writer.uint32(/* id 0, wireType 0 =*/0).uint64(message.metaclock[i]);
        if (message.contentclock != null && message.contentclock.length)
            for (let i = 0; i < message.contentclock.length; ++i)
                writer.uint32(/* id 1, wireType 0 =*/8).uint64(message.contentclock[i]);
        writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.rootsHash);
        writer.uint32(/* id 3, wireType 0 =*/24).uint64(message.inflate);
        if (message.metafeeds != null && message.metafeeds.length)
            for (let i = 0; i < message.metafeeds.length; ++i)
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.metafeeds[i]);
        if (message.contentfeeds != null && message.contentfeeds.length)
            for (let i = 0; i < message.contentfeeds.length; ++i)
                writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.contentfeeds[i]);
        return writer;
    };

    /**
     * Decodes an InflatedDatabase message from the specified reader or buffer.
     * @function decode
     * @memberof InflatedDatabase
     * @static
     * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
     * @param {number} [length] Message length if known beforehand
     * @returns {InflatedDatabase} InflatedDatabase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    InflatedDatabase.decode = function decode(reader, length) {
        if (!(reader instanceof $Reader))
            reader = $Reader.create(reader);
        let end = length === undefined ? reader.len : reader.pos + length, message = new $root.InflatedDatabase();
        while (reader.pos < end) {
            let tag = reader.uint32();
            switch (tag >>> 3) {
            case 0:
                if (!(message.metaclock && message.metaclock.length))
                    message.metaclock = [];
                if ((tag & 7) === 2) {
                    let end2 = reader.uint32() + reader.pos;
                    while (reader.pos < end2)
                        message.metaclock.push(reader.uint64());
                } else
                    message.metaclock.push(reader.uint64());
                break;
            case 1:
                if (!(message.contentclock && message.contentclock.length))
                    message.contentclock = [];
                if ((tag & 7) === 2) {
                    let end2 = reader.uint32() + reader.pos;
                    while (reader.pos < end2)
                        message.contentclock.push(reader.uint64());
                } else
                    message.contentclock.push(reader.uint64());
                break;
            case 2:
                message.rootsHash = reader.bytes();
                break;
            case 3:
                message.inflate = reader.uint64();
                break;
            case 4:
                if (!(message.metafeeds && message.metafeeds.length))
                    message.metafeeds = [];
                message.metafeeds.push(reader.bytes());
                break;
            case 5:
                if (!(message.contentfeeds && message.contentfeeds.length))
                    message.contentfeeds = [];
                message.contentfeeds.push(reader.bytes());
                break;
            default:
                reader.skipType(tag & 7);
                break;
            }
        }
        if (!message.hasOwnProperty("rootsHash"))
            throw $util.ProtocolError("missing required 'rootsHash'", { instance: message });
        if (!message.hasOwnProperty("inflate"))
            throw $util.ProtocolError("missing required 'inflate'", { instance: message });
        return message;
    };

    return InflatedDatabase;
})();

export { $root as default };
