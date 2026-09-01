import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceCenter } from '../../src/components/workspace/WorkspaceCenter';
import { useWorkspaceStore } from '../../src/state/workspace-store';

describe('WorkspaceCenter View Switching', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      documents: [{
        id: 'doc1',
        topology: 'linear',
        sequence: { raw: 'ATGC', length: 4 },
        alphabet: 'DNA', features: []
      }],
      activeDocumentId: 'doc1',
      activeView: 'sequence'
    });
  });

  it('renders sequence viewer by default', () => {
    render(<WorkspaceCenter handleFileUpload={() => {}} />);
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
