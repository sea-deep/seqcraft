import type { SeqCraftToolDefinition } from '../types';
import { createSuccess, createError, resolveToolContext } from '../types';
import { generateId } from '../../utils/id';
import { showFeature } from '../../application/navigation';
import { detectKnownFeatures } from '../../scientific/known-feature-detection';
import { FEATURE_TYPES, type Feature, type FeatureType, type SequenceInterval } from '../../domain/feature';
import { normalizeFeatureType, getFeatureTypeMetadata } from '../../domain/feature-ontology';
import { getMemorySequence } from '../../utils/document-utils';

function selectionToFeatureSegments(start0: number, end0Exclusive: number, docLen: number): SequenceInterval[] {
  if (end0Exclusive >= start0) return [{ start0, end0Exclusive }];
  return [
    { start0, end0Exclusive: docLen },
    { start0: 0, end0Exclusive }
  ];
}

export const seqcraftListFeaturesTool: SeqCraftToolDefinition = {
  name: 'seqcraft_list_features',
  title: 'List Features',
  description: 'List all annotated biological features (CDS, promoters, genes, origins, resistance markers, tags) on the target construct with their coordinates [start1, end1], strand (+/-), type, and qualifiers.',
  effectClass: 'read',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, lists features for active document.'
      },
      type: {
        type: 'string',
        description: 'Optional filter by feature type (e.g. CDS, promoter, gene, origin).'
      }
    },
    additionalProperties: false
  },
  annotations: { readOnlyHint: true, untrustedContentHint: false },
  execute: (input: { documentId?: string; type?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    let feats = doc.features;
    if (input.type) {
      feats = feats.filter(f => f.type.toLowerCase() === input.type!.toLowerCase());
    }

    const formatted = feats.map(f => {
      const seg0 = f.segments[0];
      const meta = getFeatureTypeMetadata(f.type);
      return {
        id: f.id,
        name: f.name,
        type: f.type,
        label: meta.label,
        category: meta.category,
        strand: f.strand === -1 ? '-' : '+',
        start1: seg0 ? seg0.start0 + 1 : 1,
        end1: seg0 ? seg0.end0Exclusive : 1,
        segmentCount: f.segments.length,
        qualifiers: f.qualifiers || {}
      };
    });

    return createSuccess({
      documentId: doc.id,
      featureCount: formatted.length,
      features: formatted
    });
  }
};

