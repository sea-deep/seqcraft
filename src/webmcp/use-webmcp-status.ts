import { useState, useEffect } from 'react';

export function useWebMCPToolCount(): number {
  const [toolCount, setToolCount] = useState<number>(24);

  useEffect(() => {
    let mounted = true;

    const updateCount = async () => {
      if (typeof document !== 'undefined' && document.modelContext) {
        try {
          const tools = await document.modelContext.getTools();
          const count = tools.filter(t => t.name.startsWith('seqcraft_')).length;
          if (mounted && count > 0) {
            setToolCount(count);
          }
        } catch {
          // Keep current count
        }
      }
    };

    updateCount();

    if (typeof document !== 'undefined' && document.modelContext) {
      document.modelContext.addEventListener('toolchange', updateCount);
    }

    return () => {
      mounted = false;
      if (typeof document !== 'undefined' && document.modelContext) {
        document.modelContext.removeEventListener('toolchange', updateCount);
      }
    };
  }, []);

  return toolCount;
}
