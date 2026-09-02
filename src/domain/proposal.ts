import type { SequenceEditAction } from '../scientific/sequence-editing';

export interface SequenceEditProposalPayload {
  action: SequenceEditAction;
  originalLength: number;
  newLength: number;
  summary: string;
}

export interface StagedProposal {
  id: string;
  kind: "annotation" | "construct" | "sequence_edit";
  createdBy: "agent";
  status: "pending" | "applied" | "rejected";
  documentId: string;
  baseVersion?: number;
  sequenceLength?: number;
  sequenceDigest?: string;
  payload: unknown;
  summary: string;
  createdAt?: string;
}
