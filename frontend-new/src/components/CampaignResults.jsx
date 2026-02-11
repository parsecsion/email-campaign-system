import React from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useCampaign } from '../context/CampaignContext';

const CampaignResults = () => {
    const { results, showResults, resultsAnimating } = useCampaign();

    if (!showResults || results.length === 0) return null;

    const successCount = results.filter(r => r.status === 'success').length;
    const failedCount = results.filter(r => r.status === 'failed').length;
    const totalCount = results.length;

    return (
        <div className={`ink-card transition-all duration-700 ease-out ${resultsAnimating ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'} overflow-hidden mt-6`}>
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-gray-500" /> Results
                </h3>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-green-50 border border-green-200 p-4 rounded text-center">
                        <p className="text-2xl font-bold text-green-600">{successCount}</p>
                        <p className="text-xs text-green-800 uppercase font-semibold">Sent</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 p-4 rounded text-center">
                        <p className="text-2xl font-bold text-red-600">{failedCount}</p>
                        <p className="text-xs text-red-800 uppercase font-semibold">Failed</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 p-4 rounded text-center">
                        <p className="text-2xl font-bold text-gray-800">{totalCount}</p>
                        <p className="text-xs text-gray-600 uppercase font-semibold">Total</p>
                    </div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {results.map((result, idx) => (
                        <div key={idx} className={`flex items-center gap-3 border p-3 ${result.status === 'success' ? 'border-green-100 bg-green-50/50' : 'border-red-100 bg-red-50/50'}`}>
                            {result.status === 'success' ? (
                                <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
                            ) : (
                                <XCircle size={16} className="text-red-500 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{result.email}</p>
                                {result.error && <p className="text-xs text-red-600 mt-0.5">{result.error}</p>}
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded font-mono ${result.status === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {result.status.toUpperCase()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CampaignResults;
