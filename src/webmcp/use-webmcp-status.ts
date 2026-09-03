import { useState, useEffect } from 'react';

export function useWebMCPToolCount(): number {
  const [toolCount, setToolCount] = useState<number>(50);

  useEffect(() => {
    let mounted = true;

    const updateCount = async () => {
      const doc = typeof document !== 'undefined' ? (document as any) : null;
      if (doc && doc.modelContext) {
        try {
          const tools = await doc.modelContext.getTools();
          const count = tools.filter((t: any) => t.name.startsWith('seqcraft_')).length;
          if (mounted && count > 0) {
            setToolCount(count);
          }
        } catch {
          // Keep current count
        }
      }
    };

    updateCount();

    const doc = typeof document !== 'undefined' ? (document as any) : null;
    if (doc && doc.modelContext && typeof doc.modelContext.addEventListener === 'function') {
      doc.modelContext.addEventListener('toolchange', updateCount);
    }

    return () => {
      mounted = false;
      if (doc && doc.modelContext && typeof doc.modelContext.removeEventListener === 'function') {
        doc.modelContext.removeEventListener('toolchange', updateCount);
      }
    };
  }, []);

  return toolCount;
}
