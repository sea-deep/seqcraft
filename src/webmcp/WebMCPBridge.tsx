import { useEffect } from 'react';
import { registerSeqCraftTools } from './register-seqcraft-tools';

export function WebMCPBridge() {
  useEffect(() => {
    const controller = new AbortController();
    
    registerSeqCraftTools(undefined, controller.signal).catch(error => {
      if (controller.signal.aborted) {
        return;
      }
      console.error("[SeqCraft WebMCP] registration failed", error);
    });

    return () => {
      controller.abort();
    };
  }, []);

  return null;
}
