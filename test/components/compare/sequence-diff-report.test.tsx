import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SequenceDiffReport } from '../../../src/components/compare/SequenceDiffReport';
import { diffBiologicalSequences } from '../../../src/scientific/biological-sequence-diff';

describe('SequenceDiffReport', () => {
  it('leads with biological edits and representation-only changes', () => {
    const reference = { id: 'v1', name: 'pUC19-v1.gb', topology: 'circular' as const, sequence: 'ATGGGATTTTAA', features: [{ id: 'cds', name: 'lacZα', type: 'CDS' as const, strand: 1 as const, segments: [{ start0: 0, end0Exclusive: 12 }], qualifiers: {}, source: 'manual' as const }] };
    const query = { ...reference, id: 'v2', name: 'pUC19-v2.gb', sequence: 'ATGGAATTTTAA' };
    const result = diffBiologicalSequences(reference, query, { includeUnchangedFeatures: true });
    render(<SequenceDiffReport result={result} onSelectDifference={vi.fn()} />);
    expect(screen.getByText('Biological change report')).toBeTruthy();
    expect(screen.getByText(/C → T at 6/)).toBeTruthy();
    expect(screen.getAllByText(/lacZα/).length).toBeGreaterThan(0);
    expect(screen.getByText('circular, unchanged')).toBeTruthy();
    expect(screen.getByText('changed', { selector: 'dd' })).toBeTruthy();
  });
});
