/**
 * pUC19 EcoRI + HindIII coordinate-parity regression test.
 *
 * Establishes the canonical cleavage coordinate display convention:
 *
 *   forwardCut0 and reverseCut0 are INTERBASE positions computed as:
 *     start0 + cutOffset
 *
 *   cutOffset is 1-based: EcoRI forwardCutOffset=1 means "cut after the 1st base
 *   of the recognition site".  For a site at start0=0: forwardCut0 = 0 + 1 = 1.
 *
 *   EcoRI: G↓AATTC  →  forwardCut at interbase 1 (after G)
 *          CTTAA↑G  →  reverseCut at interbase 5 (after A on bottom strand)
 *
 *   The interbase value N means "the phosphodiester bond after the Nth nucleotide
 *   (1-based)".  Therefore forwardCut0 IS the 1-based display coordinate.
 *
 *   Canonical display rule:
 *     forwardCut_display = forwardCut0    (NOT forwardCut0 + 1)
 *     reverseCut_display = reverseCut0    (NOT reverseCut0 + 1)
 *
 *   Nucleotide positions use the standard conversion:
 *     display = internal0 + 1
 *
 *   end0Exclusive uses the half-open → inclusive identity:
 *     display_end = end0Exclusive   (already 1-based inclusive equivalent)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { analyzeRestrictionSites } from '../../src/scientific/restriction-analysis';
import { BUILTIN_ENZYMES } from '../../src/data/restriction-enzymes';
import { importGenBank } from '../../src/import/genbank';
import { DEMO_GENBANK } from '../../src/data/demo-workspace';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import { showRestrictionSite } from '../../src/application/navigation';
import {
  seqcraftAnalyzeRestrictionSitesTool,
  seqcraftShowRestrictionSiteTool,
} from '../../src/webmcp/register-seqcraft-tools';
import type { SequenceDocument } from '../../src/domain/document';

describe('pUC19 restriction coordinate parity', () => {
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

  // ─── EcoRI ──────────────────────────────────────────────

  describe('EcoRI', () => {
    it('raw RestrictionSite has correct 0-based coordinates', () => {
      const enzyme = BUILTIN_ENZYMES.find(e => e.name === 'EcoRI')!;
      const sites = analyzeRestrictionSites(pUC19.sequence.raw, pUC19.topology, [enzyme]);
      expect(sites.length).toBe(1);

      const s = sites[0];
      // Recognition site: GAATTC at 0-based position 395
      expect(s.start0).toBe(395);
      expect(s.end0Exclusive).toBe(401); // 395 + 6
      expect(s.recognitionSequence).toBe('GAATTC');

      // Interbase cleavage positions
      // G↓AATTC  → forwardCut after base 396 (1-based) = interbase 396
      expect(s.forwardCut0).toBe(396);
      // CTTAA↑G  → reverseCut after base 400 (1-based) = interbase 400
      expect(s.reverseCut0).toBe(400);
    });

    it('navigation command returns correct display coordinates', () => {
      const res = showRestrictionSite({ enzymeName: 'EcoRI', view: 'map' });
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      // Nucleotide positions: +1 conversion
      expect(res.result.start1).toBe(396);      // 395 + 1
      expect(res.result.end1).toBe(401);         // end0Exclusive = 401

      // Cleavage positions: interbase = already 1-based display
      expect(res.result.forwardCut1).toBe(396);  // NOT 397
      expect(res.result.reverseCut1).toBe(400);  // NOT 401
    });

    it('WebMCP analyze tool returns correct display coordinates', async () => {
      const res = await seqcraftAnalyzeRestrictionSitesTool.execute({ enzymeNames: ['EcoRI'] });
      expect(res.ok).toBe(true);
      const site = res.result.sites[0];

      expect(site.start1).toBe(396);
      expect(site.end1).toBe(401);
      expect(site.forwardCut1).toBe(396);  // NOT 397
      expect(site.reverseCut1).toBe(400);  // NOT 401
      expect(site.endType).toBe("5' overhang");
    });

    it('WebMCP show_restriction_site tool returns correct display coordinates', async () => {
      const res = await seqcraftShowRestrictionSiteTool.execute({
        enzymeName: 'EcoRI',
        occurrence: 1,
        view: 'map',
      });
      expect(res.ok).toBe(true);
      expect(res.result.forwardCut1).toBe(396);
      expect(res.result.reverseCut1).toBe(400);
      expect(res.result.selectedRestrictionSiteId).toBe('ecori-395-1');
    });

    it('all output layers agree', async () => {
      // Scientific engine
      const enzyme = BUILTIN_ENZYMES.find(e => e.name === 'EcoRI')!;
      const sites = analyzeRestrictionSites(pUC19.sequence.raw, pUC19.topology, [enzyme]);
      const s = sites[0];

      // Navigation
      const navRes = showRestrictionSite({ enzymeName: 'EcoRI' });
      expect(navRes.ok).toBe(true);
      if (!navRes.ok) return;

      // WebMCP
      const webRes = await seqcraftAnalyzeRestrictionSitesTool.execute({ enzymeNames: ['EcoRI'] });
      const ws = webRes.result.sites[0];

      // All three layers must agree
      expect(navRes.result.forwardCut1).toBe(s.forwardCut0);
      expect(navRes.result.reverseCut1).toBe(s.reverseCut0);
      expect(ws.forwardCut1).toBe(s.forwardCut0);
      expect(ws.reverseCut1).toBe(s.reverseCut0);
    });
  });

  // ─── HindIII ────────────────────────────────────────────

  describe('HindIII', () => {
    it('raw RestrictionSite has correct 0-based coordinates', () => {
      const enzyme = BUILTIN_ENZYMES.find(e => e.name === 'HindIII')!;
      const sites = analyzeRestrictionSites(pUC19.sequence.raw, pUC19.topology, [enzyme]);
      expect(sites.length).toBe(1);

      const s = sites[0];
      // Recognition site: AAGCTT at 0-based position 446
      expect(s.start0).toBe(446);
      expect(s.end0Exclusive).toBe(452); // 446 + 6
      expect(s.recognitionSequence).toBe('AAGCTT');

      // HindIII: A↓AGCTT  → forwardCut after base 447 (1-based) = interbase 447
      expect(s.forwardCut0).toBe(447);
      // TTCGA↑A  → reverseCut after base 451 (1-based) = interbase 451
      expect(s.reverseCut0).toBe(451);
    });

    it('navigation command returns correct display coordinates', () => {
      const res = showRestrictionSite({ enzymeName: 'HindIII', view: 'map' });
      expect(res.ok).toBe(true);
      if (!res.ok) return;

      expect(res.result.start1).toBe(447);       // 446 + 1
      expect(res.result.end1).toBe(452);          // end0Exclusive
      expect(res.result.forwardCut1).toBe(447);   // NOT 448
      expect(res.result.reverseCut1).toBe(451);   // NOT 452
    });

    it('WebMCP analyze tool returns correct display coordinates', async () => {
      const res = await seqcraftAnalyzeRestrictionSitesTool.execute({ enzymeNames: ['HindIII'] });
      expect(res.ok).toBe(true);
      const site = res.result.sites[0];

      expect(site.start1).toBe(447);
      expect(site.end1).toBe(452);
      expect(site.forwardCut1).toBe(447);
      expect(site.reverseCut1).toBe(451);
      expect(site.endType).toBe("5' overhang");
    });
  });
});
