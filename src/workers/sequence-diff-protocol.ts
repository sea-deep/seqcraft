import type { BiologicalSequenceInput, SequenceDiffOptions, SequenceDiffResult } from '../domain/sequence-diff';
import type { CircularDiffGeometry, CircularDiffGeometryOptions } from '../geometry/circular-diff-geometry';
import { createCircularDiffGeometry } from '../geometry/circular-diff-geometry';
import { diffBiologicalSequences } from '../scientific/biological-sequence-diff';

export interface SequenceDiffWorkerRequest {
  type: 'DIFF';
  requestId: string;
  reference: BiologicalSequenceInput;
  query: BiologicalSequenceInput;
  options?: SequenceDiffOptions;
  geometryOptions?: CircularDiffGeometryOptions;
  includeGeometry?: boolean;
}

export type SequenceDiffWorkerResponse =
  | { type: 'STARTED'; requestId: string }
  | { type: 'RESULT'; requestId: string; result: SequenceDiffResult; geometry: CircularDiffGeometry | null }
  | { type: 'ERROR'; requestId: string; error: string };

export function executeSequenceDiffRequest(request: SequenceDiffWorkerRequest): Extract<SequenceDiffWorkerResponse, { type: 'RESULT' }> {
  const result = diffBiologicalSequences(request.reference, request.query, request.options);
  const geometry = (request.includeGeometry ?? true) && result.reference.topology === 'circular' && result.query.topology === 'circular'
    ? createCircularDiffGeometry(result, request.geometryOptions)
    : null;
  return { type: 'RESULT', requestId: request.requestId, result, geometry };
}
