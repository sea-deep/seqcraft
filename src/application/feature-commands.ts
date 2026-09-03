/**
 * Application commands for feature and primer management.
 * Shared between UI workflows and WebMCP tools.
 */

import { useWorkspaceStore } from '../state/workspace-store';
import { generateId } from '../utils/id';
import type { Feature, FeatureType, SequenceInterval } from '../domain/feature';
import type { Primer } from '../domain/primer';
import { ERROR_CODES } from '../domain/errors';

export interface CreateFeatureInput {
  documentId?: string;
  name: string;
  type: FeatureType;
  start1: number;
  end1: number;
  strand?: 1 | -1 | '+' | '-';
  qualifiers?: Record<string, string | string[]>;
}

export interface FeatureCommandResult {
  ok: boolean;
  feature?: Feature;
  primer?: Primer;
  error?: string;
  code?: string;
  revisionBefore?: number;
  revisionAfter?: number;
}

export function createFeatureCommand(input: CreateFeatureInput): FeatureCommandResult {
  const store = useWorkspaceStore.getState();
  const doc = input.documentId
    ? store.documents.find(d => d.id === input.documentId)
    : store.documents.find(d => d.id === store.activeDocumentId);

  if (!doc) {
    return { ok: false, error: 'Target document not found.', code: ERROR_CODES.DOCUMENT_NOT_FOUND };
  }

  const s0 = Math.max(0, input.start1 - 1);
  const e0 = Math.min(doc.length, input.end1);
  const numStrand: 1 | -1 = input.strand === -1 || input.strand === '-' ? -1 : 1;

  let segments: SequenceInterval[];
  if (e0 >= s0) {
    segments = [{ start0: s0, end0Exclusive: e0 }];
  } else {
    // Spans origin in circular sequence
    segments = [
      { start0: s0, end0Exclusive: doc.length },
      { start0: 0, end0Exclusive: e0 }
    ];
  }

  const newFeat: Feature = {
    id: generateId(),
    name: input.name.trim(),
    type: input.type,
    strand: numStrand,
    segments,
    qualifiers: input.qualifiers || {},
    source: 'agent'
  };

  const revBefore = doc.version;
  store.addFeature(doc.id, newFeat);
  const updatedDoc = store.documents.find(d => d.id === doc.id);

  return {
    ok: true,
    feature: newFeat,
    revisionBefore: revBefore,
    revisionAfter: updatedDoc?.version || revBefore + 1
  };
}

export function deleteFeatureCommand(input: { documentId?: string; featureId?: string; featureName?: string }): FeatureCommandResult {
  const store = useWorkspaceStore.getState();
  const doc = input.documentId
    ? store.documents.find(d => d.id === input.documentId)
    : store.documents.find(d => d.id === store.activeDocumentId);

  if (!doc) {
    return { ok: false, error: 'Target document not found.', code: ERROR_CODES.DOCUMENT_NOT_FOUND };
  }

  let feat = input.featureId ? doc.features.find(f => f.id === input.featureId) : undefined;
  if (!feat && input.featureName) {
    const q = input.featureName.toLowerCase();
    feat = doc.features.find(f => f.name.toLowerCase() === q);
  }

  if (!feat) {
    return { ok: false, error: `Feature '${input.featureId || input.featureName}' not found.`, code: ERROR_CODES.FEATURE_NOT_FOUND };
  }

  const revBefore = doc.version;
  store.deleteFeature(doc.id, feat.id);
  const updatedDoc = store.documents.find(d => d.id === doc.id);

  return {
    ok: true,
    feature: feat,
    revisionBefore: revBefore,
    revisionAfter: updatedDoc?.version || revBefore + 1
  };
}
