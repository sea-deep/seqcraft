import { Html } from '@react-three/drei';
import type { Feature } from '../../domain/feature';
import { getFeatureColor } from '../../domain/feature-colors';
import { getFeatureLength } from '../../domain/feature';

interface PlasmidFeatureLabelProps {
  feature: Feature;
  position: [number, number, number];
}

export function PlasmidFeatureLabel({ feature, position }: PlasmidFeatureLabelProps) {
  const color = getFeatureColor(feature.type);
  const length = getFeatureLength(feature);
  const formattedLength = new Intl.NumberFormat().format(length);

  return (
    <Html position={position} center className="pointer-events-none">
      <div 
        className="flex flex-col bg-slate-900 border border-slate-700 rounded-md shadow-lg p-2 min-w-max pointer-events-none"
        style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: '1.4' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: color }}
          />
          <span className="font-semibold text-slate-100">{feature.name}</span>
        </div>
        <div className="text-slate-400 pl-[18px]">
          {feature.type === 'misc_feature' ? 'misc' : feature.type} &middot; {formattedLength} bp
        </div>
      </div>
    </Html>
  );
}
