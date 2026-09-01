import { describe, it, expect, beforeEach } from 'vitest';
import { focusSequenceRegion, showRestrictionSite, showFeature } from '../../src/application/navigation';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import { importGenBank } from '../../src/import/genbank';
import { DEMO_GENBANK } from '../../src/data/demo-workspace';
import type { SequenceDocument } from '../../src/domain/document';

describe('Application Navigation Commands', () => {
  let pUC19: SequenceDocument;

  beforeEach(() => {
    useWorkspaceStore.setState({
      documents: [],
      activeDocumentId: null,
      selection: null,
      selectedFeatureId: null,
      selectedRestrictionSiteId: null,
      activeView: 'sequence',
    });
    pUC19 = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(pUC19);
  });

  // ─── focusSequenceRegion ─────────────────────────────────

  it('focuses a linear-style region on circular DNA', () => {
    const res = focusSequenceRegion({ start1: 101, end1: 200 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.start1).toBe(101);
    expect(res.result.end1).toBe(200);
    expect(res.result.lengthBp).toBe(100);
    expect(res.result.wrapsOrigin).toBe(false);
    expect(res.result.documentName).toBe('pUC19');

    // Store state
    const sel = useWorkspaceStore.getState().selection;
    expect(sel).not.toBeNull();
    expect(sel!.start0).toBe(100);
    expect(sel!.end0Exclusive).toBe(200);
  });

  it('focuses an origin-spanning region on circular DNA', () => {
    const res = focusSequenceRegion({ start1: 2600, end1: 100 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.wrapsOrigin).toBe(true);
    expect(res.result.lengthBp).toBe(187); // (2686-2599) + 100

    const sel = useWorkspaceStore.getState().selection;
    expect(sel).not.toBeNull();
    expect(sel!.start0).toBe(2599);
    expect(sel!.end0Exclusive).toBe(100);
  });

  it('rejects reversed range on linear DNA', () => {
    // Create a linear document
    const linearDoc: SequenceDocument = {
      ...pUC19,
      id: 'linear-test',
      topology: 'linear',
    };
    useWorkspaceStore.getState().addDocument(linearDoc);
    useWorkspaceStore.getState().setActiveDocument('linear-test');

    const res = focusSequenceRegion({ start1: 200, end1: 100 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('INVALID_RANGE');
  });

  it('rejects out-of-range coordinates', () => {
    const res = focusSequenceRegion({ start1: 0, end1: 100 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('INVALID_RANGE');
  });

  it('switches view when requested', () => {
    focusSequenceRegion({ start1: 100, end1: 200, preferredView: 'map' });
    expect(useWorkspaceStore.getState().activeView).toBe('map');
  });

  it('clears feature/restriction selection when focusing region', () => {
    useWorkspaceStore.getState().selectFeature('some-feature');
    focusSequenceRegion({ start1: 100, end1: 200 });
    expect(useWorkspaceStore.getState().selectedFeatureId).toBeNull();
    expect(useWorkspaceStore.getState().selectedRestrictionSiteId).toBeNull();
  });

  it('returns NO_ACTIVE_DOCUMENT when no document loaded', () => {
    useWorkspaceStore.setState({ documents: [], activeDocumentId: null });
    const res = focusSequenceRegion({ start1: 1, end1: 100 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('NO_ACTIVE_DOCUMENT');
  });

  // ─── showRestrictionSite ─────────────────────────────────

  it('selects the EcoRI restriction site on pUC19', () => {
    const res = showRestrictionSite({ enzymeName: 'EcoRI' });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.enzymeName).toBe('EcoRI');
    expect(res.result.occurrence).toBe(1);
    expect(res.result.siteCountForEnzyme).toBe(1);
    expect(res.result.selectedRestrictionSiteId).toBeTruthy();

    // Store state
    expect(useWorkspaceStore.getState().selectedRestrictionSiteId).toBe(res.result.selectedRestrictionSiteId);
    expect(useWorkspaceStore.getState().selectedFeatureId).toBeNull();
  });

  it('rejects unknown enzyme', () => {
    const res = showRestrictionSite({ enzymeName: 'FakeEnzyme' });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('UNKNOWN_ENZYME');
    expect(res.error.details.availableBuiltinEnzymes).toContain('EcoRI');
  });

  it('rejects invalid occurrence', () => {
    const res = showRestrictionSite({ enzymeName: 'EcoRI', occurrence: 5 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('INVALID_OCCURRENCE');
  });

  it('defaults to map view', () => {
    showRestrictionSite({ enzymeName: 'EcoRI' });
    expect(useWorkspaceStore.getState().activeView).toBe('map');
  });

  it('switches to sequence view when requested', () => {
    showRestrictionSite({ enzymeName: 'EcoRI', view: 'sequence' });
    expect(useWorkspaceStore.getState().activeView).toBe('sequence');
  });

  // ─── showFeature ─────────────────────────────────────────

  it('selects a feature by name (case-insensitive)', () => {
    const res = showFeature({ featureName: 'ampr' }); // lowercase
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.name.toLowerCase()).toContain('amp');
    expect(res.result.selectedFeatureId).toBeTruthy();

    // Store state
    expect(useWorkspaceStore.getState().selectedFeatureId).toBe(res.result.selectedFeatureId);
    expect(useWorkspaceStore.getState().selectedRestrictionSiteId).toBeNull();
  });

  it('selects a feature by exact ID', () => {
    const feature = pUC19.features[0];
    const res = showFeature({ featureId: feature.id });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.featureId).toBe(feature.id);
    expect(res.result.name).toBe(feature.name);
  });

  it('rejects missing feature', () => {
    const res = showFeature({ featureName: 'NonExistentFeature' });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('FEATURE_NOT_FOUND');
  });

  it('requires featureId or featureName', () => {
    const res = showFeature({});
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('FEATURE_NOT_FOUND');
  });

  it('rejects invalid occurrence for duplicate feature names', () => {
    // pUC19 features are unique-named, so occurrence 2 should fail
    const feature = pUC19.features[0];
    const res = showFeature({ featureName: feature.name, occurrence: 2 });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.error.code).toBe('INVALID_OCCURRENCE');
  });

  it('defaults to map view', () => {
    showFeature({ featureName: pUC19.features[0].name });
    expect(useWorkspaceStore.getState().activeView).toBe('map');
  });

  it('switches to sequence view when requested', () => {
    showFeature({ featureName: pUC19.features[0].name, view: 'sequence' });
    expect(useWorkspaceStore.getState().activeView).toBe('sequence');
  });
});
