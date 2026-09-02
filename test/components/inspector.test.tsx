import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Inspector } from '../../src/components/inspector/Inspector';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import type { SequenceDocument } from '../../src/domain/document';
import { ScientificSequence } from '../../src/scientific/nucleotide';

describe('Inspector Synchronization', () => {
  const doc: SequenceDocument = {
    id: 'doc1',
    name: 'test-pUC19',
    topology: 'circular',
    alphabet: 'DNA',
    source: 'fasta',
    version: 1,
    sequence: new ScientificSequence('ATGCATGCATGCATGC', 'DNA'),
    length: 16,
    storageMode: 'memory',
    features: [
      {
        id: 'f1',
        name: 'AmpR',
        type: 'CDS',
        strand: -1,
        source: 'imported',
        qualifiers: { note: 'test note' },
        segments: [{ start0: 0, end0Exclusive: 4 }]
      }
    ],
    primers: []
  };

  beforeEach(() => {
    useWorkspaceStore.setState({
      documents: [doc],
      activeDocumentId: 'doc1',
      selection: null,
      selectedFeatureId: null,
      activeView: 'sequence'
    });
  });

  it('shows document summary when nothing is selected', () => {
    render(<Inspector />);
    expect(screen.getByText('test-pUC19')).toBeDefined();
    expect(screen.getByText('circular', { exact: false })).toBeDefined();
    expect(screen.getByText('16 bp')).toBeDefined();
    expect(screen.getByText('1 annotations')).toBeDefined();
    expect(screen.getByText('Document')).toBeDefined();
  });

  it('shows feature when a feature is selected', () => {
    useWorkspaceStore.getState().selectFeature('f1');
    render(<Inspector />);
    expect(screen.getByText('AmpR')).toBeDefined();
    expect(screen.getByText('CDS')).toBeDefined();
    expect(screen.getByText('Reverse')).toBeDefined();
    expect(screen.getByText('1–4')).toBeDefined();
    expect(screen.getByText('test note')).toBeDefined();
  });

  it('shows selection when bases are selected (and no feature)', () => {
    useWorkspaceStore.getState().setSelection('doc1', 4, 8);
    render(<Inspector />);
    expect(screen.getByText('Selection')).toBeDefined();
    expect(screen.getByText('5–8')).toBeDefined();
    expect(screen.getByText('ATGC')).toBeDefined();
  });

  it('prefers feature over selection if both exist', () => {
    useWorkspaceStore.getState().setSelection('doc1', 4, 8);
    useWorkspaceStore.getState().selectFeature('f1');
    render(<Inspector />);
    expect(screen.getByText('AmpR')).toBeDefined();
    expect(screen.queryByText('Selection')).toBeNull();
  });
});
