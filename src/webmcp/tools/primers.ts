import type { SeqCraftToolDefinition } from '../types';
import { createSuccess, createError, resolveToolContext } from '../types';
import { generateId } from '../../utils/id';
import { analyzePrimerProperties } from '../../scientific/primer-properties';
import { analyzePrimerBindings } from '../../scientific/primer-binding';
import { simulatePCR, analyzePrimerPairProperties } from '../../scientific/pcr';
import type { Primer } from '../../domain/primer';
import { getMemorySequence } from '../../utils/document-utils';

export const seqcraftListPrimersTool: SeqCraftToolDefinition = {
  name: 'seqcraft_list_primers',
  title: 'List Primers',
  description: 'List all custom oligonucleotides and primers configured for the target molecule, including their sequences, lengths, and binding positions.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses active document.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (input: { documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    const primers = (doc.primers || []).map(p => ({
      id: p.id,
      name: p.name,
      sequence: p.sequence,
      length: p.sequence.length,
      description: p.description
    }));

    return createSuccess({
      documentId: doc.id,
      primerCount: primers.length,
      primers
    });
  }
};

export const seqcraftMutatePrimerTool: SeqCraftToolDefinition = {
  name: 'seqcraft_mutate_primer',
  title: 'Mutate Primer',
  description: 'Create, auto-bind, update, or delete primers on the construct. Action "add_from_sequence" automatically validates the primer, finds binding loci on the template molecule, and attaches the primer to the document.',
  effectClass: 'annotation_mutation',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Target document ID. If omitted, uses active document.'
      },
      action: {
        type: 'string',
        enum: ['create', 'add_from_sequence', 'update', 'delete'],
        description: 'Primer mutation action.'
      },
      name: {
        type: 'string',
        description: 'Primer name/label (for create or add_from_sequence).'
      },
      sequence: {
        type: 'string',
        description: "5'->3' primer nucleotide sequence (for create or add_from_sequence)."
      },
      description: {
        type: 'string',
        description: 'Optional primer notes.'
      },
      primerId: {
        type: 'string',
        description: 'Existing primer ID (for update or delete).'
      },
      patch: {
        type: 'object',
        description: 'Update fields for update action.',
        properties: {
          name: { type: 'string' },
          sequence: { type: 'string' },
          description: { type: 'string' }
        },
        additionalProperties: false
      }
    },
    required: ['action'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: (
    input: {
      documentId?: string;
      action: 'create' | 'add_from_sequence' | 'update' | 'delete';
      name?: string;
      sequence?: string;
      description?: string;
      primerId?: string;
      patch?: {
        name?: string;
        sequence?: string;
        description?: string;
      };
    },
    rawCtx
  ) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    const revBefore = doc.version;

    if (input.action === 'create' || input.action === 'add_from_sequence') {
      const seq = (input.sequence || '').replace(/\s+/g, '').toUpperCase();
      if (!seq || !/^[ACGTRYSWKMBDHVN]+$/i.test(seq)) {
        return createError('INVALID_SEQUENCE', 'Valid IUPAC DNA primer sequence required.');
      }

      const primerId = generateId();
      const primerName = input.name?.trim() || `Primer ${(doc.primers?.length || 0) + 1}`;
      const newPrimer: Primer = {
        id: primerId,
        name: primerName,
        sequence: seq,
        description: input.description?.trim() || undefined
      };

      ctx.workspace.addPrimer(doc.id, newPrimer);
      const updatedDoc = ctx.workspace.documents.find(d => d.id === doc.id);

      let bindingContext: any = null;
      if (input.action === 'add_from_sequence') {
        const rawSeq = doc.sequence ? getMemorySequence(doc).raw : '';
        const bindings = analyzePrimerBindings(rawSeq, doc.topology, newPrimer);
        const props = analyzePrimerProperties(seq);
        bindingContext = {
          meltingTempC: props.meltingTemperature,
          gcContent: props.gcPercent,
          bindingSitesCount: bindings.length,
          bindingSites: bindings.map(b => ({
            start1: b.start0 + 1,
            end1: b.end0Exclusive,
            strand: b.orientation === 'reverse' ? '-' : '+'
          }))
        };
      }

      return createSuccess({
        status: 'applied',
        documentId: doc.id,
        createdPrimer: {
          id: newPrimer.id,
          name: newPrimer.name,
          sequence: newPrimer.sequence,
          length: newPrimer.sequence.length
        },
        bindingContext,
        revision: {
          before: revBefore,
          after: updatedDoc?.version || revBefore + 1
        }
      });
    }

    if (input.action === 'update') {
      const targetId = input.primerId;
      if (!targetId) {
        return createError('INVALID_INPUT', 'update action requires primerId');
      }

      const existing = (doc.primers || []).find(p => p.id === targetId);
      if (!existing) {
        return createError('PRIMER_NOT_FOUND', `Primer ID '${targetId}' not found on document.`);
      }

      const patch = input.patch || {};
      const updatedSeq = patch.sequence ? patch.sequence.replace(/\s+/g, '').toUpperCase() : existing.sequence;
      if (!/^[ACGTRYSWKMBDHVN]+$/i.test(updatedSeq)) {
        return createError('INVALID_SEQUENCE', 'Updated sequence must contain valid IUPAC DNA nucleotides.');
      }

      const updatedPrimer: Primer = {
        ...existing,
        name: patch.name?.trim() || existing.name,
        sequence: updatedSeq,
        description: patch.description !== undefined ? (patch.description.trim() || undefined) : existing.description
      };

      ctx.workspace.updatePrimer(doc.id, updatedPrimer);
      const updatedDoc = ctx.workspace.documents.find(d => d.id === doc.id);

      return createSuccess({
        status: 'applied',
        documentId: doc.id,
        updatedPrimer: {
          id: updatedPrimer.id,
          name: updatedPrimer.name,
          sequence: updatedPrimer.sequence,
          length: updatedPrimer.sequence.length
        },
        revision: {
          before: revBefore,
          after: updatedDoc?.version || revBefore + 1
        }
      });
    }

    if (input.action === 'delete') {
      const targetId = input.primerId;
      if (!targetId) {
        return createError('INVALID_INPUT', 'delete action requires primerId');
      }

      const existing = (doc.primers || []).find(p => p.id === targetId);
      if (!existing) {
        return createError('PRIMER_NOT_FOUND', `Primer ID '${targetId}' not found.`);
      }

      ctx.workspace.deletePrimer(doc.id, targetId);
      const updatedDoc = ctx.workspace.documents.find(d => d.id === doc.id);

      return createSuccess({
        status: 'applied',
        documentId: doc.id,
        deletedPrimerId: targetId,
        deletedPrimerName: existing.name,
        revision: {
          before: revBefore,
          after: updatedDoc?.version || revBefore + 1
        }
      });
    }

    return createError('INVALID_ACTION', `Action '${input.action}' not recognized.`);
  }
};

