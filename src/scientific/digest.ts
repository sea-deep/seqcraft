import type { RestrictionSite } from './restriction-analysis';
import type { SequenceInterval } from '../domain/feature';
import type { DigestCut, DigestEnd, DigestFragment, DigestResult } from '../domain/digest';
import { deriveRestrictionCutEnds, createNaturalEnd } from './digest-ends';

export interface DigestParams {
  sequence: string;
  topology: 'linear' | 'circular';
  restrictionSites: RestrictionSite[];
  selectedEnzymeIds: string[];
}

export function simulateRestrictionDigest(params: DigestParams): DigestResult {
  const { sequence, topology, restrictionSites, selectedEnzymeIds } = params;
  const sequenceLength = sequence.length;

  const activeSites = restrictionSites.filter(site => selectedEnzymeIds.includes(site.enzymeId));
  
  // Normalize cuts
  const cutsMap = new Map<number, RestrictionSite[]>();
  for (const site of activeSites) {
    const coord = site.forwardCut0;
    if (!cutsMap.has(coord)) {
      cutsMap.set(coord, []);
    }
    cutsMap.get(coord)!.push(site);
  }

  const sortedCutCoords = Array.from(cutsMap.keys()).sort((a, b) => a - b);
  const cuts: DigestCut[] = sortedCutCoords.map(coord => ({
    coordinate0: coord,
    sites: cutsMap.get(coord)!
  }));

  const fragments: DigestFragment[] = [];

  const cutEndsMap = new Map<number, import('./digest-ends').CutEnds>();
  for (const cut of cuts) {
    cutEndsMap.set(cut.coordinate0, deriveRestrictionCutEnds(sequence, topology, cut));
  }

  const createEnd = (coord: number | null, isLeft: boolean): DigestEnd => {
    if (coord === null) {
      return createNaturalEnd(isLeft ? 'left' : 'right', topology);
    }
    const ends = cutEndsMap.get(coord)!;
    // isLeft means it is the left end of the current fragment, so it comes from the right side of the cut!
    if (isLeft) {
      return ends.rightFragmentEnd;
    } else {
      return ends.leftFragmentEnd;
    }
  };

  if (cuts.length === 0) {
    fragments.push({
      id: 'frag_1',
      lengthBp: sequenceLength,
      segments: [{ start0: 0, end0Exclusive: sequenceLength }],
      leftEnd: createEnd(null, true),
      rightEnd: createEnd(null, false),
      isCircular: topology === 'circular'
    });
  } else if (topology === 'linear') {
    let currentStart = 0;
    let fragId = 1;
    for (const cut of cuts) {
      const coord = cut.coordinate0;
      fragments.push({
        id: `frag_${fragId++}`,
        lengthBp: coord - currentStart,
        segments: [{ start0: currentStart, end0Exclusive: coord }],
        leftEnd: createEnd(currentStart === 0 ? null : currentStart, true),
        rightEnd: createEnd(coord, false),
        isCircular: false
      });
      currentStart = coord;
    }
    // Final fragment
    fragments.push({
      id: `frag_${fragId}`,
      lengthBp: sequenceLength - currentStart,
      segments: [{ start0: currentStart, end0Exclusive: sequenceLength }],
      leftEnd: createEnd(currentStart, true),
      rightEnd: createEnd(null, false),
      isCircular: false
    });
  } else {
    // Circular
    let fragId = 1;
    if (cuts.length === 1) {
      const coord = cuts[0].coordinate0;
      fragments.push({
        id: `frag_${fragId}`,
        lengthBp: sequenceLength,
        segments: [
          { start0: coord, end0Exclusive: sequenceLength },
          { start0: 0, end0Exclusive: coord }
        ].filter(s => s.start0 !== s.end0Exclusive),
        leftEnd: createEnd(coord, true),
        rightEnd: createEnd(coord, false),
        isCircular: false
      });
    } else {
      for (let i = 0; i < cuts.length; i++) {
        const startCut = cuts[i].coordinate0;
        const nextCut = cuts[(i + 1) % cuts.length].coordinate0;
        
        let segments: SequenceInterval[];
        let lengthBp: number;
        if (nextCut > startCut) {
          segments = [{ start0: startCut, end0Exclusive: nextCut }];
          lengthBp = nextCut - startCut;
        } else {
          segments = [
            { start0: startCut, end0Exclusive: sequenceLength },
            { start0: 0, end0Exclusive: nextCut }
          ];
          lengthBp = (sequenceLength - startCut) + nextCut;
        }
        
        fragments.push({
          id: `frag_${fragId++}`,
          lengthBp,
          segments: segments.filter(s => s.start0 !== s.end0Exclusive),
          leftEnd: createEnd(startCut, true),
          rightEnd: createEnd(nextCut, false),
          isCircular: false
        });
      }
    }
  }

  return {
    sequenceLength,
    topology,
    selectedEnzymeIds,
    cuts,
    fragments
  };
}

export function getFragmentLengths(result: DigestResult): number[] {
  return result.fragments.map(f => f.lengthBp);
}

export function sortFragmentsByLength(result: DigestResult): DigestFragment[] {
  return [...result.fragments].sort((a, b) => b.lengthBp - a.lengthBp);
}

export function getFragmentCount(result: DigestResult): number {
  return result.fragments.length;
}

export function getCutCount(result: DigestResult): number {
  return result.cuts.length;
}

export function getCuttingEnzymeIds(result: DigestResult): string[] {
  const ids = new Set<string>();
  for (const cut of result.cuts) {
    for (const site of cut.sites) {
      ids.add(site.enzymeId);
    }
  }
  return Array.from(ids);
}

export function getZeroSiteEnzymeIds(result: DigestResult): string[] {
  const cutting = new Set(getCuttingEnzymeIds(result));
  return result.selectedEnzymeIds.filter(id => !cutting.has(id));
}
