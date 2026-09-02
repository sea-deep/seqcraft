import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceCenter } from '../../src/components/workspace/WorkspaceCenter';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import { ScientificSequence } from '../../src/scientific/nucleotide';

describe('WorkspaceCenter View Switching', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      documents: [{
        id: 'doc1',
        topology: 'linear',
        name: 'doc1', sequence: new ScientificSequence('ATGC'), length: 4, storageMode: 'memory',
        alphabet: 'DNA', features: [], primers: [], source: 'raw', version: 1,
      }],
      activeDocumentId: 'doc1',
      activeView: 'sequence'
    });
  });

  it('renders sequence viewer by default', () => {
    render(<WorkspaceCenter />);
    expect(screen.getByText('Map')).toBeDefined();
    expect(screen.getByText('Sequence')).toBeDefined();
  });

  it('switches views when tabs are clicked', () => {
    render(<WorkspaceCenter />);
    
    // Default should be sequence
    expect(useWorkspaceStore.getState().activeView).toBe('sequence');
    
    // Click map
    fireEvent.click(screen.getByText('Map'));
    expect(useWorkspaceStore.getState().activeView).toBe('map');
  });
});
