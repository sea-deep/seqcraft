import SequenceDiffWorker from './sequence-diff.worker.ts?worker';
import type { BiologicalSequenceInput, SequenceDiffOptions, SequenceDiffResult } from '../domain/sequence-diff';
import type { CircularDiffGeometry, CircularDiffGeometryOptions } from '../geometry/circular-diff-geometry';
import type { SequenceDiffWorkerRequest, SequenceDiffWorkerResponse } from './sequence-diff-protocol';

export interface SequenceDiffWorkerResult {
  result: SequenceDiffResult;
  geometry: CircularDiffGeometry | null;
}

let requestCounter = 0;

export function runSequenceDiffInWorker(
  reference: BiologicalSequenceInput,
  query: BiologicalSequenceInput,
  options?: SequenceDiffOptions,
  geometryOptions?: CircularDiffGeometryOptions | null,
  signal?: AbortSignal,
): Promise<SequenceDiffWorkerResult> {
  if (signal?.aborted) return Promise.reject(new DOMException('Sequence diff aborted', 'AbortError'));
  const worker = new SequenceDiffWorker();
  const requestId = `sequence-diff-${++requestCounter}`;
  const request: SequenceDiffWorkerRequest = { type: 'DIFF', requestId, reference, query, options, geometryOptions: geometryOptions ?? undefined, includeGeometry: geometryOptions !== null };
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      signal?.removeEventListener('abort', abort);
      worker.terminate();
    };
    const abort = () => {
      cleanup();
      reject(new DOMException('Sequence diff aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', abort, { once: true });
    worker.onerror = event => {
      cleanup();
      reject(new Error(event.message || 'Sequence diff worker failed'));
    };
    worker.onmessage = (event: MessageEvent<SequenceDiffWorkerResponse>) => {
      const response = event.data;
      if (response.requestId !== requestId || response.type === 'STARTED') return;
      cleanup();
      if (response.type === 'ERROR') reject(new Error(response.error));
      else resolve({ result: response.result, geometry: response.geometry });
    };
    worker.postMessage(request);
  });
}
