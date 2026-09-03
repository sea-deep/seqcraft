import { Seq, Translation } from 'nucleotide-sequence';
import type { SequenceDocument } from '../domain/document';
import type { SequenceEditAction, SequenceEditResult } from './sequence-editing';
import { reverseComplementIupac, analyzeRestrictionSites } from './restriction-analysis';
import { BUILTIN_ENZYMES } from '../data/restriction-enzymes';
import { TYPE_IIS_ENZYMES } from './golden-gate';
import type { RestrictionEnzyme } from '../domain/restriction';
import type { TransactionInvariantReport, CdsTranslationVerification, EnzymeSiteVerification } from '../domain/sequence-transaction';

const THREE_LETTER_AA: Record<string, string> = {
  A: 'Ala', R: 'Arg', N: 'Asn', D: 'Asp', C: 'Cys',
  E: 'Glu', Q: 'Gln', G: 'Gly', H: 'His', I: 'Ile',
  L: 'Leu', K: 'Lys', M: 'Met', F: 'Phe', P: 'Pro',
  S: 'Ser', T: 'Thr', W: 'Trp', Y: 'Tyr', V: 'Val',
  '*': 'Stop'
};

export function toThreeLetterAa(oneLetter: string): string {
  return Array.from(oneLetter).map(c => THREE_LETTER_AA[c.toUpperCase()] || c).join('-');
}

const ALL_ENZYMES: RestrictionEnzyme[] = [
  ...BUILTIN_ENZYMES,
  ...TYPE_IIS_ENZYMES.map(e => ({
    id: e.id,
    name: e.name,
    recognitionSequence: e.recognitionSequence,
    forwardCutOffset: e.recognitionSequence.length + e.topCutOffset,
    reverseCutOffset: e.recognitionSequence.length + e.bottomCutOffset
  }))
];

