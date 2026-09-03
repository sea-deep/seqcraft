/**
 * Application-level navigation commands for agent-driven workspace control.
 *
 * These commands bridge between WebMCP tool inputs (1-based inclusive coordinates)
 * and SeqCraft's internal Zustand state (0-based half-open coordinates).
 *
 * Architecture boundary:
 *   WebMCP execute → application navigation → Zustand store → React/Three.js reactivity
 */

import { getMemorySequence } from '../utils/document-utils';
import { useWorkspaceStore } from '../state/workspace-store';
import { analyzeRestrictionSites } from '../scientific/restriction-analysis';
import { BUILTIN_ENZYMES, findEnzyme } from '../data/restriction-enzymes';
import type { SequenceDocument } from '../domain/document';
import type { RestrictionEnzyme } from '../domain/restriction';

// ─── Shared helpers ────────────────────────────────────────────────────

export interface NavigationSuccess<T> {
  ok: true;
  result: T;
}

export interface NavigationError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export type NavigationResult<T> = NavigationSuccess<T> | NavigationError;

function success<T>(result: T): NavigationSuccess<T> {
  return { ok: true, result };
}

function error(code: string, message: string, details?: any): NavigationError {
  return { ok: false, error: { code, message, details } };
}

function getActiveDoc(): SequenceDocument | null {
  const state = useWorkspaceStore.getState();
  const id = state.activeDocumentId;
  return id ? state.documents.find(d => d.id === id) || null : null;
}

function resolveEnzyme(name: string): RestrictionEnzyme | null {
  return findEnzyme(name) || null;
}

// ─── focusSequenceRegion ───────────────────────────────────────────────

export interface FocusRegionInput {
  start1: number;
  end1: number;
  preferredView?: 'sequence' | 'map';
}

export interface FocusRegionResult {
  summary: string;
  documentId: string;
  documentName: string;
  start1: number;
  end1: number;
  lengthBp: number;
  wrapsOrigin: boolean;
  activeView: string;
}

export function focusSequenceRegion(input: FocusRegionInput): NavigationResult<FocusRegionResult> {
  const doc = getActiveDoc();
  if (!doc) return error('NO_ACTIVE_DOCUMENT', 'No active DNA document is open.');

  const { start1, end1, preferredView } = input;
  const seqLen = doc.length;

  // Validate integer coordinates
  if (!Number.isInteger(start1) || !Number.isInteger(end1)) {
    return error('INVALID_RANGE', 'Coordinates must be integers.');
  }

  // Validate within sequence bounds (1-based)
  if (start1 < 1 || start1 > seqLen || end1 < 1 || end1 > seqLen) {
    return error('INVALID_RANGE', `Coordinates must be between 1 and ${seqLen}.`, { sequenceLength: seqLen });
  }

  // Convert 1-based inclusive → 0-based half-open
  const start0 = start1 - 1;
  const end0Exclusive = end1; // 1-based inclusive end1 == 0-based exclusive end0

  // Linear documents require ordered intervals
  if (doc.topology === 'linear' && end0Exclusive < start0) {
    return error('INVALID_RANGE', 'Linear sequences require start ≤ end.', { topology: doc.topology });
  }

  // Detect origin wrap on circular
  const wrapsOrigin = doc.topology === 'circular' && start0 >= end0Exclusive;

  // Compute display length
  let lengthBp: number;
  if (wrapsOrigin) {
    lengthBp = (seqLen - start0) + end0Exclusive;
  } else {
    lengthBp = end0Exclusive - start0;
  }

  const store = useWorkspaceStore.getState();

  // Set selection (clears feature/restriction site selection via store semantics)
  store.setSelection(doc.id, start0, end0Exclusive);

  // Switch view if requested
  if (preferredView) {
    store.setActiveView(preferredView);
  }

  const finalView = useWorkspaceStore.getState().activeView;

  return success({
    summary: `Focused ${start1}–${end1} on ${doc.name}`,
    documentId: doc.id,
    documentName: doc.name,
    start1,
    end1,
    lengthBp,
    wrapsOrigin,
    activeView: finalView,
  });
}

// ─── showRestrictionSite ──────────────────────────────────────────────

export interface ShowRestrictionSiteInput {
  enzymeName: string;
  occurrence?: number;
  view?: 'sequence' | 'map';
}

export interface ShowRestrictionSiteResult {
  summary: string;
  enzymeName: string;
  occurrence: number;
  siteCountForEnzyme: number;
  recognitionSequence: string;
  start1: number;
  end1: number;
  forwardCut1: number;
  reverseCut1: number;
  selectedRestrictionSiteId: string;
  activeView: string;
}

