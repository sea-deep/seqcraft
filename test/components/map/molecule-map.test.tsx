import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { SequenceDocument } from '../../../src/domain/document';
import { MoleculeMap } from '../../../src/components/map/MoleculeMap';

vi.mock('../../../src/components/map/LinearMap', () => ({
  LinearMap: ({ document }: { document: SequenceDocument }) => <div data-testid="linear-map">{document.name}</div>,
}));

vi.mock('../../../src/components/map/PlasmidMap3D', () => ({
  PlasmidMap3D: ({ document }: { document: SequenceDocument }) => <div data-testid="circular-map">{document.name}</div>,
}));

function documentWithTopology(topology: SequenceDocument['topology']): SequenceDocument {
  return { name: `${topology} document`, topology } as SequenceDocument;
}

describe('MoleculeMap', () => {
  it('renders linear documents with the linear map', () => {
    render(<MoleculeMap document={documentWithTopology('linear')} />);

    expect(screen.getByTestId('linear-map').textContent).toBe('linear document');
    expect(screen.queryByTestId('circular-map')).toBeNull();
  });

  it('keeps circular documents on the plasmid map', () => {
    render(<MoleculeMap document={documentWithTopology('circular')} />);

    expect(screen.getByTestId('circular-map').textContent).toBe('circular document');
    expect(screen.queryByTestId('linear-map')).toBeNull();
  });
});
