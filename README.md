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
