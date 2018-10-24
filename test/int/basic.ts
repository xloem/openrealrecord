import test, {CbExecutionContext} from 'ava';
import * as ram from 'random-access-memory';
import * as HyperStream from '../..';
import {Checkpoint} from '../../src/messages';

const hs: any = new HyperStream(ram);
test.serial.cb('ready', (t: CbExecutionContext) => {
  hs.ready((err: Error) => {
    t.falsy(err,  'no error');
    t.end();
  });
});

test.serial.cb('getStream localStream', (t: CbExecutionContext) => {
  t.is(hs.getStream(hs.localStream!.id, () => {}), hs.localStream);
  t.end();
});

test.serial.cb('write', (t: CbExecutionContext) => {
  hs.write('hello ', (err: Error) => {
    t.falsy(err,  'no error');
    hs.write('world!', (nextError: Error) => {
      t.falsy(nextError,  'no error');
      t.end();
    });
  });
});

test.serial.cb('local read', (t: CbExecutionContext) => {
  hs.localStream!.read(1, 10, {}, (err: Error,  data: any) => {
    t.falsy(err,  'no error');
    t.is(data.toString(), 'ello world');
    t.end();
  });
});

test.serial.cb('local checkpoints', (t: CbExecutionContext) => {
  let cp1: Checkpoint;
  let cp2: Checkpoint;
  const it: any = hs.localStream!.checkpoints();
  it.next((err: Error,  checkpoint: Checkpoint) => {
    t.falsy(err,  'no error');
    cp1 = checkpoint;
    t.is(checkpoint.length, 1);
    t.is(checkpoint.byteLength, 6);
    it.next((cp1Error: Error,  cp1Checkpoint: Checkpoint) => {
      t.falsy(cp1Error,  'no error');
      cp2 = cp1Checkpoint;
      t.is(cp1Checkpoint.length, 2);
      t.is(cp1Checkpoint.byteLength, 12);
      it.next((cp2Error: Error,  cp2Checkpoint: Checkpoint) => {
        t.falsy(cp2Error,  'no error');
        t.is(cp2Checkpoint, null);
        verifies();
      });
    });
  });
  function verifies (): void {
    hs.localStream!.verify(cp1, (err: Error,  success: boolean) => {
      t.falsy(err,  'no error');
      t.is(success, true);
      hs.localStream!.verify(cp2, (cp2Error: Error,  cp2Success: boolean) => {
        t.falsy(cp2Error,  'no error');
        t.is(cp2Success, true);
        t.end();
      });
    });
  }
});

test.serial.cb('local listen', (t: CbExecutionContext) => {
  let length: number = hs.localStream!.feed!.length;
  let byteLength: number = hs.localStream!.feed!.byteLength;
  const data: string[] = [
    '  ',
    'It\'s',
    ' me.'
  ];
  let dataIndex: number = 0;

  t.plan(data.length * 5);

  hs.localStream!.on('error', (err: string) => { t.fail(err); });
  hs.localStream!.on('checkpoint', onCheckpoint);
  hs.localStream!.listen();

  let checked: number = 0;

  writeNext();

  function writeNext (): void {
    hs.write(data[dataIndex], (err: Error) => {
      t.falsy(err);
    });
  }

  function onCheckpoint (checkpoint: Checkpoint): void {
    ++length;
    byteLength += data[dataIndex].length;
    ++dataIndex;

    if (dataIndex < data.length) { writeNext(); }

    t.is(checkpoint.length, length);
    t.is(checkpoint.byteLength, byteLength);
    hs.localStream!.verify(checkpoint, (err: Error,  success: boolean) => {
      t.falsy(err);
      t.truthy(success);
      checked++;
      if (checked === data.length) { t.end(); }
    });
  }
});
