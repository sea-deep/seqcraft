import genbankToJson from '@seqcraft/genbank-parser';
import type { SequenceDocument } from '../domain/document';
import type { Feature, SequenceInterval, FeatureType } from '../domain/feature';
import { ScientificSequence } from '../scientific/nucleotide';
import { generateId } from '../utils/id';
import { inferAlphabet } from '../scientific/alphabet';
import { type Alphabet } from 'nucleotide-sequence';

interface TeselagenLocation {
  start: number;
  end: number;
}

interface TeselagenFeature {
  name?: string;
  type?: string;
  strand?: number;
  locations?: TeselagenLocation[];
  start?: number;
  end?: number;
  notes?: Record<string, string[]>;
}

interface TeselagenParsedSequence {
  features?: TeselagenFeature[];
  name?: string;
  sequence?: string;
  circular?: boolean;
  isDNA?: boolean;
  isRNA?: boolean;
}

interface TeselagenResult {
  success: boolean;
  parsedSequence?: TeselagenParsedSequence;
}

function normalizeFeatureType(rawType?: string): FeatureType {
  const type = rawType?.toLowerCase() || 'misc_feature';
  switch (type) {
    case 'cds': return 'CDS';
    case 'gene': return 'gene';
    case 'promoter': return 'promoter';
    case 'terminator': return 'terminator';
    case 'rep_origin':
    case 'origin': return 'origin';
    case 'source': return 'source';
    default: return 'misc_feature';
  }
}

export function importGenBank(data: string, defaultName = 'GenBank Sequence'): SequenceDocument[] {
  const results = genbankToJson(data, { inclusive1BasedStart: false, inclusive1BasedEnd: false }) as TeselagenResult[];
  
  return results.map((result, idx) => {
    if (!result.success || !result.parsedSequence) {
      throw new Error(`Failed to parse GenBank record ${idx}`);
    }
    const parsed = result.parsedSequence;
    const seqString = parsed.sequence || '';
    const seqLength = seqString.length;
    
    let alphabet: Alphabet;
    try {
      alphabet = inferAlphabet(seqString);
    } catch (e) {
      throw new Error(`GenBank record ${idx} has invalid sequence geometry or characters: ${e}`, { cause: e });
    }
    
    if (alphabet === 'UNKNOWN') {
      if (parsed.isDNA) alphabet = 'DNA';
      if (parsed.isRNA) alphabet = 'RNA';
    }

    const docFeatures: Feature[] = (parsed.features || []).map((f) => {
      const segments: SequenceInterval[] = [];
      
      if (f.locations && f.locations.length > 0) {
        f.locations.forEach(loc => {
          if (loc.start > loc.end && parsed.circular) {
            // Origin spanning location in locations array
            segments.push({ start0: loc.start, end0Exclusive: seqLength });
            segments.push({ start0: 0, end0Exclusive: loc.end + 1 });
          } else {
            segments.push({ start0: loc.start, end0Exclusive: loc.end + 1 });
          }
        });
      } else if (f.start !== undefined && f.end !== undefined) {
        if (f.start > f.end && parsed.circular) {
           // Origin spanning main location
           segments.push({ start0: f.start, end0Exclusive: seqLength });
           segments.push({ start0: 0, end0Exclusive: f.end + 1 });
        } else {
           segments.push({ start0: f.start, end0Exclusive: f.end + 1 });
        }
      }

      const validSegments: SequenceInterval[] = [];
      for (const seg of segments) {
        if (seg.start0 >= 0 && seg.end0Exclusive <= seqLength && seg.start0 < seg.end0Exclusive) {
          validSegments.push(seg);
        }
      }

      const rawType = f.type || 'misc_feature';
      const normalizedType = normalizeFeatureType(rawType);
      const qualifiers = f.notes || {};
      
      if (normalizedType === 'misc_feature' && rawType !== 'misc_feature') {
        qualifiers['original_type'] = [rawType];
      }

      return {
        id: generateId(),
        name: f.name || 'Untitled Feature',
        type: normalizedType,
        strand: (f.strand === -1 ? -1 : 1) as 1 | -1,
        segments: validSegments,
        qualifiers,
        source: 'imported' as const
      };
    }).filter(f => f.segments.length > 0);

    return {
      id: generateId(),
      name: parsed.name || defaultName,
      topology: parsed.circular ? 'circular' : 'linear',
      sequence: new ScientificSequence(seqString, alphabet),
      length: seqString.length,
      storageMode: 'memory',
      alphabet,
      features: docFeatures,
      primers: [],
      source: 'genbank',
      version: 1
    };
  });
}
