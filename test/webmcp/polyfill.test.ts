import { describe, it, expect, beforeEach } from 'vitest';
import { initializeSeqCraftWebMCPRuntime } from '../../src/webmcp/initialize-webmcp';
import { registerSeqCraftTools } from '../../src/webmcp/register-seqcraft-tools';
import { useWorkspaceStore } from '../../src/state/workspace-store';
import { importGenBank } from '../../src/import/genbank';
import { DEMO_GENBANK } from '../../src/data/demo-workspace';

describe('WebMCP Polyfill Runtime', () => {
  it('installs the polyfill and executes stringified tools correctly', async () => {
    delete (document as any).modelContext;
    useWorkspaceStore.setState({ documents: [], activeDocumentId: null });

    // Initialize polyfill
    initializeSeqCraftWebMCPRuntime();
    expect((document as any).modelContext).toBeDefined();

    // Register tools
    const controller = new AbortController();
    await registerSeqCraftTools(undefined, controller.signal);

    const tools = await (document as any).modelContext.getTools();
    const seqTools = tools.filter((t: any) => t.name.startsWith('seqcraft_'));
    expect(seqTools.length).toBe(16);

    const expectedNames = [
      "seqcraft_analyze_primer",
      "seqcraft_analyze_restriction_sites",
      "seqcraft_focus_region",
      "seqcraft_get_active_document",
      "seqcraft_get_capabilities",
      "seqcraft_show_feature",
      "seqcraft_show_restriction_site",
      "seqcraft_simulate_digest",
      "seqcraft_simulate_pcr",
      "seqcraft_list_documents",
      "seqcraft_prepare_restriction_clone",
      "seqcraft_find_orfs",
      "seqcraft_list_features",
      "seqcraft_list_primers",
      "seqcraft_compare_documents",
      "seqcraft_propose_annotation",
    ].sort();

    const actualNames = seqTools.map((t: any) => t.name).sort();
    expect(actualNames).toEqual(expectedNames);

    // Now test execution
    const pUC19 = importGenBank(DEMO_GENBANK, 'pUC19')[0];
    useWorkspaceStore.getState().addDocument(pUC19);

    // Active doc tool
    const activeTool = tools.find((t: any) => t.name === 'seqcraft_get_active_document');
    const activeResStr = await (document as any).modelContext.executeTool(activeTool, JSON.stringify({}));
    const activeRes = JSON.parse(activeResStr);
    expect(activeRes.ok).toBe(true);
    expect(activeRes.result.lengthBp).toBe(2686);

    // Digest tool
    const digestTool = tools.find((t: any) => t.name === 'seqcraft_simulate_digest');
    const digestResStr = await (document as any).modelContext.executeTool(digestTool, JSON.stringify({
      enzymeNames: ['EcoRI', 'HindIII']
    }));
    const digestRes = JSON.parse(digestResStr);
    expect(digestRes.ok).toBe(true);
    expect(digestRes.result.fragments.length).toBe(2);
    const lengths = digestRes.result.fragments.map((f: any) => f.lengthBp).sort((a: number, b: number) => a - b);
    expect(lengths).toEqual([51, 2635]);
  });
});
