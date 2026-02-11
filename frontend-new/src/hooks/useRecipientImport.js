import { useState } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';

export const useRecipientImport = (setCandidates) => {
    const [pasteData, setPasteData] = useState({ Name: '', Email: '' });
    const [activeTab, setActiveTab] = useState('database');

    const handlePasteGenerate = () => {
        const variables = Object.keys(pasteData).filter(k => pasteData[k] && pasteData[k].trim());
        if (!variables.includes('Email')) {
            toast.error('Email column is required.');
            return;
        }

        const columnData = {};
        let maxLines = 0;

        variables.forEach(v => {
            const lines = pasteData[v].split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
            columnData[v] = lines;
            if (lines.length > maxLines) maxLines = lines.length;
        });

        const newCandidates = [];
        for (let i = 0; i < maxLines; i++) {
            const candidate = { id: `generated_${Date.now()}_${i}` };
            let hasEmail = false;
            variables.forEach(v => {
                const val = columnData[v][i] || '';
                candidate[v] = val;
                if (v === 'Email' && val) hasEmail = true;
            });

            if (hasEmail) {
                newCandidates.push(candidate);
            }
        }

        if (newCandidates.length > 0) {
            setCandidates(prev => [...prev, ...newCandidates]);
            setPasteData({ Name: '', Email: '' });
            toast.success(`Generated ${newCandidates.length} recipients.`);
        } else {
            toast.warning('No valid recipients found. Ensure you have Emails pasted.');
        }
    };

    const handleCsvFile = (file) => {
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const { data, meta } = results;
                if (!data || data.length === 0) {
                    toast.error('CSV is empty');
                    return;
                }

                const headers = meta.fields || [];
                if (headers.length === 0) {
                    toast.error('Could not detect headers');
                    return;
                }

                const newPasteData = { ...pasteData };

                headers.forEach(h => {
                    const values = data.map(row => row[h] || '').map(v => String(v).trim());
                    newPasteData[h] = values.join('\n');
                });

                setPasteData(newPasteData);
                setActiveTab('paste');
                toast.success(`Imported ${data.length} rows from CSV.`);
            },
            error: (error) => {
                console.error('CSV Parse Error:', error);
                toast.error('Failed to parse CSV file');
            }
        });
    };

    return {
        pasteData,
        setPasteData,
        activeTab,
        setActiveTab,
        handlePasteGenerate,
        handleCsvFile
    };
};
