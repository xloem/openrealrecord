import * as $protobuf from "protobufjs";
/** Properties of a Checkpoint. */
export interface ICheckpoint {

    /** Checkpoint rootsHash */
    rootsHash: Uint8Array;

    /** Checkpoint timestamp */
    timestamp: (number|Long);

    /** Checkpoint length */
    length: (number|Long);

    /** Checkpoint byteLength */
    byteLength: (number|Long);
}

/** Represents a Checkpoint. */
export class Checkpoint implements ICheckpoint {

    /**
     * Constructs a new Checkpoint.
     * @param [properties] Properties to set
     */
    constructor(properties?: ICheckpoint);

    /** Checkpoint rootsHash. */
    public rootsHash: Uint8Array;

    /** Checkpoint timestamp. */
    public timestamp: (number|Long);

    /** Checkpoint length. */
    public length: (number|Long);

    /** Checkpoint byteLength. */
    public byteLength: (number|Long);

    /**
     * Encodes the specified Checkpoint message. Does not implicitly {@link Checkpoint.verify|verify} messages.
     * @param message Checkpoint message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ICheckpoint, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Checkpoint message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Checkpoint
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Checkpoint;
}

/** Properties of a Timestamp. */
export interface ITimestamp {

    /** Timestamp id */
    id?: (Uint8Array[]|null);
}

/** Represents a Timestamp. */
export class Timestamp implements ITimestamp {

    /**
     * Constructs a new Timestamp.
     * @param [properties] Properties to set
     */
    constructor(properties?: ITimestamp);

    /** Timestamp id. */
    public id: Uint8Array[];

    /**
     * Encodes the specified Timestamp message. Does not implicitly {@link Timestamp.verify|verify} messages.
     * @param message Timestamp message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: ITimestamp, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Timestamp message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Timestamp
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Timestamp;
}

/** Properties of a Database. */
export interface IDatabase {

    /** Database metaclock */
    metaclock?: ((number|Long)[]|null);

    /** Database contentclock */
    contentclock?: ((number|Long)[]|null);

    /** Database rootsHash */
    rootsHash: Uint8Array;

    /** Database inflate */
    inflate: (number|Long);
}

/** Represents a Database. */
export class Database implements IDatabase {

    /**
     * Constructs a new Database.
     * @param [properties] Properties to set
     */
    constructor(properties?: IDatabase);

    /** Database metaclock. */
    public metaclock: (number|Long)[];

    /** Database contentclock. */
    public contentclock: (number|Long)[];

    /** Database rootsHash. */
    public rootsHash: Uint8Array;

    /** Database inflate. */
    public inflate: (number|Long);

    /**
     * Encodes the specified Database message. Does not implicitly {@link Database.verify|verify} messages.
     * @param message Database message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IDatabase, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Database message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Database
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Database;
}

/** Properties of an InflatedDatabase. */
export interface IInflatedDatabase {

    /** InflatedDatabase metaclock */
    metaclock?: ((number|Long)[]|null);

    /** InflatedDatabase contentclock */
    contentclock?: ((number|Long)[]|null);

    /** InflatedDatabase rootsHash */
    rootsHash: Uint8Array;

    /** InflatedDatabase inflate */
    inflate: (number|Long);

    /** InflatedDatabase metafeeds */
    metafeeds?: (Uint8Array[]|null);

    /** InflatedDatabase contentfeeds */
    contentfeeds?: (Uint8Array[]|null);
}

/** Represents an InflatedDatabase. */
export class InflatedDatabase implements IInflatedDatabase {

    /**
     * Constructs a new InflatedDatabase.
     * @param [properties] Properties to set
     */
    constructor(properties?: IInflatedDatabase);

    /** InflatedDatabase metaclock. */
    public metaclock: (number|Long)[];

    /** InflatedDatabase contentclock. */
    public contentclock: (number|Long)[];

    /** InflatedDatabase rootsHash. */
    public rootsHash: Uint8Array;

    /** InflatedDatabase inflate. */
    public inflate: (number|Long);

    /** InflatedDatabase metafeeds. */
    public metafeeds: Uint8Array[];

    /** InflatedDatabase contentfeeds. */
    public contentfeeds: Uint8Array[];

    /**
     * Encodes the specified InflatedDatabase message. Does not implicitly {@link InflatedDatabase.verify|verify} messages.
     * @param message InflatedDatabase message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IInflatedDatabase, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an InflatedDatabase message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns InflatedDatabase
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): InflatedDatabase;
}
