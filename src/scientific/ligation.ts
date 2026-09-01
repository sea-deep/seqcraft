import type { DigestEnd } from '../domain/digest';
import { reverseComplementIupac } from './restriction-analysis';
import type { CloningJunction } from '../domain/cloning';

export function analyzeEndCompatibility(a: DigestEnd, b: DigestEnd): CloningJunction {
  if (a.type === 'natural' || a.type === 'circular' || b.type === 'natural' || b.type === 'circular') {
    return { leftEnd: a, rightEnd: b, isCompatible: false, compatibilityMode: 'incompatible' };
  }
  
  if (a.isAmbiguousChemistry || b.isAmbiguousChemistry) {
    return { leftEnd: a, rightEnd: b, isCompatible: false, compatibilityMode: 'ambiguous' };
  }

  if (a.type === 'blunt' && b.type === 'blunt') {
    return { leftEnd: a, rightEnd: b, isCompatible: true, compatibilityMode: 'blunt' };
  }

  if (a.type === "5' overhang" && b.type === "5' overhang") {
    if (a.sequence === reverseComplementIupac(b.sequence)) {
       return { leftEnd: a, rightEnd: b, isCompatible: true, compatibilityMode: 'sticky' };
    }
  }

  if (a.type === "3' overhang" && b.type === "3' overhang") {
    if (a.sequence === reverseComplementIupac(b.sequence)) {
       return { leftEnd: a, rightEnd: b, isCompatible: true, compatibilityMode: 'sticky' };
    }
  }

  return { leftEnd: a, rightEnd: b, isCompatible: false, compatibilityMode: 'incompatible' };
}

export function areDigestEndsCompatible(a: DigestEnd, b: DigestEnd): boolean {
  return analyzeEndCompatibility(a, b).isCompatible;
}
