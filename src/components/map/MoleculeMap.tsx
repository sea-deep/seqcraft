import type { SequenceDocument } from '../../domain/document';
import { useState } from 'react';
import { CircleDot, Orbit } from 'lucide-react';
import { LinearMap } from './LinearMap';
import { CircularMap2D } from './CircularMap2D';
import { PlasmidMap3D } from './PlasmidMap3D';

export function MoleculeMap({ document }: { document: SequenceDocument }) {
  const [circularView, setCircularView] = useState<'2d' | '3d'>('2d');
  if (document.topology === 'linear') return <LinearMap document={document} />;

  const viewSwitcher = (
    <div className="flex items-center rounded-md border border-[var(--border)] bg-[var(--panel)] p-0.5 shadow-sm shrink-0">
      <button
        aria-label="2D map"
        aria-pressed={circularView === '2d'}
        onClick={() => setCircularView('2d')}
        className={`flex h-6 items-center gap-1 rounded px-2 text-[11px] ${
          circularView === '2d'
            ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text)]'
        }`}
      >
        <CircleDot size={12} />
        2D
      </button>
      <button
        aria-label="3D view"
        aria-pressed={circularView === '3d'}
        onClick={() => setCircularView('3d')}
        className={`flex h-6 items-center gap-1 rounded px-2 text-[11px] ${
          circularView === '3d'
            ? 'bg-[var(--accent-soft)] font-medium text-[var(--accent)]'
            : 'text-[var(--text-muted)] hover:text-[var(--text)]'
        }`}
      >
        <Orbit size={12} />
        3D
      </button>
    </div>
  );

  if (circularView === '3d') {
    return (
      <div className="relative h-full w-full">
        <div className="absolute right-3 top-3 z-20">{viewSwitcher}</div>
        <PlasmidMap3D document={document} />
      </div>
    );
  }

  return <CircularMap2D document={document} headerRight={viewSwitcher} />;
}
