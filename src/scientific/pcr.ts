import type { Primer, PrimerBinding } from '../domain/primer';
import type { PCRResult, PCRProduct } from '../domain/pcr';
import type { SequenceInterval } from '../domain/feature';
import { analyzePrimerBindings, circularDistanceInDirection } from './primer-binding';
import { analyzePrimerProperties } from './primer-properties';
import { APP_LIMITS } from '../config/app-limits';

export interface PCRParams {
  sequence: string;
  topology: 'linear' | 'circular';
  forwardPrimer: Primer;
  reversePrimer: Primer;
}

export const MAX_PCR_PRODUCTS = APP_LIMITS.MAX_PCR_PRODUCTS;

export function simulatePCR(params: PCRParams): PCRResult {
  const { sequence, topology, forwardPrimer, reversePrimer } = params;
  const seqLen = sequence.length;

  const forwardPrimerBindings = analyzePrimerBindings(sequence, topology, forwardPrimer);
  const reversePrimerBindings = analyzePrimerBindings(sequence, topology, reversePrimer);

  const productsMap = new Map<string, PCRProduct>();
  let isCapped = false;

  outerLoop: for (const fwdBinding of forwardPrimerBindings) {
    for (const revBinding of reversePrimerBindings) {
      if (productsMap.size >= MAX_PCR_PRODUCTS) {
        isCapped = true;
        break outerLoop;
      }
      let plusBinding: PrimerBinding;
      let minusBinding: PrimerBinding;
      
      if (fwdBinding.extensionDirection === 1 && revBinding.extensionDirection === -1) {
        plusBinding = fwdBinding;
        minusBinding = revBinding;
      } else if (fwdBinding.extensionDirection === -1 && revBinding.extensionDirection === 1) {
        plusBinding = revBinding;
        minusBinding = fwdBinding;
      } else {
        continue;
      }

      const plus5 = plusBinding.fivePrimeBase0;
      const minus5 = minusBinding.fivePrimeBase0;
      
      let isValid = false;
      let lengthBp = 0;
      let segments: SequenceInterval[] = [];
      let wrapsOrigin = false;

      if (topology === 'linear') {
        // In linear DNA, the 5' end of the plus primer must be <= the 5' end of the minus primer.
        // Overlapping 3' ends (such as in overlap-extension PCR) are biologically valid.
        if (plus5 <= minus5) {
          isValid = true;
          lengthBp = minus5 - plus5 + 1;
          segments = [{ start0: plus5, end0Exclusive: minus5 + 1 }];
        }
      } else {
        // Circular
        isValid = true; // Any pair can theoretically span a circle in the +1 direction
        lengthBp = circularDistanceInDirection(plus5, minus5, 1, seqLen) + 1;
        
        const end0Exclusive = (minus5 + 1) % seqLen;
        
        if (plus5 < end0Exclusive) {
          segments = [{ start0: plus5, end0Exclusive }];
        } else if (plus5 === end0Exclusive) {
          // Spans the entire plasmid precisely? 
          // If lengthBp == seqLen, it's the whole thing.
          if (lengthBp === seqLen) {
            segments = [{ start0: 0, end0Exclusive: seqLen }];
            wrapsOrigin = true; // Technically wraps
          } else {
             // lengthBp is 0? not possible since circularDistanceInDirection >= 0, +1 makes it >= 1.
             segments = []; // should not happen
          }
        } else {
          segments = [
            { start0: plus5, end0Exclusive: seqLen },
            { start0: 0, end0Exclusive }
          ];
          wrapsOrigin = true;
        }
      }

      // Check if product contains both complete primer footprints
      // The product length must be >= the distance covered by both footprints.
      // Actually, if lengthBp < plusBinding.matchedReferenceSequence.length or < minusBinding.matchedReferenceSequence.length, it's invalid.
      // Moreover, the product must fully enclose both bindings. Since it starts exactly at plus5 and ends exactly at minus5, 
      // and plus extends in +1 direction (so its 3' is within the product), and minus extends in -1 (so its 3' is within the product).
      // The only way it doesn't contain the full footprint is if lengthBp is too short.
      // Wait, if minus5 is inside the plus footprint, the distance from plus5 to minus5 is less than the plus footprint length.
      // Example: plus=[10, 20), minus=[15, 25). plus5=10, minus5=24. length = 24 - 10 + 1 = 15.
      // Both footprints [10, 20) and [15, 25) are contained in [10, 25)? Yes, 25 is exclusive (24 + 1).
      // What if plus=[10, 20) and minus=[5, 15) in linear? plus5=10, minus5=14. length = 14 - 10 + 1 = 5.
      // Footprints are [10, 20) and [5, 15). Product is [10, 15). Does not contain full footprints!
      // So lengthBp must be >= max(plus footprint length, minus footprint length).
      // But also, both footprints must be subsets of the product.
      
      const containsFootprint = (productLen: number, plusLen: number, minusLen: number) => {
        // Since product starts at plus5 and ends at minus5, the product spans from plus5 to minus5 in the +1 direction.
        // The plus binding starts at plus5 and extends +plusLen. So it's contained if productLen >= plusLen.
        // The minus binding ends at minus5 and extends -minusLen (backwards). So it's contained if productLen >= minusLen.
        return productLen >= plusLen && productLen >= minusLen;
      };

      const pLen = plusBinding.matchedReferenceSequence.length;
      const mLen = minusBinding.matchedReferenceSequence.length;

      if (isValid && containsFootprint(lengthBp, pLen, mLen)) {
        // Valid PCR Product!
        // Extract sequence
        let productSeq = '';
        for (const seg of segments) {
          productSeq += sequence.slice(seg.start0, seg.end0Exclusive);
        }

        // Deduplication key
        const key = `${segments.map(s => `${s.start0}-${s.end0Exclusive}`).join(',')}_${plusBinding.primerId}_${minusBinding.primerId}`;
        
        if (!productsMap.has(key)) {
          productsMap.set(key, {
            id: `pcr_${productsMap.size + 1}`,
            forwardPrimerId: plusBinding.primerId,
            reversePrimerId: minusBinding.primerId,
            forwardBinding: plusBinding,
            reverseBinding: minusBinding,
            segments,
            lengthBp,
            sequence: productSeq,
            wrapsOrigin
          });
        }
      }
    }
  }

  const products = Array.from(productsMap.values());
  
  // Sort deterministically
  products.sort((a, b) => {
    if (a.lengthBp !== b.lengthBp) return a.lengthBp - b.lengthBp;
    const aStart = a.segments[0]?.start0 ?? 0;
    const bStart = b.segments[0]?.start0 ?? 0;
    if (aStart !== bStart) return aStart - bStart;
    if (a.forwardPrimerId !== b.forwardPrimerId) return a.forwardPrimerId.localeCompare(b.forwardPrimerId);
    return a.reversePrimerId.localeCompare(b.reversePrimerId);
  });

  // Re-assign IDs based on sorted order
  products.forEach((p, idx) => p.id = `pcr_${idx + 1}`);

  return {
    sequenceLength: seqLen,
    topology,
    forwardPrimerBindings,
    reversePrimerBindings,
    products,
    isCapped,
    warning: isCapped
      ? `Product enumeration capped at ${MAX_PCR_PRODUCTS} amplicons due to highly repetitive binding frequency.`
      : undefined
  };
}

