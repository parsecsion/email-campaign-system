import React from 'react';
import { Trash2, Users } from 'lucide-react';

const RecipientList = ({ candidates, selectedCandidates, toggleSelection, onRemove, onSelectAll, onDeselectAll, onDeleteAll }) => {
    if (!candidates) candidates = [];
    const allCandidatesSelected = candidates.length > 0 && selectedCandidates.size === candidates.length;

    return (
        <div className="ink-card flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-semibold text-lg flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><Users className="h-5 w-5 text-gray-500" /> Recipients</span>
                    <span className="text-sm font-normal text-gray-500">{candidates.length} loaded</span>
                </h3>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 flex flex-col overflow-hidden">
                {/* Actions */}
                <div className="mb-4">

                    {candidates.length > 0 && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={allCandidatesSelected ? onDeselectAll : onSelectAll}
                                className="group relative overflow-hidden px-4 py-2 border border-gray-300 hover:border-black text-xs font-medium transition-all flex items-center justify-center w-full bg-white"
                            >
                                <span className={`relative z-10 transition-opacity duration-300 ${allCandidatesSelected ? 'opacity-100' : 'opacity-100'}`}>
                                    {allCandidatesSelected ? 'Deselect All' : 'Select All'}
                                </span>
                            </button>

                            <button
                                onClick={onDeleteAll}
                                className="group relative overflow-hidden px-4 py-2 bg-red-600 text-white border border-red-600 hover:bg-red-700 text-xs font-medium transition-all flex items-center justify-center w-full"
                            >
                                <span className="relative z-10">Delete All</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* List */}
                {candidates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                        <Users size={64} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium text-gray-500">No recipients added</p>
                        <p className="text-sm text-center mt-2 max-w-[200px] text-gray-400">Add candidates from the "Add Recipients" panel to the left.</p>
                    </div>
                ) : (
                    <div className="space-y-2 flex-1 overflow-y-auto pr-2 candidates-scroll">
                        {candidates.map((candidate) => (
                            <div
                                key={candidate.id}
                                className={`candidate-item border p-3 hover:border-black transition-all ${selectedCandidates.has(candidate.id) ? 'border-black bg-gray-50' : 'border-gray-200'
                                    }`}
                            >
                                <div className="candidate-content flex justify-between items-start gap-3">
                                    <div className="flex items-start gap-3 flex-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedCandidates.has(candidate.id)}
                                            onChange={() => toggleSelection(candidate.id)}
                                            className="mt-1 w-4 h-4 border-gray-300 text-brand focus:ring-brand cursor-pointer"
                                            style={{ accentColor: '#00ffcb' }}
                                        />
                                        <div className="flex-1">
                                            {candidate.Name && (
                                                <p className="font-semibold text-black text-sm">{candidate.Name}</p>
                                            )}
                                            <p className="text-xs text-gray-600">{candidate.Email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onRemove(candidate.id)}
                                        className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
                                        title="Remove candidate"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipientList;
