import { getMemorySequence } from '../utils/document-utils';
import type { SequenceDocument } from '../domain/document';
import type { RestrictionEnzyme } from '../domain/restriction';
import { analyzeRestrictionSites } from '../scientific/restriction-analysis';

export type WorkspaceSearchResult =
  | { kind: 'document'; documentId: string; title: string; detail: string }
  | { kind: 'feature'; documentId: string; featureId: string; title: string; detail: string }
  | { kind: 'primer'; documentId: string; primerId: string; title: string; detail: string }
  | { kind: 'enzyme'; documentId: string; enzymeId: string; siteId?: string; title: string; detail: string }
  | { kind: 'coordinate'; documentId: string; start0: number; end0Exclusive: number; title: string; detail: string };

export function parseCoordinateQuery(query: string, sequenceLength: number): { start0: number; end0Exclusive: number } | null {
  const match = query.trim().match(/^:?(\d+)(?:\s*(?:-|\.\.)\s*(\d+))?$/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = match[2] ? Number(match[2]) : first;
  if (first < 1 || second < first || second > sequenceLength) return null;
  return { start0: first - 1, end0Exclusive: second };
}

export function searchWorkspace(
  documents: SequenceDocument[],
  activeDocumentId: string | null,
  enzymes: RestrictionEnzyme[],
  query: string,
): WorkspaceSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const results: WorkspaceSearchResult[] = [];
  const activeDocument = documents.find(document => document.id === activeDocumentId);

  if (activeDocument) {
    const coordinate = parseCoordinateQuery(query, activeDocument.length);
    if (coordinate) {
      results.push({ kind: 'coordinate', documentId: activeDocument.id, ...coordinate, title: `Go to ${coordinate.start0 + 1}–${coordinate.end0Exclusive}`, detail: activeDocument.name });
    }
  }

  for (const document of documents) {
    if (document.name.toLowerCase().includes(normalized)) {
      results.push({ kind: 'document', documentId: document.id, title: document.name, detail: `${document.length.toLocaleString()} bp · ${document.topology}` });
    }
    for (const feature of document.features) {
      if (feature.type === 'source') continue;
      if (feature.name.toLowerCase().includes(normalized) || feature.type.toLowerCase().includes(normalized)) {
        results.push({ kind: 'feature', documentId: document.id, featureId: feature.id, title: feature.name, detail: `${feature.type} · ${document.name}` });
      }
    }
    for (const primer of document.primers ?? []) {
      if (primer.name.toLowerCase().includes(normalized) || primer.sequence.toLowerCase().includes(normalized)) {
        results.push({ kind: 'primer', documentId: document.id, primerId: primer.id, title: primer.name, detail: `Primer · ${document.name}` });
      }
    }
  }

  if (activeDocument?.storageMode === 'memory') {
    const sites = analyzeRestrictionSites(getMemorySequence(activeDocument).raw, activeDocument.topology, enzymes);
    for (const enzyme of enzymes) {
      if (!enzyme.name.toLowerCase().includes(normalized) && !enzyme.recognitionSequence.toLowerCase().includes(normalized)) continue;
      const enzymeSites = sites.filter(site => site.enzymeId === enzyme.id);
      results.push({
        kind: 'enzyme', documentId: activeDocument.id, enzymeId: enzyme.id,
        siteId: enzymeSites[0]?.id, title: enzyme.name,
        detail: `${enzyme.recognitionSequence} · ${enzymeSites.length} site${enzymeSites.length === 1 ? '' : 's'}`,
      });
    }
  }

  return results.slice(0, 40);
}
