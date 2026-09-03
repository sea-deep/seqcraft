import { Seq, Translation } from 'nucleotide-sequence';
import type { SequenceInterval } from '../domain/feature';
import { generateId } from '../utils/id';

export interface OpenReadingFrame {
  id: string;
  protein: string;
  segments: SequenceInterval[];
  strand: 1 | -1;
  frame: 1 | 2 | 3 | -1 | -2 | -3;
  lengthBp: number;
}

export function findORFs(sequence: string, topology: 'linear' | 'circular', minCodons: number = 30): OpenReadingFrame[] {
  const length = sequence.length;
  if (length === 0) return [];

  // For circular sequences, we append length - 1 bases to allow origin-spanning ORFs to be found
  const searchSeqStr = topology === 'circular' ? sequence + sequence.slice(0, length - 1) : sequence;
  const seqObj = new Seq('DNA').read(searchSeqStr);

  const rawOrfs = Translation.findOpenReadingFrames(seqObj, minCodons);
  
  // Deduplicate nested ORFs in the same reading frame sharing the same stop codon.
  // In molecular biology, an Open Reading Frame is defined by the longest coding sequence up to a given stop codon.
  const longestByStop = new Map<string, typeof rawOrfs[number]>();
  for (const raw of rawOrfs) {
    if (raw.start >= length) continue; // Duplicate ORF found in the wrapped region
    const key = `${raw.strand}_${raw.frame}_${raw.end}`;
    const existing = longestByStop.get(key);
    if (!existing || (raw.end - raw.start) > (existing.end - existing.start)) {
      longestByStop.set(key, raw);
    }
  }

  const results: OpenReadingFrame[] = [];
  for (const raw of longestByStop.values()) {
    let segments: SequenceInterval[];
    if (raw.end > length) {
      if (topology === 'linear') continue; // Should never happen unless bug in library
      segments = [
        { start0: raw.start, end0Exclusive: length },
        { start0: 0, end0Exclusive: raw.end - length }
      ];
    } else {
      segments = [{ start0: raw.start, end0Exclusive: raw.end }];
    }
    
    results.push({
      id: generateId(),
      protein: raw.protein,
      segments,
      strand: raw.strand === '+' ? 1 : -1,
      frame: raw.frame as 1 | 2 | 3 | -1 | -2 | -3,
      lengthBp: raw.end - raw.start
    });
  }
  
  return results;
}
