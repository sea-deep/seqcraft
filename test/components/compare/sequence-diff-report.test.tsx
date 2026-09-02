import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SequenceDiffReport } from '../../../src/components/compare/SequenceDiffReport';
import { diffBiologicalSequences } from '../../../src/scientific/biological-sequence-diff';

describe('SequenceDiffReport', () => {
  it('leads with a plain-language summary and reveals exact edits on request', () => {
    const reference = { id: 'v1', name: 'pUC19-v1.gb', topology: 'circular' as const, sequence: 'ATGGGATTTTAA', features: [{ id: 'cds', name: 'lacZα', type: 'CDS' as const, strand: 1 as const, segments: [{ start0: 0, end0Exclusive: 12 }], qualifiers: {}, source: 'manual' as const }] };
    const query = { ...reference, id: 'v2', name: 'pUC19-v2.gb', sequence: 'ATGGAATTTTAA' };
    const result = diffBiologicalSequences(reference, query, { includeUnchangedFeatures: true });
    render(<SequenceDiffReport result={result} onSelectDifference={vi.fn()} />);
    expect(screen.getByText('Comparison summary')).toBeTruthy();
    expect(screen.getByText('Likely related versions')).toBeTruthy();
    expect(screen.getByText('Substitutions')).toBeTruthy();
    expect(screen.queryByText(/C → T at 6/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Review individual edits/ }));
    expect(screen.getByText(/C → T at 6/)).toBeTruthy();
    expect(screen.getAllByText(/lacZα/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Topology circular, unchanged/)).toBeTruthy();
  });
});
