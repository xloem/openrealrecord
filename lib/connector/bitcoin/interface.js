/**
 * Bitcoin connector.
 *
 * Provides interface with the [bitcoin][1] chain and network.
 *
 * @interface IBitcoinConnector
 * @memberof module:openrealrecord/connector/bitcoin
 */

/**
 * Initialize connector.
 *
 * @method init
 * @memberof module:openrealrecord/connector/bitcoin~IBitcoinConnector
 * @async
 *
 * @throws {Error} If already initialized. Message `'already initialized'`.
 */

/**
 * Publish data to chain.
 *
 * @method publishData
 * @memberof module:openrealrecord/connector/bitcoin~IBitcoinConnector
 * @async
 *
 * @param {Buffer} data - Data to publish. Max 40 bytes.
 *
 * @return {TXID} Identifier of transaction containing publication.
 *     Transaction confirmation not guaranteed.
 *
 * @throws {Error} If not initialized. Message `'not initialized'`.
 * @throws {Error} If over 40 bytes is provided. Message `'too much data'`.
 * @throws If wallet node is not available.
 * @throws If chain node is not available.
 * @throws If the wallet does not have sufficient funds.
 * @throws If sending the transaction fails.
 */

/**
 * Await transaction confirmation.
 *
 * @method txConfirmed
 * @memberof module:openrealrecord/connector/bitcoin~IBitcoinConnector
 * @async
 *
 * @param {TXID} txid - Transaction to wait for confirmation of.
 * @param {number} [confirmations=1] - Number of confirmations to await.
 *     Positive integer.
 * @param {number} [timeout=900000] - Maximum time to wait in milliseconds.
 *     Default 15 minutes.
 *
 * @throws {Error} If not initialized. Message `'not initialized'`.
 * @throws {Error} If timeout expires. Message `'timed out'`.
 * @throws If `txid` is invalid.
 * @throws If wallet node is not available.
 * @throws If chain node is not available.
 */

/**
 * Transaction identifier.
 *
 * SHA-256d hash of transaction.
 *
 * @typedef {Buffer} TXID
 * @memberof module:openrealrecord/connector/bitcoin~IBitcoinConnector
 */
