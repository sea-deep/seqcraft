export interface StagedProposal {
  id: string;
  kind: "annotation" | "construct";
  createdBy: "agent";
  status: "pending" | "applied" | "rejected";
  documentId: string;
  payload: unknown;
  summary: string;
}