export function evaluateTransactionInvariants(
  document: SequenceDocument,
  action: SequenceEditAction,
  editResult: SequenceEditResult,
  targetEnzymeName = 'BsaI'
): TransactionInvariantReport {
  const rawBefore = document.sequence ? document.sequence.raw : '';
  const rawAfter = editResult.newSequence;
  const lengthBefore = document.length;
  const lengthAfter = editResult.newLength;
  const lengthDelta = lengthAfter - lengthBefore;
  const coordinatesStable = lengthDelta === 0;

  // Determine affected range
  let start0 = 0;
  let end0Exclusive = 0;
  let changedNucleotideCount = 0;
  let position1 = 1;
  let originalBase = '';
  let mutatedBase = '';

  if (action.type === 'replace') {
    start0 = action.start0;
    end0Exclusive = action.end0Exclusive;
    const origSlice = rawBefore.slice(start0, end0Exclusive);
    const newSlice = action.replacement;
    
    let diffCount = 0;
    let firstDiffOffset = -1;
    const maxLen = Math.max(origSlice.length, newSlice.length);
    for (let i = 0; i < maxLen; i++) {
      if (origSlice[i] !== newSlice[i]) {
        diffCount++;
        if (firstDiffOffset === -1) firstDiffOffset = i;
      }
    }
    changedNucleotideCount = diffCount;
    const primaryOffset = firstDiffOffset >= 0 ? firstDiffOffset : 0;
    position1 = start0 + primaryOffset + 1;
    originalBase = origSlice[primaryOffset] || '';
    mutatedBase = newSlice[primaryOffset] || '';
  } else if (action.type === 'insert') {
    start0 = action.index0;
    end0Exclusive = action.index0;
    changedNucleotideCount = action.sequence.length;
    position1 = action.index0 + 1;
    originalBase = '-';
    mutatedBase = action.sequence;
  } else if (action.type === 'delete') {
    start0 = action.start0;
    end0Exclusive = action.end0Exclusive;
    changedNucleotideCount = end0Exclusive - start0;
    position1 = start0 + 1;
    originalBase = rawBefore.slice(start0, end0Exclusive);
    mutatedBase = '-';
  } else {
    start0 = 0;
    end0Exclusive = rawBefore.length;
    position1 = 1;
  }

  // Find all affected features using segments
  const affectedFeatures = document.features.filter(f =>
    f.segments && f.segments.some(seg =>
      start0 === end0Exclusive
        ? seg.start0 <= start0 && start0 <= seg.end0Exclusive
        : Math.max(seg.start0, start0) < Math.min(seg.end0Exclusive, end0Exclusive)
    )
  );
  const affectedFeatureNames = affectedFeatures.map(f => f.name);

  // Evaluate CDS translation if any CDS is affected
  let cdsVerification: CdsTranslationVerification | undefined;
  const affectedCds = affectedFeatures.find(f => f.type === 'CDS');

  if (affectedCds && affectedCds.segments && affectedCds.segments.length > 0) {
    const seg = affectedCds.segments[0];
    const origCdsDna = rawBefore.slice(seg.start0, seg.end0Exclusive);
    const mutatedFeature = editResult.newFeatures.find(f => f.id === affectedCds.id);
    const mutatedSeg = mutatedFeature?.segments[0] || seg;
    const mutatedCdsDna = rawAfter.slice(mutatedSeg.start0, mutatedSeg.end0Exclusive);

    const dnaBefore = affectedCds.strand === -1 ? reverseComplementIupac(origCdsDna) : origCdsDna;
    const dnaAfter = affectedCds.strand === -1 ? reverseComplementIupac(mutatedCdsDna) : mutatedCdsDna;

    const fullAaBefore = dnaBefore.length >= 3 
      ? Translation.translate(new Seq('DNA').read(dnaBefore.slice(0, dnaBefore.length - (dnaBefore.length % 3))), 1)
      : '';
    const fullAaAfter = dnaAfter.length >= 3
      ? Translation.translate(new Seq('DNA').read(dnaAfter.slice(0, dnaAfter.length - (dnaAfter.length % 3))), 1)
      : '';

    const isSynonymous = fullAaBefore === fullAaAfter && fullAaBefore.length > 0;

    // Determine local codon context
    let codonBefore = '';
    let codonAfter = '';
    let aaBefore = '';
    let aaAfter = '';

    if (affectedCds.strand === 1) {
      const relPos = (position1 - 1) - seg.start0;
      if (relPos >= 0 && relPos < origCdsDna.length) {
        const codonStartRel = relPos - (relPos % 3);
        const windowLen = Math.min(6, origCdsDna.length - codonStartRel);
        codonBefore = origCdsDna.slice(codonStartRel, codonStartRel + windowLen);
        codonAfter = mutatedCdsDna.slice(codonStartRel, codonStartRel + windowLen);

        const aaIdx = Math.floor(codonStartRel / 3);
        const aaCount = Math.ceil(windowLen / 3);
        const aaSubBefore = fullAaBefore.slice(aaIdx, aaIdx + aaCount);
        const aaSubAfter = fullAaAfter.slice(aaIdx, aaIdx + aaCount);
        aaBefore = toThreeLetterAa(aaSubBefore);
        aaAfter = toThreeLetterAa(aaSubAfter);
      }
    } else {
      aaBefore = toThreeLetterAa(fullAaBefore.slice(0, 2));
      aaAfter = toThreeLetterAa(fullAaAfter.slice(0, 2));
    }

    cdsVerification = {
      featureId: affectedCds.id,
      featureName: affectedCds.name,
      strand: affectedCds.strand,
      codonBefore,
      codonAfter,
      aminoAcidBefore: aaBefore,
      aminoAcidAfter: aaAfter,
      isSynonymous,
      fullTranslationBefore: fullAaBefore,
      fullTranslationAfter: fullAaAfter
    };
  }

  // Evaluate restriction enzyme sites
  const sitesBefore = analyzeRestrictionSites(rawBefore, document.topology, ALL_ENZYMES)
    .filter(s => s.enzymeName.toLowerCase() === targetEnzymeName.toLowerCase());
  const sitesAfter = analyzeRestrictionSites(rawAfter, document.topology, ALL_ENZYMES)
    .filter(s => s.enzymeName.toLowerCase() === targetEnzymeName.toLowerCase());

  const countBefore = sitesBefore.length;
  const countAfter = sitesAfter.length;
  const abolished = countBefore > countAfter;

  const enzymeVerification: EnzymeSiteVerification = {
    enzymeName: targetEnzymeName,
    countBefore,
    countAfter,
    abolished
  };

  const passed = (cdsVerification ? cdsVerification.isSynonymous : true) && lengthDelta === 0;

  return {
    passed,
    position1,
    originalBase,
    mutatedBase,
    changedNucleotideCount,
    lengthBefore,
    lengthAfter,
    lengthDelta,
    coordinatesStable,
    affectedFeatureNames,
    cdsVerification,
    enzymeVerification,
    summary: `${changedNucleotideCount} nt modified at position ${position1}. ${cdsVerification?.isSynonymous ? 'Translation unchanged.' : ''} ${targetEnzymeName} sites: ${countBefore} → ${countAfter}.`
  };
}