export const seqcraftShowFeatureTool: SeqCraftToolDefinition = {
  name: 'seqcraft_show_feature',
  title: 'Show Feature',
  description: 'Highlight and focus a specific feature on the canvas / editor view and reveal its properties in the inspector panel.',
  effectClass: 'navigation',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses active document.'
      },
      featureId: {
        type: 'string',
        description: 'Unique identifier of the feature to display.'
      }
    },
    required: ['featureId'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: (input: { featureId: string; documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    const nameQuery = (input as any).featureName || (input as any).name || (input as any).label;
    let feat = input.featureId ? doc.features.find(f => f.id === input.featureId) : undefined;
    if (!feat && nameQuery) {
      feat = doc.features.find(f => f.name.toLowerCase() === nameQuery.toLowerCase())
        || doc.features.find(f => f.name.toLowerCase().includes(nameQuery.toLowerCase()));
    }

    if (!feat) {
      return createError('FEATURE_NOT_FOUND', `Feature '${nameQuery || input.featureId}' not found on document '${doc.name}'.`);
    }

    const prefView = (input as any).view || (input as any).preferredView;
    if (prefView && (prefView === 'map' || prefView === 'sequence')) {
      ctx.workspace.setActiveView(prefView);
    }

    showFeature({ featureId: feat.id, view: prefView });
    ctx.workspace.selectFeature(feat.id);

    return createSuccess({
      status: 'applied',
      documentId: doc.id,
      selectedFeatureId: feat.id,
      id: feat.id,
      name: feat.name,
      type: feat.type,
      start1: feat.segments?.[0] ? feat.segments[0].start0 + 1 : 1,
      end1: feat.segments?.[0] ? feat.segments[0].end0Exclusive : 1,
      activeView: ctx.workspace.activeView,
      feature: {
        id: feat.id,
        name: feat.name,
        type: feat.type
      }
    });
  }
};

export const seqcraftMutateFeatureTool: SeqCraftToolDefinition = {
  name: 'seqcraft_mutate_feature',
  title: 'Mutate Feature',
  description: 'Create, update, delete, or batch-create biological annotations on the active or specified construct using 1-based closed coordinates [start1, end1]. Immediately updates document annotations and records revision provenance.',
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
        enum: ['create', 'update', 'delete', 'batch_create'],
        description: 'Annotation mutation action to perform.'
      },
      feature: {
        type: 'object',
        description: 'Single feature input for create or update action.',
        properties: {
          id: { type: 'string', description: 'Feature ID (required for update).' },
          name: { type: 'string', description: 'Annotation name / label.' },
          type: { type: 'string', enum: FEATURE_TYPES, description: 'Biological feature type.' },
          start1: { type: 'integer', minimum: 1, description: '1-based inclusive start coordinate.' },
          end1: { type: 'integer', minimum: 1, description: '1-based inclusive end coordinate.' },
          strand: { type: 'string', enum: ['+', '-'], description: "Strand orientation (+ for forward 5'->3', - for reverse complement)." },
          qualifiers: { type: 'object', description: 'Additional GenBank qualifiers (e.g. note, gene, product).' }
        },
        additionalProperties: false
      },
      features: {
        type: 'array',
        description: 'Array of feature inputs for batch_create action.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string', enum: FEATURE_TYPES },
            start1: { type: 'integer', minimum: 1 },
            end1: { type: 'integer', minimum: 1 },
            strand: { type: 'string', enum: ['+', '-'] },
            qualifiers: { type: 'object' }
          },
          required: ['type', 'start1', 'end1'],
          additionalProperties: false
        }
      },
      featureId: {
        type: 'string',
        description: 'Feature ID to delete (for delete action).'
      }
    },
    required: ['action'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: (
    input: {
      documentId?: string;
      action: 'create' | 'update' | 'delete' | 'batch_create';
      feature?: {
        id?: string;
        name?: string;
        type?: FeatureType;
        start1?: number;
        end1?: number;
        strand?: '+' | '-';
        qualifiers?: Record<string, string | string[]>;
      };
      features?: Array<{
        name?: string;
        type: FeatureType;
        start1: number;
        end1: number;
        strand?: '+' | '-';
        qualifiers?: Record<string, string | string[]>;
      }>;
      featureId?: string;
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

    if (input.action === 'create') {
      const f = input.feature;
      if (!f || f.start1 == null || f.end1 == null) {
        return createError('INVALID_INPUT', 'create action requires feature { start1, end1, type, name? }');
      }
      const featId = generateId();
      const segs = selectionToFeatureSegments(f.start1 - 1, f.end1, doc.length);
      const newFeat: Feature = {
        id: featId,
        name: f.name?.trim() || `${f.type || 'misc_feature'} ${f.start1}..${f.end1}`,
        type: normalizeFeatureType(f.type || 'misc_feature'),
        strand: f.strand === '-' ? -1 : 1,
        segments: segs,
        qualifiers: f.qualifiers || {},
        source: 'manual'
      };

      ctx.workspace.addFeature(doc.id, newFeat);
      const updatedDoc = ctx.workspace.documents.find(d => d.id === doc.id);

      return createSuccess({
        status: 'applied',
        documentId: doc.id,
        createdFeature: {
          id: newFeat.id,
          name: newFeat.name,
          type: newFeat.type,
          start1: f.start1,
          end1: f.end1,
          strand: f.strand || '+'
        },
        revision: {
          before: revBefore,
          after: updatedDoc?.version || revBefore + 1
        }
      });
    }

    if (input.action === 'update') {
      const f = input.feature;
      const targetId = f?.id || input.featureId;
      if (!targetId) {
        return createError('INVALID_INPUT', 'update action requires feature.id or featureId');
      }

      const existing = doc.features.find(item => item.id === targetId);
      if (!existing) {
        return createError('FEATURE_NOT_FOUND', `Feature ID '${targetId}' not found on document '${doc.name}'.`);
      }

      let segs = existing.segments;
      if (f?.start1 != null && f?.end1 != null) {
        segs = selectionToFeatureSegments(f.start1 - 1, f.end1, doc.length);
      }

      const updatedFeat: Feature = {
        ...existing,
        name: f?.name?.trim() || existing.name,
        type: f?.type ? normalizeFeatureType(f.type) : existing.type,
        strand: f?.strand ? (f.strand === '-' ? -1 : 1) : existing.strand,
        segments: segs,
        qualifiers: f?.qualifiers ? { ...(existing.qualifiers || {}), ...f.qualifiers } : existing.qualifiers
      };

      ctx.workspace.updateFeature(doc.id, updatedFeat);
      const updatedDoc = ctx.workspace.documents.find(d => d.id === doc.id);

      return createSuccess({
        status: 'applied',
        documentId: doc.id,
        updatedFeature: {
          id: updatedFeat.id,
          name: updatedFeat.name,
          type: updatedFeat.type,
          strand: updatedFeat.strand === -1 ? '-' : '+'
        },
        revision: {
          before: revBefore,
          after: updatedDoc?.version || revBefore + 1
        }
      });
    }

    if (input.action === 'delete') {
      const targetId = input.featureId || input.feature?.id;
      if (!targetId) {
        return createError('INVALID_INPUT', 'delete action requires featureId parameter');
      }
      const existing = doc.features.find(item => item.id === targetId);
      if (!existing) {
        return createError('FEATURE_NOT_FOUND', `Feature ID '${targetId}' not found.`);
      }

      ctx.workspace.deleteFeature(doc.id, targetId);
      const updatedDoc = ctx.workspace.documents.find(d => d.id === doc.id);

      return createSuccess({
        status: 'applied',
        documentId: doc.id,
        deletedFeatureId: targetId,
        deletedFeatureName: existing.name,
        revision: {
          before: revBefore,
          after: updatedDoc?.version || revBefore + 1
        }
      });
    }

    if (input.action === 'batch_create') {
      if (!input.features || input.features.length === 0) {
        return createError('INVALID_INPUT', 'batch_create action requires features array');
      }

      const created: any[] = [];
      for (const f of input.features) {
        const featId = generateId();
        const segs = selectionToFeatureSegments(f.start1 - 1, f.end1, doc.length);
        const newFeat: Feature = {
          id: featId,
          name: f.name?.trim() || `${f.type} ${f.start1}..${f.end1}`,
          type: normalizeFeatureType(f.type),
          strand: f.strand === '-' ? -1 : 1,
          segments: segs,
          qualifiers: f.qualifiers || {},
          source: 'manual'
        };
        ctx.workspace.addFeature(doc.id, newFeat);
        created.push({
          id: newFeat.id,
          name: newFeat.name,
          type: newFeat.type,
          start1: f.start1,
          end1: f.end1,
          strand: f.strand || '+'
        });
      }

      const updatedDoc = ctx.workspace.documents.find(d => d.id === doc.id);

      return createSuccess({
        status: 'applied',
        documentId: doc.id,
        createdCount: created.length,
        createdFeatures: created,
        revision: {
          before: revBefore,
          after: updatedDoc?.version || revBefore + 1
        }
      });
    }

    return createError('INVALID_ACTION', `Action '${input.action}' not recognized.`);
  }
};

export const seqcraftDetectKnownFeaturesTool: SeqCraftToolDefinition = {
  name: 'seqcraft_detect_known_features',
  title: 'Detect Known Features',
  description: 'Scan the active or specified sequence against SeqCraft built-in curated biological feature library (promoters, origins, antibiotic resistance markers, reporters, tags). Returns identified matches with positions and confidence.',
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

    const raw = doc.sequence ? getMemorySequence(doc).raw : '';
    const matches = detectKnownFeatures(raw, doc.topology);
    const formatted = matches.map(m => ({
      name: m.name,
      type: m.type,
      start1: m.segments[0] ? m.segments[0].start0 + 1 : 1,
      end1: m.segments[0] ? m.segments[0].end0Exclusive : m.lengthBp,
      strand: m.strand === -1 ? '-' : '+',
      description: m.description,
      lengthBp: m.lengthBp
    }));

    return createSuccess({
      documentId: doc.id,
      matchesCount: formatted.length,
      matches: formatted
    });
  }
};

