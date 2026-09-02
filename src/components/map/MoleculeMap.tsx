import type { SequenceDocument } from '../../domain/document';
import { useState } from 'react';
import { CircleDot, Orbit } from 'lucide-react';
import { LinearMap } from './LinearMap';
import { CircularMap2D } from './CircularMap2D';
import { PlasmidMap3D } from './PlasmidMap3D';

export function MoleculeMap({ document }: { document: SequenceDocument }) {
  const [circularView, setCircularView] = useState<'2d' | '3d'>('2d');
  if (document.topology === 'linear') return <LinearMap document={document} />;
  return <div className="relative h-full w-full">
    <div className="absolute right-4 top-4 z-20 flex rounded-md border border-[var(--border)] bg-[var(--panel)] p-0.5 shadow-sm">
      <button onClick={() => setCircularView('2d')} className={`flex h-7 items-center gap-1.5 rounded px-2.5 text-[11px] ${circularView === '2d' ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}><CircleDot size={13} />2D map</button>
      <button onClick={() => setCircularView('3d')} className={`flex h-7 items-center gap-1.5 rounded px-2.5 text-[11px] ${circularView === '3d' ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text)]'}`}><Orbit size={13} />3D view</button>
    </div>
    {circularView === '2d' ? <CircularMap2D document={document} /> : <PlasmidMap3D document={document} />}
  </div>;
}
