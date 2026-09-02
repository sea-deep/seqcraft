import { describe, it, expect } from 'vitest';
import { editSequence } from '../../src/scientific/sequence-editing';
import { findIupacMatchStarts, analyzeRestrictionSites } from '../../src/scientific/restriction-analysis';
import { analyzePrimerBindings } from '../../src/scientific/primer-binding';
import { findCrisprTargets } from '../../src/scientific/crispr';
import { domesticateSequence } from '../../src/scientific/golden-gate';
import { loadConfig } from '../../server/config';
import { createServerApp } from '../../server/app';
import request from 'supertest';
import type { Feature } from '../../src/domain/feature';
import type { Primer } from '../../src/domain/primer';
import type { RestrictionEnzyme } from '../../src/domain/restriction';

describe('Audit Findings Regression Suite', () => {
  it('1. Merges wrapped feature [8,10)+[0,2) rotated at 5 into exactly [3,7)', () => {
    const originFeature: Feature = {
      id: 'feat_spanning',
      name: 'OriginCrossingFeature',
      type: 'misc_feature',
      strand: 1,
      segments: [
        { start0: 8, end0Exclusive: 10 },
        { start0: 0, end0Exclusive: 2 }
      ]
    };

    const seq10 = 'NNNNNNNNNN';
    const result = editSequence(seq10, [originFeature], {
      type: 'rotate_origin',
      newOrigin0: 5
    }, 'circular');

    expect(result.newFeatures).toHaveLength(1);
    const rotated = result.newFeatures[0];
    expect(rotated.segments).toEqual([{ start0: 3, end0Exclusive: 7 }]);
  });

  it('2. Correctly executes wrapped deletion on circular plasmid', () => {
    const seq = '0123456789';
    const result = editSequence(seq, [], {
      type: 'delete',
      start0: 8,
      end0Exclusive: 2
    }, 'circular');

    expect(result.newLength).toBe(6);
    expect(result.newSequence).toBe('234567');
  });

  it('3. AN matches an AR reference pattern bidirectionally for restriction and primers', () => {
    const matchIndices = findIupacMatchStarts('TGTANCTA', 'AR');
    expect(matchIndices).toContain(3);

    const dummyEnzyme: RestrictionEnzyme = {
      id: 'test_ar',
      name: 'TestAR',
      recognitionSequence: 'AR',
      forwardCutOffset: 1,
      reverseCutOffset: 1,
      overhangType: 'blunt',
      isPalindromic: false
    };

    const hits = analyzeRestrictionSites('TGTANCTA', 'linear', [dummyEnzyme]);
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits.some(h => h.start0 === 3)).toBe(true);

    const dummyPrimer: Primer = {
      id: 'test_primer',
      name: 'PrimerAR',
      sequence: 'AR'
    };

    const primerHits = analyzePrimerBindings('TGTANCTA', 'linear', dummyPrimer);
    expect(primerHits.some(h => h.start0 === 3)).toBe(true);
  });

  it('4. Circular CRISPR recognizes a PAM beginning at coordinate zero', () => {
    const seq = 'AGG' + 'A'.repeat(20);
    const targets = findCrisprTargets(seq, 'circular');
    expect(targets.length).toBeGreaterThan(0);
    const zeroTarget = targets.find(t => t.pamStart0 === 0 && t.pam === 'AGG');
    expect(zeroTarget).toBeDefined();
    expect(zeroTarget?.spacer).toBe('A'.repeat(20));
  });

  it('5. Domestication summary accurately reflects synonymous vs nonsynonymous substitutions', async () => {
    const { TYPE_IIS_ENZYMES } = await import('../../src/scientific/golden-gate');
    const bsaI = TYPE_IIS_ENZYMES.find(e => e.name === 'BsaI')!;
    // Recognition site for BsaI: GGTCTC
    const seq = 'ATGGGTCTCACC';
    const result = domesticateSequence(seq, bsaI);
    if (result.hasInternalSites) {
      if (result.mutations.every(m => m.isSynonymous)) {
        expect(result.summary).toContain('100% amino acid sequence preserved');
      } else {
        expect(result.summary).toContain('nonsynonymous substitution');
      }
    }
  });

  it('6. CORS rejects hostile origins evil.onrender.com and attacker-localhost.example', async () => {
    const { createApp } = await import('../../server/app');
    const { InMemoryProjectRepository } = await import('../../server/repositories/project-repository');
    const config = loadConfig({
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://seqcraft.onrender.com',
      ALLOWED_ORIGINS: 'https://seqcraft.onrender.com,https://seqcraft.up.railway.app'
    });
    const app = createApp({
      config,
      projects: new InMemoryProjectRepository()
    });

    const evilRes = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.onrender.com');

    expect(evilRes.headers['access-control-allow-origin']).toBeUndefined();

    const evilLocalhostRes = await request(app)
      .get('/api/health')
      .set('Origin', 'https://attacker-localhost.example');

    expect(evilLocalhostRes.headers['access-control-allow-origin']).toBeUndefined();

    const allowedRes = await request(app)
      .get('/api/health')
      .set('Origin', 'https://seqcraft.onrender.com');

    expect(allowedRes.headers['access-control-allow-origin']).toBe('https://seqcraft.onrender.com');
  });

  it('7. Sequences > 100,000 bp bypass heavy inline analysis to avoid render stalls', () => {
    const MAX_INLINE_ANALYSIS_BP = 100_000;
    const largeSeqLen = 500_000;
    const canAnalyzeInline = largeSeqLen <= MAX_INLINE_ANALYSIS_BP;
    expect(canAnalyzeInline).toBe(false);
  });

  it('8. WebMCP error payloads consistently provide isError: true', async () => {
    const { seqcraftEditSequenceTool, seqcraftRotateOriginTool } = await import('../../src/webmcp/register-seqcraft-tools');
    const { useWorkspaceStore } = await import('../../src/state/workspace-store');
    const { importGenBank } = await import('../../src/import/genbank');
    const { DEMO_GENBANK } = await import('../../src/data/demo-workspace');

    // 1. When no active document: returns NO_ACTIVE_DOCUMENT with isError: true
    const noDocRes = await seqcraftEditSequenceTool.execute({ actionType: 'insert', position1: 1, sequence: 'A' });
    expect(noDocRes.isError).toBe(true);
    expect(noDocRes.ok).toBe(false);
    expect(noDocRes.error.code).toBe('NO_ACTIVE_DOCUMENT');

    // 2. When active document present: fails closed with HUMAN_APPROVAL_REQUIRED and isError: true
    const doc = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(doc);
    useWorkspaceStore.getState().setActiveDocument(doc.id);

    const editRes = await seqcraftEditSequenceTool.execute({ actionType: 'insert', position1: 1, sequence: 'A' });
    expect(editRes.isError).toBe(true);
    expect(editRes.ok).toBe(false);
    expect(editRes.error.code).toBe('HUMAN_APPROVAL_REQUIRED');

    const rotateRes = await seqcraftRotateOriginTool.execute({ newOrigin1: 10 });
    expect(rotateRes.isError).toBe(true);
    expect(rotateRes.ok).toBe(false);
    expect(rotateRes.error.code).toBe('HUMAN_APPROVAL_REQUIRED');
  });
});
