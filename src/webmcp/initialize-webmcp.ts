import { initializeWebMCPPolyfill } from "@mcp-b/webmcp-polyfill";
import { registerSeqCraftTools } from "./register-seqcraft-tools";

export function initializeSeqCraftWebMCPRuntime() {
  initializeWebMCPPolyfill({
    installTestingShim: true
  });
  registerSeqCraftTools().catch(err => {
    console.error("[SeqCraft WebMCP] startup registration error:", err);
  });
}