export function showRestrictionSite(input: ShowRestrictionSiteInput): NavigationResult<ShowRestrictionSiteResult> {
  const doc = getActiveDoc();
  if (!doc) return error('NO_ACTIVE_DOCUMENT', 'No active DNA document is open.');

  const enzyme = resolveEnzyme(input.enzymeName);
  if (!enzyme) {
    return error('UNKNOWN_ENZYME', `Unknown enzyme: ${input.enzymeName}`, {
      availableBuiltinEnzymes: BUILTIN_ENZYMES.map(e => e.name),
    });
  }

  // Run restriction analysis for this enzyme only
  const allSites = analyzeRestrictionSites(getMemorySequence(doc).raw, doc.topology, [enzyme]);
  const enzymeSites = allSites.filter(s => s.enzymeId === enzyme.id);

  if (enzymeSites.length === 0) {
    return error('NO_RESTRICTION_SITE', `${enzyme.name} does not cut this sequence.`);
  }

  const occurrence = input.occurrence ?? 1;
  if (!Number.isInteger(occurrence) || occurrence < 1 || occurrence > enzymeSites.length) {
    return error('INVALID_OCCURRENCE', `Occurrence must be between 1 and ${enzymeSites.length}.`, {
      siteCount: enzymeSites.length,
    });
  }

  const site = enzymeSites[occurrence - 1];
  const view = input.view ?? 'map';

  const store = useWorkspaceStore.getState();

  // Use existing restriction-site selection action (clears feature + sequence selection)
  store.selectRestrictionSite(site.id);

  // Switch view
  store.setActiveView(view);

  const finalView = useWorkspaceStore.getState().activeView;

  return success({
    summary: `Focused ${enzyme.name} cut at ${site.forwardCut0}`,
    enzymeName: enzyme.name,
    occurrence,
    siteCountForEnzyme: enzymeSites.length,
    recognitionSequence: site.recognitionSequence,
    start1: site.start0 + 1,
    end1: site.end0Exclusive,
    forwardCut1: site.forwardCut0,
    reverseCut1: site.reverseCut0,
    selectedRestrictionSiteId: site.id,
    activeView: finalView,
  });
}

// ─── showFeature ──────────────────────────────────────────────────────

export interface ShowFeatureInput {
  featureId?: string;
  featureName?: string;
  occurrence?: number;
  view?: 'sequence' | 'map';
}

export interface ShowFeatureResult {
  summary: string;
  featureId: string;
  name: string;
  type: string;
  strand: 1 | -1;
  segments: Array<{ start1: number; end1: number }>;
  selectedFeatureId: string;
  activeView: string;
}

export function showFeature(input: ShowFeatureInput): NavigationResult<ShowFeatureResult> {
  const doc = getActiveDoc();
  if (!doc) return error('NO_ACTIVE_DOCUMENT', 'No active DNA document is open.');

  if (!input.featureId && !input.featureName) {
    return error('FEATURE_NOT_FOUND', 'Either featureId or featureName must be provided.');
  }

  let feature = null;

  if (input.featureId) {
    // Direct ID lookup
    feature = doc.features.find(f => f.id === input.featureId);
  } else if (input.featureName) {
    // Case-insensitive name lookup with occurrence support
    const lowerName = input.featureName.toLowerCase();
    const matches = doc.features.filter(f => f.name.toLowerCase() === lowerName);

    if (matches.length === 0) {
      return error('FEATURE_NOT_FOUND', `No feature named "${input.featureName}" found.`, {
        availableFeatures: doc.features.map(f => f.name),
      });
    }

    const occurrence = input.occurrence ?? 1;
    if (!Number.isInteger(occurrence) || occurrence < 1 || occurrence > matches.length) {
      return error('INVALID_OCCURRENCE', `Occurrence must be between 1 and ${matches.length}.`, {
        matchCount: matches.length,
      });
    }

    feature = matches[occurrence - 1];
  }

  if (!feature) {
    return error('FEATURE_NOT_FOUND', `Feature not found.`);
  }

  const view = input.view ?? 'map';
  const store = useWorkspaceStore.getState();

  // Use existing selectDocumentFeature (sets selection from feature bounds, clears restriction site)
  store.selectDocumentFeature(doc.id, feature.id);

  // Switch view
  store.setActiveView(view);

  const finalView = useWorkspaceStore.getState().activeView;

  return success({
    summary: `Selected ${feature.name}`,
    featureId: feature.id,
    name: feature.name,
    type: feature.type,
    strand: feature.strand,
    segments: feature.segments.map(s => ({
      start1: s.start0 + 1,
      end1: s.end0Exclusive,
    })),
    selectedFeatureId: feature.id,
    activeView: finalView,
  });
}
