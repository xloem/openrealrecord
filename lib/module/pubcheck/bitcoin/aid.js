const hashPrefix = Buffer.from('ORRecord', 'ascii')

const Aid = {
  /**
   * Package checkpoint for publication.
   *
   * @param {object} checkpoint - Checkpoint.
   *
   * @return {Buffer} Packaged message.
   */
  packageCheckpoint (checkpoint) {
    const hash = checkpoint.rootsHash
    const message = Aid.packageHash(hash)
    return message
  },

  /**
   * Package checkpoint hash for publication.
   *
   * Prefixes with ASCII bytes `'ORRecord'`.
   *
   * @param {Buffer} hash - Checkpoint hash.
   *
   * @return {Buffer} Packaged message.
   */
  packageHash (hash) {
    const message = Buffer.concat([
      hashPrefix,
      hash
    ])
    return message
  },

  /**
   * Package checkpoint publication reference.
   *
   * @param {object} checkpoint - Checkpoint.
   * @param {Buffer} txid - Identifier of transaction containing publication.
   *
   * @return {object} Packaged publication reference.
   */
  packageReference (checkpoint, txid) {
    const reference = {
      hash: checkpoint.rootsHash,
      txid
    }
    return reference
  }
}

module.exports = Aid
