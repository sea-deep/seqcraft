import { importDocument } from '../import/normalize-document';
import { useWorkspaceStore } from '../state/workspace-store';

export function handleImportDocument(data: string, name?: string) {
  const documents = importDocument(data, name);
  const storeApi = useWorkspaceStore;
  
  if (documents.length > 0) {
    storeApi.getState().addDocuments(documents);
  }
}
