import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { toast } from 'sonner';

const CampaignContext = createContext();

export const useCampaign = () => {
    const context = useContext(CampaignContext);
    if (!context) {
        throw new Error('useCampaign must be used within a CampaignProvider');
    }
    return context;
};

export const CampaignProvider = ({ children, companyEmails, senderEmail, setSenderEmail }) => {
    // --- State Variables (Moved from App.jsx) ---

    // Email Content
    const [subject, setSubject] = useState('Interview Invitation');
    const [customEmailText, setCustomEmailText] = useState('');
    const [formattedCustomEmail, setFormattedCustomEmail] = useState(null);
    const [detectedVariables, setDetectedVariables] = useState([]);

    // Templates
    const [templates, setTemplates] = useState([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [emailTemplateTab, setEmailTemplateTab] = useState('templates');
    const [statusMappings, setStatusMappings] = useState({});

    // Candidates & Database
    const [candidates, setCandidates] = useState([]);
    const [databaseCandidates, setDatabaseCandidates] = useState([]);
    const [loadingDatabaseCandidates, setLoadingDatabaseCandidates] = useState(false);
    const [databaseSearchTerms, setDatabaseSearchTerms] = useState([]); // Array of search inputs
    const [selectedDatabaseCandidates, setSelectedDatabaseCandidates] = useState(new Set());

    // Sending State
    const [sendStatus, setSendStatus] = useState('idle'); // idle, sending, complete, error
    const [sendProgress, setSendProgress] = useState(0);
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [resultsAnimating, setResultsAnimating] = useState(false);

    // ... (rest of state)

    // ...

    const loadTemplates = useCallback(async () => {
        setLoadingTemplates(true);
        try {
            const [templatesRes, settingsRes] = await Promise.all([
                api.get('/api/templates'),
                api.get('/api/settings')
            ]);

            setTemplates(templatesRes.data.templates || []);

            // Load status mappings
            const s = settingsRes.data.settings || {};
            let mappings = s.status_email_mappings || {};
            if (typeof mappings === 'string') {
                try { mappings = JSON.parse(mappings); } catch (e) { }
            }
            setStatusMappings(mappings);

        } catch (error) {
            console.error('Failed to load templates/settings', error);
        } finally {
            setLoadingTemplates(false);
        }
    }, []);

    const updateStatusMapping = async (status, templateId) => {
        try {
            const newMappings = { ...statusMappings, [status]: templateId };
            // If templateId is null/undefined/empty string, we might want to remove the key,
            // but the UI typically sends a value or 'none'.
            if (templateId === 'none' || !templateId) {
                delete newMappings[status];
            } else {
                newMappings[status] = templateId;
            }

            setStatusMappings({ ...newMappings }); // Update local state immediately

            // Save to backend
            // We need to fetch current settings first to not overwrite others? 
            // The /api/settings POST merges? No, it usually replaces what is sent or merges?
            // backend/audit_db.py showed Settings model is key-value. 
            // The API likely handles key-value updates.
            // Let's assume we can post just the updated key if the backend supports it, 
            // OR we rely on the fact that we loaded other settings?
            // Actually, `Settings.jsx` logic was:
            //   const payload = { ...getCurrentSettings() };
            //   await api.post('/api/settings', payload);
            // If I only send `status_email_mappings`, will it wipe other settings?
            // Let's check `backend/app.py` or verify.
            // I haven't viewed `backend/app.py` fully for settings logic.
            // But usually `/api/settings` updates provided keys or replaces all?
            // `EmailTemplatesSettings.jsx` called `onSave` which updated parent `Settings` state, 
            // and `Settings` saved EVERYTHING.

            // Here in CampaignContext, I don't have ALL settings.
            // I should probably implement a PATCH or a specific endpoint or just `api.post('/api/settings', { status_email_mappings: newMappings })`
            // and hope backend merges.

            // Let's try sending just this key.
            await api.post('/api/settings', { status_email_mappings: newMappings });
            toast.success('Status mapping updated');

        } catch (error) {
            console.error("Failed to update status mapping", error);
            toast.error("Failed to update status mapping");
        }
    };

    const handleSelectTemplate = async (templateId) => {
        try {
            const response = await api.get(`/api/templates/${templateId}`);
            if (response.data?.template) {
                setSelectedTemplate(response.data.template);
                setSubject(response.data.template.subject); // Auto-update subject
                setDetectedVariables(response.data.template.variables || []);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const loadDatabaseCandidates = async () => {
        setLoadingDatabaseCandidates(true);
        try {
            const uniqueCandidatesMap = new Map();
            const terms = databaseSearchTerms.length > 0 ? databaseSearchTerms : [''];

            const promises = terms.map(term => {
                const p = term ? `&search=${encodeURIComponent(term)}` : '';
                return api.get(`/api/candidates?limit=100${p}`);
            });

            const responses = await Promise.allSettled(promises);

            responses.forEach(res => {
                if (res.status === 'fulfilled' && res.value.data.candidates) {
                    res.value.data.candidates.forEach(c => {
                        if (!uniqueCandidatesMap.has(c.id)) {
                            uniqueCandidatesMap.set(c.id, {
                                ...c,
                                type: c.country || 'US',
                                displayName: c.full_name || `${c.first_name} ${c.last_name}`
                            });
                        }
                    });
                }
            });

            setDatabaseCandidates(Array.from(uniqueCandidatesMap.values()));

        } catch (error) {
            console.error("Failed to load candidates:", error);
        } finally {
            setLoadingDatabaseCandidates(false);
        }
    };

    const toggleDatabaseCandidateSelection = (id) => {
        const key = String(id);
        setSelectedDatabaseCandidates(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const addDatabaseCandidatesToRecipients = (onSuccess) => {
        const newCands = [];
        selectedDatabaseCandidates.forEach(key => {
            const id = parseInt(key, 10);
            const c = databaseCandidates.find(x => x.id === id);
            if (c && c.email) {
                newCands.push({
                    id: `db_${key}_${Date.now()}`,
                    Name: c.displayName,
                    Email: c.email,
                    ...c
                });
            }
        });

        if (newCands.length > 0) {
            setCandidates(prev => [...prev, ...newCands]);
            setSelectedDatabaseCandidates(new Set());
            if (onSuccess) onSuccess(newCands.length);
        } else {
            // Let UI handle failure message
        }
        return newCands.length; // Return count
    };

    const handleSendEmails = async () => {
        const selectedRecipients = candidates.filter(c => c.selected !== false);
        if (selectedRecipients.length === 0) throw new Error('No recipients selected');
        if (!subject) throw new Error('Subject is required');

        const isTemplate = emailTemplateTab === 'templates';
        if (isTemplate && !selectedTemplate) throw new Error('Select a template');
        if (!isTemplate && !formattedCustomEmail) throw new Error('Format your custom email');

        if (!confirm(`Send email to ${selectedRecipients.length} recipients?`)) return; // Keep confirm for safety

        setSendStatus('sending');
        setSendProgress(0);
        setResults([]);
        setShowResults(true);
        setResultsAnimating(false);
        setTimeout(() => setResultsAnimating(true), 10);

        try {
            const payload = {
                senderEmail,
                subject,
                recipients: selectedRecipients,
            };

            if (isTemplate) {
                payload.templateId = selectedTemplate.id;
                // Guard against accidental mixed modes
                if (payload.htmlTemplate || payload.plainTemplate) {
                    throw new Error('Internal error: template mode should not send raw templates');
                }
            } else {
                payload.htmlTemplate = formattedCustomEmail;
                // Helper to strip HTML tags for plain text version
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = formattedCustomEmail;
                payload.plainTemplate = tempDiv.textContent || tempDiv.innerText || ' ';

                if (!payload.htmlTemplate || !payload.plainTemplate) {
                    throw new Error('Internal error: custom mode requires both htmlTemplate and plainTemplate');
                }
            }

            const response = await api.post('/api/send-emails', payload);

            if (response.data.success) {
                const taskId = response.data.task_id;
                let finished = false;
                while (!finished) {
                    try {
                        const statusRes = await api.get(`/api/campaigns/${taskId}/status`);
                        const statusData = statusRes.data;

                        if (statusData.state === 'SUCCESS') {
                            setResults(statusData.results || []);
                            setSendStatus('complete');
                            setSendProgress(100);
                            finished = true;
                        } else if (statusData.state === 'FAILURE') {
                            throw new Error(statusData.error || 'Campaign failed');
                        } else {
                            if (statusData.total > 0) {
                                const p = Math.round((statusData.current / statusData.total) * 100);
                                setSendProgress(p);
                            }
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                    } catch {
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            } else {
                throw new Error(response.data.error || 'Failed to send');
            }

        } catch (error) {
            console.error(error);
            setSendStatus('idle');
            throw error; // Re-throw for UI to handle (Toast)
        }
    };

    // Initialize Templates on mount
    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    const saveTemplate = async (templateData) => {
        try {
            let response;
            // Determine if creating or updating
            // If templateData has an ID that matches an existing template, it's an update? 
            // Or we check if ID is present and we're in "edit mode" context.
            // For simplicity, if templateData.id exists and we are editing, we PUT.
            // But if we are creating a NEW one, we might not have an ID yet, or we're generating one.

            // Let's assume if it has an ID, it's an update, unless we explicitly say create.
            // User might want to "Save As New".

            if (templateData.isNew) {
                response = await api.post('/api/templates', templateData);
            } else {
                response = await api.put(`/api/templates/${templateData.id}`, templateData);
            }

            if (response.data?.success) {
                // Refresh list
                loadTemplates();
                return response.data.template;
            }
        } catch (error) {
            console.error('Failed to save template', error);
            throw error;
        }
    };

    const deleteTemplate = async (templateId) => {
        try {
            await api.delete(`/api/templates/${templateId}`);
            setTemplates(prev => prev.filter(t => t.id !== templateId));
            if (selectedTemplate?.id === templateId) {
                setSelectedTemplate(null);
                setSubject('');
            }
        } catch (error) {
            console.error('Failed to delete template', error);
            throw error;
        }
    };

    const value = {
        // State
        senderEmail, setSenderEmail, companyEmails, // Passed from top or context
        subject, setSubject,
        customEmailText, setCustomEmailText,
        formattedCustomEmail, setFormattedCustomEmail,
        detectedVariables, setDetectedVariables,
        templates, loadingTemplates, selectedTemplate, setSelectedTemplate: handleSelectTemplate,
        emailTemplateTab, setEmailTemplateTab,
        candidates, setCandidates,
        databaseCandidates, loadingDatabaseCandidates,
        databaseSearchTerms, setDatabaseSearchTerms,
        selectedDatabaseCandidates, toggleDatabaseCandidateSelection,
        sendStatus, sendProgress, results, showResults, resultsAnimating,

        statusMappings, updateStatusMapping, // New

        // Actions
        loadDatabaseCandidates,
        addDatabaseCandidatesToRecipients,
        handleSendEmails,
        loadTemplates,
        saveTemplate,
        deleteTemplate
    };

    return (
        <CampaignContext.Provider value={value}>
            {children}
        </CampaignContext.Provider>
    );
};
