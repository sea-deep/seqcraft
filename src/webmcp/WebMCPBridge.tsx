import { useEffect } from 'react';
import { registerSeqCraftTools } from './register-seqcraft-tools';

export function WebMCPBridge() {
  useEffect(() => {
    registerSeqCraftTools().catch(error => {
      console.error("[SeqCraft WebMCP] registration failed", error);
    });
  }, []);

  return null;
}
