import type { SequenceDocument } from '../../domain/document';
import { LinearMap } from './LinearMap';
import { PlasmidMap3D } from './PlasmidMap3D';

export function MoleculeMap({ document }: { document: SequenceDocument }) {
  return document.topology === 'linear'
    ? <LinearMap document={document} />
    : <PlasmidMap3D document={document} />;
}
