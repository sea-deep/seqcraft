/// <reference lib="webworker" />

import { executeSequenceDiffRequest, type SequenceDiffWorkerRequest, type SequenceDiffWorkerResponse } from './sequence-diff-protocol';

self.onmessage = (event: MessageEvent<SequenceDiffWorkerRequest>) => {
  const request = event.data;
  const started: SequenceDiffWorkerResponse = { type: 'STARTED', requestId: request.requestId };
  self.postMessage(started);
  try {
    self.postMessage(executeSequenceDiffRequest(request));
  } catch (error) {
    const response: SequenceDiffWorkerResponse = {
      type: 'ERROR',
      requestId: request.requestId,
      error: error instanceof Error ? error.message : String(error),
    };
    self.postMessage(response);
  }
};