export const seqcraftProposeAnnotationTool: SeqCraftToolDefinition = {
  name: 'seqcraft_propose_annotation',
  title: 'Propose Annotation',
  description: 'Automatically detect and apply a known annotation match from the built-in database to the molecule.',
  effectClass: 'annotation_mutation',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses active document.'
      },
      matchIndex: {
        type: 'integer',
        minimum: 0,
        description: '0-based index of the detected feature match to apply.'
      }
    },
    required: ['matchIndex'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: (input: { documentId?: string; matchIndex: number }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', 'Target document not found.');
    }

    const raw = doc.sequence ? getMemorySequence(doc).raw : '';
    const matches = detectKnownFeatures(raw, doc.topology);
    if (input.matchIndex < 0 || input.matchIndex >= matches.length) {
      return createError('INVALID_INDEX', `Match index ${input.matchIndex} out of bounds (found ${matches.length} matches).`);
    }

    const match = matches[input.matchIndex];
    const newFeat: Feature = {
      id: generateId(),
      name: match.name,
      type: match.type as FeatureType,
      strand: match.strand,
      segments: match.segments,
      qualifiers: { note: match.description },
      source: 'detected'
    };

    ctx.workspace.addFeature(doc.id, newFeat);
    const updatedDoc = ctx.workspace.documents.find(d => d.id === doc.id);

    return createSuccess({
      status: 'applied',
      documentId: doc.id,
      feature: {
        id: newFeat.id,
        name: newFeat.name,
        type: newFeat.type,
        start1: match.segments[0] ? match.segments[0].start0 + 1 : 1,
        end1: match.segments[0] ? match.segments[0].end0Exclusive : match.lengthBp,
        strand: match.strand === -1 ? '-' : '+'
      },
      revision: {
        before: doc.version,
        after: updatedDoc?.version || doc.version + 1
      }
    });
  }
};

export const featureTools: SeqCraftToolDefinition[] = [
  seqcraftListFeaturesTool,
  seqcraftShowFeatureTool,
  seqcraftMutateFeatureTool,
  seqcraftDetectKnownFeaturesTool,
  seqcraftProposeAnnotationTool
];
