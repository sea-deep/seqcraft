import genbankToJson from '@seqcraft/genbank-parser';
import type { SequenceDocument } from '../domain/document';
import type { Primer } from '../domain/primer';
import type { Feature, SequenceInterval } from '../domain/feature';
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

import { normalizeFeatureType } from '../domain/feature-ontology';

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
      let normalizedType = normalizeFeatureType(rawType);
      const qualifiers: Record<string, any> = {};

      if (f.notes) {
        for (const [k, v] of Object.entries(f.notes)) {
          const firstVal = Array.isArray(v) && v.length > 0 ? v[0] : (v as unknown);
          if (typeof firstVal === 'string' && /^\d+$/.test(firstVal.trim())) {
            qualifiers[k] = parseInt(firstVal.trim(), 10);
          } else {
            qualifiers[k] = v;
          }
        }
      }

      if (normalizedType === 'CDS' || normalizedType === 'gene') {
        const text = [
          f.name || '',
          ...Object.values(qualifiers).flat()
        ].join(' ').toLowerCase();

        if (
          text.includes('beta-lactamase') ||
          text.includes('ampicillin') ||
          text.includes('tetracycline') ||
          text.includes('kanamycin') ||
          text.includes('neomycin') ||
          text.includes('chloramphenicol') ||
          text.includes('puromycin') ||
          text.includes('resistance protein') ||
          text.includes('resistance gene')
        ) {
          normalizedType = 'resistance marker';
        } else if (
          text.includes('fluorescent') ||
          text.includes('gfp') ||
          text.includes('egfp') ||
          text.includes('mcherry') ||
          text.includes('rfp') ||
          text.includes('luciferase')
        ) {
          normalizedType = 'reporter';
        }
      }
      
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

    const importedPrimers: Primer[] = [];
    const rawPrimers = (parsed as any).primers || [];
    for (const p of rawPrimers) {
      const pNotes = p.notes || {};
      const pSeq = (Array.isArray(pNotes.sequence) ? pNotes.sequence[0] : pNotes.sequence) || '';
      const pName = (Array.isArray(pNotes.primer_name) ? pNotes.primer_name[0] : pNotes.primer_name) || p.name;
      const pDesc = (Array.isArray(pNotes.note) ? pNotes.note[0] : pNotes.note) || undefined;
      if (pSeq && /^[ACGTRYSWKMBDHVN]+$/i.test(pSeq)) {
        importedPrimers.push({
          id: generateId(),
          name: pName || 'Imported Primer',
          sequence: pSeq.toUpperCase(),
          description: typeof pDesc === 'string' ? pDesc : undefined
        });
      }
    }
    for (const f of docFeatures) {
      if (f.type === 'primer_bind') {
        const pSeq = (Array.isArray(f.qualifiers['sequence']) ? f.qualifiers['sequence'][0] : f.qualifiers['sequence']) || '';
        const pName = (Array.isArray(f.qualifiers['primer_name']) ? f.qualifiers['primer_name'][0] : f.qualifiers['primer_name']) || f.name;
        const pDesc = (Array.isArray(f.qualifiers['note']) ? f.qualifiers['note'][0] : f.qualifiers['note']) || undefined;
        if (pSeq && /^[ACGTRYSWKMBDHVN]+$/i.test(pSeq) && !importedPrimers.some(ip => ip.sequence === pSeq.toUpperCase())) {
          importedPrimers.push({
            id: generateId(),
            name: pName || 'Imported Primer',
            sequence: pSeq.toUpperCase(),
            description: typeof pDesc === 'string' ? pDesc : undefined
          });
        }
      }
    }

    return {
      id: generateId(),
      name: parsed.name || defaultName,
      topology: parsed.circular ? 'circular' : 'linear',
      sequence: new ScientificSequence(seqString, alphabet),
      length: seqString.length,
      storageMode: 'memory',
      alphabet,
      features: docFeatures,
      primers: importedPrimers,
      source: 'genbank',
      version: 1
    };
  });
}
