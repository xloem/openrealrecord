import HyperStream from '../index';
import { Checkpoint } from '../messages';
import * as ram from 'random-access-memory';
import * as tape from 'tape';

var hs = new HyperStream(ram);

tape('ready', t => {
  hs.ready(err => {
    t.error(err, 'no error');
    t.end();
  });
});

tape('getStream localStream', t => {
  t.same(hs.getStream(hs.localStream!.id), hs.localStream);
  t.end();
});

tape('write', t => {
  hs.write('hello ', err => {
    t.error(err, 'no error');
    hs.write('world!', err => {
      t.error(err, 'no error');
      t.end();
    });
  });
});

tape('local read', t => {
  hs.localStream!.read(1, 10, {}, (err, data) => {
    t.error(err, 'no error');
    t.same(data.toString(), 'ello world');
    t.end();
  });
});

tape('local checkpoints', t => {
  let cp1: any, cp2: any;
  var it = hs.localStream!.checkpoints();

  const verifies = () => {
    hs.localStream!.verify(cp1, (err, success) => {
      t.error(err, 'no error');
      t.same(success, true);
      hs.localStream!.verify(cp2, (err, success) => {
        t.error(err, 'no error');
        t.same(success, true);
        t.end();
      });
    });
  };

  it.next((err: Error, checkpoint: Checkpoint) => {
    t.error(err, 'no error');
    cp1 = checkpoint;
    t.same(checkpoint.length, 1);
    t.same(checkpoint.byteLength, 6);
    it.next((err: Error, checkpoint: Checkpoint) => {
      t.error(err, 'no error');
      cp2 = checkpoint;
      t.same(checkpoint.length, 2);
      t.same(checkpoint.byteLength, 12);
      it.next((err: Error, checkpoint: Checkpoint) => {
        t.error(err, 'no error');
        t.same(checkpoint, null);
        verifies();
      });
    });
  });
});

tape('local listen', t => {
  var length = hs.localStream!.feed!.length;
  var byteLength = hs.localStream!.feed!.byteLength;
  var data = ['  ', "It's", ' me.'];
  var dataIndex = 0;

  t.plan(data.length * 5);

  hs.localStream!.on('error', err => {
    t.fail(err);
  });

  const oncheckpoint = (checkpoint: Checkpoint) => {
    ++length;
    byteLength += data[dataIndex].length;
    ++dataIndex;

    if (dataIndex < data.length) writenext();

    t.same(checkpoint.length, length);
    t.same(checkpoint.byteLength, byteLength);
    hs.localStream!.verify(checkpoint, (err, success) => {
      t.error(err);
      t.ok(success);
    });
  };

  hs.localStream!.on('checkpoint', oncheckpoint);
  hs.localStream!.listen();

  const writenext = () => {
    hs.write(data[dataIndex], err => {
      t.error(err);
    });
  };
  writenext();
});
