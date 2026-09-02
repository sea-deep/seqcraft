import type { SequenceDocument } from '../domain/document';
import type { BiologicalSequenceInput, SequenceDiffOptions } from '../domain/sequence-diff';
import type { CircularDiffGeometryOptions } from '../geometry/circular-diff-geometry';
import { getMemorySequence } from '../utils/document-utils';
import { runSequenceDiffInWorker } from '../workers/sequence-diff-client';
import { executeSequenceDiffRequest } from '../workers/sequence-diff-protocol';

export function documentToDiffInput(document: SequenceDocument): BiologicalSequenceInput {
  return {
    id: document.id,
    name: document.name,
    topology: document.topology,
    sequence: getMemorySequence(document).raw,
    features: document.features,
  };
}

export async function compareSequenceDocuments(
  reference: SequenceDocument,
  query: SequenceDocument,
  options?: SequenceDiffOptions,
  geometryOptions: CircularDiffGeometryOptions | null = null,
  signal?: AbortSignal,
) {
  const referenceInput = documentToDiffInput(reference);
  const queryInput = documentToDiffInput(query);
  if (typeof Worker === 'undefined') {
    const response = executeSequenceDiffRequest({
      type: 'DIFF', requestId: 'sequence-diff-inline', reference: referenceInput, query: queryInput,
      options, geometryOptions: geometryOptions ?? undefined, includeGeometry: geometryOptions !== null,
    });
    return { result: response.result, geometry: response.geometry };
  }
  return runSequenceDiffInWorker(referenceInput, queryInput, options, geometryOptions, signal);
}