export function getPCRProductCount(result: PCRResult): number {
  return result.products.length;
}

export function isUniquePCRProduct(result: PCRResult): boolean {
  return result.products.length === 1;
}

export function hasMultiplePCRProducts(result: PCRResult): boolean {
  return result.products.length > 1;
}

export function hasNoPCRProduct(result: PCRResult): boolean {
  return result.products.length === 0;
}

export function getShortestPCRProduct(result: PCRResult): PCRProduct | null {
  if (result.products.length === 0) return null;
  return result.products[0]; // Already sorted by length ascending
}

export function getLongestPCRProduct(result: PCRResult): PCRProduct | null {
  if (result.products.length === 0) return null;
  return result.products[result.products.length - 1];
}

export interface PrimerPairProperties {
  forwardTm: number;
  reverseTm: number;
  tmDifference: number;
  forwardGcPercent: number;
  reverseGcPercent: number;
}

export function analyzePrimerPairProperties(forwardSequence: string, reverseSequence: string): PrimerPairProperties {
  const fwd = analyzePrimerProperties(forwardSequence);
  const rev = analyzePrimerProperties(reverseSequence);
  return {
    forwardTm: fwd.meltingTemperature,
    reverseTm: rev.meltingTemperature,
    tmDifference: Math.abs(fwd.meltingTemperature - rev.meltingTemperature),
    forwardGcPercent: fwd.gcPercent,
    reverseGcPercent: rev.gcPercent
  };
}
