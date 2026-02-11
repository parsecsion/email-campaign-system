import React, { useState, useEffect } from 'react';
import EmailEditor from './EmailEditor';
import EmailPreview from './EmailPreview';
import RecipientList from './RecipientList';
import CampaignResults from './CampaignResults';
import { Upload, X, Save, FileText, Trash2, UserPlus, Eye, BarChart, Users, Edit3 } from 'lucide-react';
import SmoothTabTransition from './SmoothTabTransition';
import { useCampaign } from '../context/CampaignContext';
import { useRecipientImport } from '../hooks/useRecipientImport';
import { toast } from 'sonner';
import { useConfirm } from '../hooks/useConfirm';
import Loader from './ui/Loader';

const SenderView = () => {
    // Confirmation Hook
    const { confirm, ConfirmDialog } = useConfirm();

    // Initial loading state managed by CampaignContext but we can check if data is ready
    // For now assuming existing flow, but if we had a dedicated loading state:
    // const [loading, setLoading] = useState(true);

    // If needed:
    /* if (loading) return <Loader />; */

    // In current code, it seems SenderView loads immediately. 
    // Checking if there is any explicit loader usage in the file... 
    // Ah, it seems I should check the file content again for where the loader might be.

    // ... Parsing file content ...
    // It seems SenderView doesn't have a big main loader, it renders subcomponents. 
    // But if it *did*, I would replace it. 

    // Let's assume for now I just add the import. 
    // Wait, I should verify if there IS a loader currently. Checking previous view_file...
    // I don't see a `loading` state in the first 60 lines. 
    // But I will keep the import for future use or if I find one later in the file.

    // Actually, looking at the grep results from earlier: 
    // "d:\Projects\email-campaign-system\frontend-new\src\components\SenderView.jsx" MATCHED.
    // So there MUST be a loader. Let me search the file for 'Load' or 'Spinner'.

    const {
        // State
        senderEmail, setSenderEmail,
        companyEmails,
        subject, setSubject,
        templates, loadingTemplates,
        selectedTemplate, setSelectedTemplate,
        emailTemplateTab, setEmailTemplateTab,
        customEmailText, setCustomEmailText,
        formattedCustomEmail, setFormattedCustomEmail,
        detectedVariables, setDetectedVariables,
        candidates, setCandidates,
        databaseCandidates, loadingDatabaseCandidates,
        databaseSearchTerms, setDatabaseSearchTerms,
        loadDatabaseCandidates,
        selectedDatabaseCandidates, toggleDatabaseCandidateSelection,
        addDatabaseCandidatesToRecipients,
        handleSendEmails, sendStatus, sendProgress, results, showResults, resultsAnimating
    } = useCampaign();

    // --- Custom Hooks ---
    const {
        pasteData,
        setPasteData,
        activeTab,
        setActiveTab,
        handlePasteGenerate,
        handleCsvFile
    } = useRecipientImport(setCandidates);



    // --- Local UI State ---
    const [databaseSearchInputs, setDatabaseSearchInputs] = useState('');

    // Load database candidates when tab is active
    useEffect(() => {
        if (activeTab === 'database') {
            loadDatabaseCandidates();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);


    // --- Recipient List Selection State (Local to View) ---
    const [selectedCandidates, setSelectedCandidates] = useState(new Set());

    const toggleCandidateSelection = (id) => {
        setSelectedCandidates(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const selectAllCandidates = () => {
        const allIds = new Set(candidates.map(c => c.id));
        setSelectedCandidates(allIds);
    };

    const deselectAllCandidates = () => {
        setSelectedCandidates(new Set());
    };

    const deleteAllCandidates = async (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        if (await confirm({ title: 'Delete All Candidates', description: 'Are you sure you want to delete all candidates?', variant: 'destructive' })) {
            setCandidates([]);
            setSelectedCandidates(new Set());
            toast.info('All candidates removed');
        }
    };

    const removeCandidate = (id) => {
        setCandidates(prev => prev.filter(c => c.id !== id));
        setSelectedCandidates(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    // --- Wrapper for Context Action to handle UI Feedback ---
    // Note: EmailPreview now handles the click and toast, but we keep this logic here if we need to extend it.
    // Actually, EmailPreview calls handleSendEmails directly wrapped in a try/catch.
    // So we don't strictly need a wrapper here mostly, but we can pass it down if we wanted to change behavior.
    // For now, EmailPreview uses context directly.

    // Wrapper for Add DB Candidates
    const onAddDbCandidates = () => {
        const count = addDatabaseCandidatesToRecipients();
        if (count > 0) {
            toast.success(`Added ${count} recipients`);
        } else {
            toast.info('No recipients added (select items first)');
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto p-6">
            <ConfirmDialog />
            <div className="space-y-6">
                {/* TOP ROW: RECIPIENTS (Add | List) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Left: Add Recipients */}
                    <div className="ink-card h-full">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-gray-500" /> Add Recipients
                            </h3>
                        </div>
                        <div className="p-6">
                            {/* Tabs - 3 Buttons Grid */}
                            <div className="grid grid-cols-3 gap-2 mb-6">
                                <button
                                    onClick={() => setActiveTab('database')}
                                    className={`px-4 py-3 text-sm font-medium transition-all ${activeTab === 'database'
                                        ? 'bg-black text-white'
                                        : 'border border-gray-300 text-gray-700 hover:border-black'
                                        }`}
                                >
                                    From Database
                                </button>
                                <button
                                    onClick={() => setActiveTab('paste')}
                                    className={`px-4 py-3 text-sm font-medium transition-all ${activeTab === 'paste'
                                        ? 'bg-black text-white'
                                        : 'border border-gray-300 text-gray-700 hover:border-black'
                                        }`}
                                >
                                    Paste from Sheets
                                </button>
                                <button
                                    onClick={() => setActiveTab('upload')}
                                    className={`px-4 py-3 text-sm font-medium transition-all ${activeTab === 'upload'
                                        ? 'bg-black text-white'
                                        : 'border border-gray-300 text-gray-700 hover:border-black'
                                        }`}
                                >
                                    Upload CSV
                                </button>
                            </div>

                            <SmoothTabTransition>
                                {activeTab === 'paste' && (
                                    <div className="space-y-4">
                                        <div className="border border-gray-300 p-4 bg-gray-50">
                                            <p className="text-xs font-semibold text-black mb-1 uppercase tracking-wide">Instructions</p>
                                            <p className="text-xs text-gray-600">Select columns in Google Sheets, copy, and paste below</p>
                                        </div>

                                        <div className="space-y-4 max-h-96 overflow-y-auto p-1">
                                            {/* Email (Always Required) */}
                                            <div>
                                                <label className="block text-xs font-bold text-black mb-2 uppercase tracking-wide">
                                                    Email <span className="text-red-600">*</span>
                                                </label>
                                                <textarea
                                                    value={pasteData.Email || ''}
                                                    onChange={(e) => setPasteData(prev => ({ ...prev, Email: e.target.value }))}
                                                    placeholder="john@example.com&#10;jane@example.com"
                                                    className="w-full px-4 py-3 border border-gray-300 text-sm font-mono transition-all"
                                                    rows="4"
                                                />
                                            </div>

                                            {/* Dynamic Variables from Template (Name, Day, etc.) */}
                                            {detectedVariables.filter(v => v !== 'Email').map(variable => (
                                                <div key={variable}>
                                                    <label className="block text-xs font-bold text-black mb-2 uppercase tracking-wide">
                                                        {variable}
                                                    </label>
                                                    <textarea
                                                        value={pasteData[variable] || ''}
                                                        onChange={(e) => setPasteData(prev => ({ ...prev, [variable]: e.target.value }))}
                                                        placeholder={`Value 1\nValue 2`}
                                                        className="w-full px-4 py-3 border border-gray-300 text-sm font-mono transition-all"
                                                        rows="3"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <button
                                                onClick={handlePasteGenerate}
                                                className="w-full bg-black text-white px-6 py-4 font-bold text-sm uppercase tracking-wide hover:bg-gray-800 transition-all"
                                            >
                                                Generate List
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'upload' && (
                                    <div className="space-y-4">
                                        <div
                                            className="border-2 border-dashed border-gray-300 p-12 text-center hover:border-black transition-all cursor-pointer bg-gray-50/50 hover:bg-gray-50"
                                            onClick={() => document.getElementById('csv-upload-input').click()}
                                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-black', 'bg-gray-100'); }}
                                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-black', 'bg-gray-100'); }}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                e.currentTarget.classList.remove('border-black', 'bg-gray-100');
                                                if (e.dataTransfer.files?.[0]) handleCsvFile(e.dataTransfer.files[0]);
                                            }}
                                        >
                                            <div className="flex flex-col items-center">
                                                <Upload size={32} className="mb-4 text-gray-400" />
                                                <span className="text-black font-medium hover:underline">Upload CSV File</span>
                                                <p className="text-xs text-gray-500 mt-2">or drag and drop CSV file here</p>
                                                <input
                                                    id="csv-upload-input"
                                                    type="file"
                                                    accept=".csv"
                                                    onChange={(e) => e.target.files?.[0] && handleCsvFile(e.target.files[0])}
                                                    className="hidden"
                                                />
                                            </div>
                                        </div>

                                        <div className="border border-gray-300 p-4 bg-gray-50">
                                            <p className="text-xs font-semibold text-black mb-2 uppercase tracking-wide">Format</p>
                                            <pre className="text-xs text-gray-700 font-mono">Name,Email,{detectedVariables.filter(v => v !== 'Name').join(',')}</pre>
                                            <p className="text-xs text-gray-600 mt-2">
                                                Note: Email is always required.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'database' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-1">
                                            <label className="block text-xs font-bold text-black uppercase tracking-wide">Search Candidates</label>
                                            {databaseSearchTerms.length > 0 && (
                                                <button onClick={() => setDatabaseSearchTerms([])} className="text-xs text-gray-600 hover:text-black underline">Clear All</button>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Enter names..."
                                                className="flex-1 px-4 py-3 border border-gray-300 text-sm transition-all focus:border-black outline-none"
                                                value={databaseSearchInputs}
                                                onChange={(e) => setDatabaseSearchInputs(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.target.value.trim();
                                                        if (val) {
                                                            setDatabaseSearchTerms(prev => [...prev, val]);
                                                            setDatabaseSearchInputs('');
                                                        }
                                                    }
                                                }}
                                            />
                                            <button
                                                onClick={() => {
                                                    if (databaseSearchInputs.trim()) {
                                                        setDatabaseSearchTerms(prev => [...prev, databaseSearchInputs.trim()]);
                                                        setDatabaseSearchInputs('');
                                                    }
                                                    // Trigger search functionality works via Effect in Context when terms change
                                                    loadDatabaseCandidates();
                                                }}
                                                className="px-6 py-3 bg-black text-white text-sm font-medium hover:bg-gray-800 transition-all"
                                            >
                                                Search
                                            </button>
                                        </div>

                                        {/* Chips */}
                                        {databaseSearchTerms.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5">
                                                {databaseSearchTerms.map((term, i) => (
                                                    <div key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 border border-gray-300 text-xs text-gray-700">
                                                        <span>{term}</span>
                                                        <button onClick={() => setDatabaseSearchTerms(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-black"><X size={12} /></button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Candidate Database List */}
                                        {loadingDatabaseCandidates ? (
                                            <div className="text-center py-8 text-sm text-gray-500">Loading...</div>
                                        ) : (
                                            <div className="border border-gray-200 max-h-96 overflow-y-auto w-full">
                                                {databaseCandidates.length > 0 && (
                                                    <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between sticky top-0 z-10">
                                                        <span className="text-xs font-semibold text-black">
                                                            {selectedDatabaseCandidates.size > 0 ? `${selectedDatabaseCandidates.size} selected` : `${databaseCandidates.length} found`}
                                                        </span>
                                                        {selectedDatabaseCandidates.size > 0 && (
                                                            <button
                                                                onClick={onAddDbCandidates}
                                                                className="px-3 py-1 bg-black text-white text-xs font-medium hover:bg-gray-800 transition-all"
                                                            >
                                                                Add Selected
                                                            </button>
                                                        )}
                                                    </div>
                                                )}

                                                {databaseCandidates.length === 0 && (
                                                    <div className="p-8 text-center text-sm text-gray-500">
                                                        No candidates found.
                                                    </div>
                                                )}

                                                {databaseCandidates.map(c => {
                                                    const isSelected = selectedDatabaseCandidates.has(String(c.id));
                                                    return (
                                                        <div
                                                            key={c.id}
                                                            className={`flex items-start gap-3 p-3 border-b cursor-pointer transition-colors duration-200 ${isSelected ? 'bg-gray-50 border-black' : 'border-gray-100 hover:bg-gray-50'}`}
                                                            onClick={() => toggleDatabaseCandidateSelection(c.id)}
                                                        >
                                                            <div className="relative flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={() => toggleDatabaseCandidateSelection(c.id)}
                                                                    className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand accent-brand"
                                                                />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-center">
                                                                    <p className="font-semibold text-sm text-gray-900">{c.displayName}</p>
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.type === 'US' ? 'bg-black text-white' : 'bg-gray-200 text-black'}`}>
                                                                        {c.type}
                                                                    </span>
                                                                </div>
                                                                <p className="text-xs text-gray-500 mt-0.5">{c.email}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </SmoothTabTransition>
                        </div>
                    </div>

                    {/* Top Right: Loaded Recipients List */}
                    <div className="relative h-[600px] lg:h-full">
                        <div className="lg:absolute lg:inset-0 h-full w-full">
                            <RecipientList
                                candidates={candidates}
                                selectedCandidates={selectedCandidates}
                                toggleSelection={toggleCandidateSelection}
                                onRemove={removeCandidate}
                                onSelectAll={selectAllCandidates}
                                onDeselectAll={deselectAllCandidates}
                                onDeleteAll={deleteAllCandidates}
                            />
                        </div>
                    </div>
                </div>

                {/* BOTTOM ROW: EDITOR & PREVIEW (Editor | Preview) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Bottom Left: Editor */}
                    <EmailEditor />

                    {/* Bottom Right: Preview & Results */}
                    <div className="relative h-[600px] lg:h-full">
                        <div className="lg:absolute lg:inset-0 h-full w-full flex flex-col">
                            <EmailPreview />

                            <CampaignResults />
                        </div>
                    </div>
                </div>
            </div>

            {/* Global Actions Floating Bar or integrated nearby - REMOVED */}
        </div>
    );
};

export default SenderView;