export const seqcraftAnalyzePrimerTool: SeqCraftToolDefinition = {
  name: 'seqcraft_analyze_primer',
  title: 'Analyze Primer',
  description: 'Compute thermodynamic properties (melting temperature Tm, GC content, molecular weight, extinction coefficient, self-dimerization, hairpin delta G) and identify binding loci on the template construct.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Template document ID. If omitted, uses active document.'
      },
      sequence: {
        type: 'string',
        description: "5'->3' primer sequence."
      },
      primerId: {
        type: 'string',
        description: 'Existing primer ID to analyze.'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (input: { sequence?: string; primerId?: string; documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    let seq = input.sequence ? input.sequence.replace(/\s+/g, '').toUpperCase() : '';
    if (!seq && input.primerId && doc) {
      const found = (doc.primers || []).find(p => p.id === input.primerId);
      if (found) seq = found.sequence;
    }

    if (!seq) {
      return createError('INVALID_INPUT', 'Must provide sequence or a valid primerId.');
    }

    const props = analyzePrimerProperties(seq);
    let bindings: any[] = [];
    if (doc) {
      const raw = doc.sequence ? getMemorySequence(doc).raw : '';
      const dummyPrimer: Primer = { id: 'temp', name: 'Temp', sequence: seq };
      bindings = analyzePrimerBindings(raw, doc.topology, dummyPrimer).map(b => ({
        start1: b.start0 + 1,
        end1: b.end0Exclusive,
        strand: b.orientation === 'reverse' ? '-' : '+',
        mismatches: 0
      }));
    }

    return createSuccess({
      sequence: seq,
      lengthBp: seq.length,
      meltingTemperatureC: props.meltingTemperature,
      meltingTemperature: props.meltingTemperature,
      gcContent: props.gcPercent,
      gcPercent: props.gcPercent,
      molecularWeightDa: props.molecularWeight,
      molecularWeight: props.molecularWeight,
      bindingCount: bindings.length,
      bindingSitesCount: bindings.length,
      bindings: bindings,
      bindingSites: bindings
    });
  }
};

export const seqcraftSimulatePcrTool: SeqCraftToolDefinition = {
  name: 'seqcraft_simulate_pcr',
  title: 'Simulate PCR',
  description: 'Simulate in silico PCR amplification on a template plasmid or linear DNA using two primers. Returns predicted amplicon products, length in base pairs, annealing temperatures, and primer dimer risks.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Template document ID. If omitted, uses active document.'
      },
      forwardPrimer: {
        type: 'string',
        description: 'Forward primer sequence or name.'
      },
      reversePrimer: {
        type: 'string',
        description: 'Reverse primer sequence or name.'
      }
    },
    required: [],
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (input: { forwardPrimer?: string; reversePrimer?: string; documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Template document not found.');
    }

    const fwdInput = input.forwardPrimer || (input as any).forwardPrimerSequence || '';
    const revInput = input.reversePrimer || (input as any).reversePrimerSequence || '';

    if (!fwdInput || !revInput) {
      return createError('INVALID_INPUT', 'Both forward and reverse primers are required.');
    }

    // Resolve primer sequences
    let fwdSeq = fwdInput.replace(/\s+/g, '').toUpperCase();
    let revSeq = revInput.replace(/\s+/g, '').toUpperCase();

    const fwdMatch = (doc.primers || []).find(p => p.name.toLowerCase() === fwdInput.toLowerCase() || p.id === fwdInput);
    if (fwdMatch) fwdSeq = fwdMatch.sequence;

    const revMatch = (doc.primers || []).find(p => p.name.toLowerCase() === revInput.toLowerCase() || p.id === revInput);
    if (revMatch) revSeq = revMatch.sequence;

    const fwdPrimerObj: Primer = { id: 'fwd', name: 'Forward', sequence: fwdSeq };
    const revPrimerObj: Primer = { id: 'rev', name: 'Reverse', sequence: revSeq };

    const raw = doc.sequence ? getMemorySequence(doc).raw : '';
    const pcrResult = simulatePCR({
      sequence: raw,
      topology: doc.topology,
      forwardPrimer: fwdPrimerObj,
      reversePrimer: revPrimerObj
    });
    const pairProps = analyzePrimerPairProperties(fwdSeq, revSeq);

    const formattedAmplicons = pcrResult.products.map((amp, idx) => ({
      productIndex: idx + 1,
      lengthBp: amp.lengthBp,
      start1: (amp.segments[0]?.start0 ?? 0) + 1,
      end1: amp.segments[0]?.end0Exclusive ?? amp.lengthBp,
      gcContent: Math.round(((amp.sequence.match(/[GCgc]/g) || []).length / amp.lengthBp) * 1000) / 10,
      spansOrigin: amp.wrapsOrigin
    }));

    return createSuccess({
      templateDocument: doc.name,
      productCount: formattedAmplicons.length,
      ampliconsCount: formattedAmplicons.length,
      products: formattedAmplicons,
      amplicons: formattedAmplicons,
      primerPairAnalysis: {
        forwardTmC: pairProps.forwardTm,
        reverseTmC: pairProps.reverseTm,
        tmDifferenceC: pairProps.tmDifference,
        forwardGcPercent: pairProps.forwardGcPercent,
        reverseGcPercent: pairProps.reverseGcPercent
      }
    });
  }
};

export const primerTools: SeqCraftToolDefinition[] = [
  seqcraftListPrimersTool,
  seqcraftMutatePrimerTool,
  seqcraftAnalyzePrimerTool,
  seqcraftSimulatePcrTool
];
