import type { SeqCraftToolDefinition } from '../types';
import { createSuccess, createError, resolveToolContext } from '../types';
import { focusSequenceRegion } from '../../application/navigation';
import type { WorkspaceView } from '../../state/workspace-store';

const VALID_VIEWS: WorkspaceView[] = ['map', 'sequence', 'features', 'primers', 'enzymes', 'history', 'compare'];

export const seqcraftSetActiveDocumentTool: SeqCraftToolDefinition = {
  name: 'seqcraft_set_active_document',
  title: 'Set Active Document',
  description: 'Switch the active document tab in the SeqCraft workspace. Use this when you want to view, inspect, or edit a different open construct.',
  effectClass: 'workspace_ephemeral',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'ID of the open document to activate.'
      }
    },
    required: ['documentId'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: (input: { documentId: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = ctx.workspace.documents.find(d => d.id === input.documentId);
    if (!doc) {
      return createError('DOCUMENT_NOT_FOUND', `Document ID '${input.documentId}' is not open in the workspace.`, 'Use seqcraft_list_documents to view open documents or seqcraft_import_sequence_text to load it.');
    }
    ctx.workspace.setActiveDocument(input.documentId);
    return createSuccess({
      status: 'applied',
      activeDocumentId: doc.id,
      name: doc.name,
      revision: doc.version,
      lengthBp: doc.length,
      topology: doc.topology
    });
  }
};

export const seqcraftSetActiveViewTool: SeqCraftToolDefinition = {
  name: 'seqcraft_set_active_view',
  title: 'Set Active View',
  description: 'Switch the primary workspace visualization view tab. Available views: map (plasmid/linear map), sequence (base-level nucleotide editor), features (annotation table), primers (primer design panel), enzymes (restriction digests), history (revision log), compare (sequence comparison/diff).',
  effectClass: 'workspace_ephemeral',
  inputSchema: {
    type: 'object',
    properties: {
      view: {
        type: 'string',
        enum: VALID_VIEWS,
        description: 'The target workspace representation view.'
      }
    },
    required: ['view'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: (input: { view: WorkspaceView }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    if (!VALID_VIEWS.includes(input.view)) {
      return createError('INVALID_VIEW', `Invalid view '${input.view}'. Valid views: ${VALID_VIEWS.join(', ')}`);
    }
    ctx.workspace.setActiveView(input.view);
    return createSuccess({
      status: 'applied',
      activeView: input.view
    });
  }
};

export const seqcraftSelectRangeTool: SeqCraftToolDefinition = {
  name: 'seqcraft_select_range',
  title: 'Select Range',
  description: 'Select a continuous range of nucleotides on the active or specified molecule using 1-based closed coordinates [start1, end1]. Updates the visible editor selection for human and agent context sharing.',
  effectClass: 'navigation',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Target document ID. If omitted, uses the active document.'
      },
      start1: {
        type: 'integer',
        minimum: 1,
        description: '1-based inclusive start coordinate.'
      },
      end1: {
        type: 'integer',
        minimum: 1,
        description: '1-based inclusive end coordinate.'
      }
    },
    required: ['start1', 'end1'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: (input: { start1: number; end1: number; documentId?: string }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('NO_ACTIVE_DOCUMENT', 'No active document available for selection.', 'Open or import a document first.');
    }

    if (input.start1 < 1 || input.end1 < 1) {
      return createError('INVALID_COORDINATES', 'Coordinates must be positive integers (1-based).');
    }

    if (doc.topology === 'linear' && input.start1 > input.end1) {
      return createError('INVALID_COORDINATES', `Linear molecule selection cannot wrap origin (start1=${input.start1} > end1=${input.end1}).`);
    }

    if (input.start1 > doc.length || input.end1 > doc.length) {
      return createError('COORDINATES_OUT_OF_BOUNDS', `Coordinates [${input.start1}, ${input.end1}] exceed document length (${doc.length} bp).`);
    }

    const start0 = input.start1 - 1;
    const end0Exclusive = input.end1;

    ctx.workspace.setSelection(doc.id, start0, end0Exclusive);
    if (ctx.workspace.activeDocumentId !== doc.id) {
      ctx.workspace.setActiveDocument(doc.id);
    }

    const length = input.end1 >= input.start1 ? input.end1 - input.start1 + 1 : doc.length - input.start1 + 1 + input.end1;

    return createSuccess({
      status: 'applied',
      documentId: doc.id,
      selection: {
        start1: input.start1,
        end1: input.end1,
        length
      }
    });
  }
};

export const seqcraftSelectFeatureTool: SeqCraftToolDefinition = {
  name: 'seqcraft_select_feature',
  title: 'Select Feature',
  description: 'Select an existing biological feature/annotation on the active or specified document by its unique feature ID. Highlights the feature in the viewer and opens its properties in the inspector.',
  effectClass: 'navigation',
  inputSchema: {
    type: 'object',
    properties: {
      featureId: {
        type: 'string',
        description: 'The unique feature identifier.'
      },
      documentId: {
        type: 'string',
        description: 'Document ID. If omitted, uses active document.'
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
      return createError('NO_ACTIVE_DOCUMENT', 'No active document available.', 'Import or open a sequence document first.');
    }

    const feat = doc.features.find(f => f.id === input.featureId);
    if (!feat) {
      return createError('FEATURE_NOT_FOUND', `Feature ID '${input.featureId}' not found on document '${doc.name}'.`, 'Use seqcraft_list_features to find valid feature IDs.');
    }

    ctx.workspace.selectDocumentFeature(doc.id, feat.id);

    return createSuccess({
      status: 'applied',
      documentId: doc.id,
      selectedFeature: {
        id: feat.id,
        name: feat.name,
        type: feat.type,
        strand: feat.strand === -1 ? '-' : '+'
      }
    });
  }
};

export const seqcraftClearSelectionTool: SeqCraftToolDefinition = {
  name: 'seqcraft_clear_selection',
  title: 'Clear Selection',
  description: 'Clear the active range selection and unselect any highlighted features or primers in the SeqCraft workspace.',
  effectClass: 'navigation',
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: (_input, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    ctx.workspace.clearSelection();
    return createSuccess({
      status: 'applied',
      selection: null,
      selectedFeatureId: null,
      selectedPrimerId: null
    });
  }
};

export const seqcraftFocusRegionTool: SeqCraftToolDefinition = {
  name: 'seqcraft_focus_region',
  title: 'Focus Region',
  description: 'Navigate, scroll, and center the editor view around a specific nucleotide region using 1-based closed coordinates [start1, end1]. Optionally selects the region or switches representation.',
  effectClass: 'navigation',
  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'Document identifier. If omitted, uses active document.'
      },
      start1: {
        type: 'integer',
        minimum: 1,
        description: '1-based inclusive start coordinate.'
      },
      end1: {
        type: 'integer',
        minimum: 1,
        description: '1-based inclusive end coordinate.'
      },
      preferredView: {
        type: 'string',
        enum: ['map', 'sequence'],
        description: 'Optional preferred editor view (e.g. sequence or map).'
      }
    },
    required: ['start1', 'end1'],
    additionalProperties: false
  },
  annotations: { readOnlyHint: false, untrustedContentHint: false },
  execute: (input: { start1: number; end1: number; documentId?: string; preferredView?: 'map' | 'sequence' }, rawCtx) => {
    const ctx = resolveToolContext(rawCtx);
    ctx.signal?.throwIfAborted();
    const doc = input.documentId
      ? ctx.workspace.documents.find(d => d.id === input.documentId)
      : ctx.workspace.documents.find(d => d.id === ctx.workspace.activeDocumentId);

    if (!doc) {
      return createError('NO_ACTIVE_DOCUMENT', 'No active document to focus.', 'Import or open a sequence document first.');
    }

    const prefView = input.preferredView || (input as any).view;
    if (prefView && (prefView === 'map' || prefView === 'sequence')) {
      ctx.workspace.setActiveView(prefView);
    }

    focusSequenceRegion({
      start1: input.start1,
      end1: input.end1,
      preferredView: prefView
    });
    ctx.workspace.setSelection(doc.id, input.start1 - 1, input.end1);

    const len = Math.abs(input.end1 - input.start1) + 1;

    return createSuccess({
      status: 'applied',
      documentId: doc.id,
      start1: input.start1,
      end1: input.end1,
      lengthBp: len,
      focusedRange: {
        start1: input.start1,
        end1: input.end1
      },
      activeView: ctx.workspace.activeView
    });
  }
};

export const seqcraftSelectSequenceRangeTool: SeqCraftToolDefinition = {
  ...seqcraftSelectRangeTool,
  name: 'seqcraft_select_sequence_range',
  title: 'Select Sequence Range'
};

export const workspaceTools: SeqCraftToolDefinition[] = [
  seqcraftSetActiveDocumentTool,
  seqcraftSetActiveViewTool,
  seqcraftSelectRangeTool,
  seqcraftSelectSequenceRangeTool,
  seqcraftSelectFeatureTool,
  seqcraftClearSelectionTool,
  seqcraftFocusRegionTool
];
