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
    expect(screen.getByRole('heading', { level: 1, name: 'doc1 — Sequence' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Map' })).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Sequence' }).getAttribute('aria-selected')).toBe('true');
  });

  it('switches views when tabs are clicked', () => {
    render(<WorkspaceCenter />);
    
    // Default should be sequence
    expect(useWorkspaceStore.getState().activeView).toBe('sequence');
    
    // Click map
    fireEvent.click(screen.getByText('Map'));
    expect(useWorkspaceStore.getState().activeView).toBe('map');
    expect(screen.getByRole('tab', { name: 'Map' }).getAttribute('aria-selected')).toBe('true');
  });

  it('keeps the empty primer view focused on the next available action', () => {
    render(<WorkspaceCenter />);

    fireEvent.click(screen.getByRole('tab', { name: 'Primers' }));

    expect(screen.getByRole('heading', { name: 'No primers yet' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Add primer' })).toBeDefined();
    expect(screen.queryByRole('columnheader', { name: 'Name' })).toBeNull();
    expect(screen.queryByText('PCR simulation')).toBeNull();
  });

  it('labels enzyme filters by class and site count without duplicate all controls', () => {
    render(<WorkspaceCenter />);

    fireEvent.click(screen.getByRole('tab', { name: 'Enzymes' }));

    expect(screen.getByRole('group', { name: 'Enzyme class' })).toBeDefined();
    expect(screen.getByRole('group', { name: 'Recognition site count' })).toBeDefined();
    expect(screen.getAllByRole('button', { name: 'Any' })).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'All' })).toBeNull();
  });

  it('offers clean import path when no document is loaded', () => {
    useWorkspaceStore.setState({ documents: [], activeDocumentId: null, openDocumentIds: [] });
    render(<WorkspaceCenter />);

    expect(screen.getByRole('button', { name: 'Import sequence' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Open demo workspace' })).toBeNull();
  });
});
