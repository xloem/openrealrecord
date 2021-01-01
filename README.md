# next steps
This repo has been unmaintained for a bit.  auto-merging of PRs has been enabled.

Here are the next steps to provide this resource:
- [ ] 1. port forward the current code, so it runs.  [it takes a little review of the source code to see how to use it]
- [ ] 2. backport bookmoons's blockchain pinning work, to the old codebase.  [only forward port instead if you develop sufficient understanding of that as easier before starting work, and can work in a way that others can build off of rather than isolating.]

# openrealrecord

Provides for a tree of binary streams that are immutable, authenticated, provable, decentralized, censorship-resistant, and of unlimited size.

Streams may be public or private.  Uses hyperdb and hypercore, backends of dat.

The design of openrealrecord should be suitable for recording and sharing information that could threaten very powerful entities, if it can be stored somewhere resilient (TODO: use siacoin, storj, or filecoin).  This has not been tested, nor has the software been reviewed for bugs or security concerns.

- immutable: In addition to using hypercore and hyperdb for data storage (which ensures all data contains a hash of all previous data signed by the creator), openrealrecord additionally includes a hash of all root hashes of all streams in every update.  This prevents even the creators of the data from modifying it, when this final hash is used to refer to the dat

- authenticated: the hyperdb backend provides that every stream has a private key that signs all data, and streams can only be viewed by those with the public key.  Publishing to a group may only be done if a pre-existing publisher authorizes the stream key.

- provable: because every update includes a hash of all previous updates and a cryptographic signature, the data can be verified for correctness.  Interchanging hashes with block chains allows the real world time of every block of data to be proven within the granularity of the blocktime of the chain.  These hashes need only by made by one feed in a tree to prove the times of every other feed in the tree.  Making a norm of publishing a feed to a blockchain in a standard way allows for proving that the data in question was the first produced of its kind.  Because everything is hashed together into one final tree, it is apparent when devices are generating data and when they are failing to anybody with access to the tree.

- decentralized: hypercore requires no server.  TODO: review default network backends (gnunet?), make it easy to manually connect peers  TODO: make it easy to insert user-provided network connections such as manual pipes, sockets, and sneakernet

- censorship-resistant: announcing to blockchains allows global connectivity.  a provable tree of hashes means that it is incredibly difficult to alter data after the fact.

- unlimited size: hypercore streams break their data into trees, where the entirety of the data can be shown correct while only transmitting the portion of it of interest.  The design of openrealrecord allows for stream trees to reference other stream trees as children, providing for unlimited expandability as the metadata structures of a single tree become stretched to their limits.  Updates from each child tree can be hashed into the parent tree as a single stream update.

Known vulnerabilities:

- If a device or its private key is compromised, its entries in the record may not match what really happened after the point of compromise.  Advise to record avenues of attack, and to use a second device to continuously verify recordings of first in some way to mitigate this. (TODO: automate some approach to this redundant verification once there are stream modules that are specific enough for this to be appropriate)

- The hypercore design uses only one hashing algorithm, which may leave it unneccessarily exposed to vulnerabilities discovered in that specific algorithm.

- The software is written in javascript.  Nowadays hypercore has a c++ port, that could be used or forked.

- The code and design has not been reviewed by an expert in security or cryptography.
