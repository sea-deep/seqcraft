import { initializeWebMCPPolyfill } from "@mcp-b/webmcp-polyfill";

export function initializeSeqCraftWebMCPRuntime() {
  initializeWebMCPPolyfill({
    installTestingShim: true
  });
}
