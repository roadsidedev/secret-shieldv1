import { parentPort, workerData } from 'node:worker_threads';
import { Scanner } from './scanner.js';
import { TaintEngine } from './taint.js';
import { runCheckpoint, type CheckpointInput } from './checkpoint-core.js';

const { type, data } = workerData as { type: 'scan' | 'prune' | 'checkpoint'; data: any };

if (type === 'scan') {
  const taintEngine = new TaintEngine();
  const scanner = new Scanner({}, taintEngine);
  scanner.scan(data).then(matches => {
    parentPort?.postMessage(matches);
  });
} else if (type === 'checkpoint') {
  const input = data as CheckpointInput;
  runCheckpoint(input).then(result => {
    parentPort?.postMessage(result);
  });
}
