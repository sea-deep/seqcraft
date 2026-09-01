
import { useCloningStore } from '../../state/cloning-store';
import { approveRestrictionClone, cancelRestrictionClone } from '../../application/cloning';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';

export function CloningApprovalModal() {
  const store = useCloningStore();
  const proposal = store.pendingProposal;

  if (!proposal) return null;

  const candidate = proposal.candidates.find(c => c.id === store.selectedCandidateId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[600px] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-indigo-600 px-4 py-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-indigo-200" />
            <h2 className="font-semibold">Restriction Cloning Proposal</h2>
          </div>
          <button 
            onClick={cancelRestrictionClone}
            className="text-indigo-200 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-6">
          <div className="text-sm text-gray-500 flex items-center gap-1">
             <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-medium">Agent Prepared</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded border p-3">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Vector</div>
              <div className="font-medium text-gray-900 truncate" title={proposal.vectorDocumentName}>{proposal.vectorDocumentName}</div>
              <div className="text-sm text-gray-600">{proposal.vectorBackboneLengthBp} bp backbone</div>
            </div>
            
            <div className="bg-gray-50 rounded border p-3">
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Insert</div>
              <div className="font-medium text-gray-900 truncate" title={proposal.insertDocumentName}>{proposal.insertDocumentName}</div>
              <div className="text-sm text-gray-600">{proposal.insertLengthBp} bp fragment</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Enzymes</div>
            <div className="flex gap-2">
              {proposal.enzymeNames.map(name => (
                 <span key={name} className="px-2.5 py-1 rounded bg-blue-100 text-blue-800 text-sm font-medium">
                   {name}
                 </span>
              ))}
            </div>
          </div>

          {proposal.candidates.length > 1 && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-2">Orientation</div>
              <div className="flex gap-2">
                {proposal.candidates.map(c => (
                  <button
                    key={c.id}
                    onClick={() => store.selectCandidate(c.id)}
                    className={`px-3 py-1.5 rounded text-sm font-medium border ${
                      c.id === candidate?.id 
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {c.orientation.charAt(0).toUpperCase() + c.orientation.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {candidate && (
            <div className="space-y-4">
              <div className="border rounded-lg divide-y">
                <div className="p-3 bg-gray-50 flex justify-between items-center">
                  <div className="text-sm font-medium text-gray-700">Junction 1</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${candidate.junction1.isCompatible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {candidate.junction1.compatibilityMode}
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 flex justify-between items-center">
                  <div className="text-sm font-medium text-gray-700">Junction 2</div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${candidate.junction2.isCompatible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {candidate.junction2.compatibilityMode}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center bg-green-50 p-4 rounded-lg border border-green-100">
                <div className="font-medium text-green-900">Predicted Recombinant</div>
                <div className="text-green-800 font-semibold">{candidate.recombinantLengthBp} bp</div>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <div>Transferred features: {candidate.recombinantFeatures.length}</div>
                {(proposal.sourceMetadata.vectorFeaturesOmitted > 0 || proposal.sourceMetadata.insertFeaturesOmitted > 0) && (
                  <div className="text-amber-600 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Omitted {proposal.sourceMetadata.vectorFeaturesOmitted + proposal.sourceMetadata.insertFeaturesOmitted} cut-spanning features
                  </div>
                )}
              </div>
              
              {candidate.warnings.length > 0 && (
                <div className="bg-amber-50 p-3 rounded border border-amber-200">
                   <div className="flex items-center gap-1.5 text-amber-800 text-sm font-medium mb-1">
                     <AlertTriangle className="w-4 h-4" /> Warnings
                   </div>
                   <ul className="list-disc list-inside text-sm text-amber-700">
                     {candidate.warnings.map((w, i) => <li key={i}>{w}</li>)}
                   </ul>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-3">
          <button
            onClick={cancelRestrictionClone}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={approveRestrictionClone}
            disabled={!candidate?.isValid}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded shadow hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Create recombinant
          </button>
        </div>

      </div>
    </div>
  );
}
