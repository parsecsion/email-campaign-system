import { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'sonner';

export const useDrafts = (
    senderEmail,
    subject,
    selectedTemplate,
    customEmailText,
    candidates,
    setSenderEmail,
    setSubject,
    setCustomEmailText,
    setSelectedTemplate,
    setCandidates,
    templates,
    confirm // Added confirm callback
) => {
    const [drafts, setDrafts] = useState([]);
    const [showDrafts, setShowDrafts] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);

    useEffect(() => {
        fetchDrafts();
    }, []);

    const fetchDrafts = async () => {
        try {
            const res = await api.get('/api/drafts');
            setDrafts(res.data.drafts || []);
        } catch {
            console.error("Failed to fetch drafts");
        }
    };

    const saveDraft = async () => {
        setSavingDraft(true);
        try {
            const draftData = {
                sender_email: senderEmail,
                subject: subject,
                template_id: selectedTemplate?.id,
                html_content: customEmailText,
                recipients: JSON.stringify(candidates)
            };
            await api.post('/api/drafts', draftData);
            toast.success('Draft saved successfully');
            fetchDrafts();
        } catch {
            toast.error('Failed to save draft');
        } finally {
            setSavingDraft(false);
        }
    };

    const loadDraft = async (draft) => {
        if (!await confirm({ title: 'Load Draft', description: 'Load this draft? Current changes will be overwritten.' })) return;
        setSenderEmail(draft.sender_email);
        setSubject(draft.subject || '');
        setCustomEmailText(draft.html_content || '');
        if (draft.template_id) {
            // We need to find the full template object if possible, 
            // but CampaignContext might expect just ID or full object depending on implementation.
            // Looking at CampaignContext: setSelectedTemplate sets the object and updates subject/vars.
            // But here we might not have the full object if templates aren't loaded or searched.
            // Let's assume templates are available.
            const tmpl = templates.find(t => t.id === draft.template_id);
            if (tmpl) setSelectedTemplate(tmpl); // Context handles the rest
        }
        if (draft.recipients) {
            try {
                setCandidates(JSON.parse(draft.recipients));
            } catch { console.error("Bad recipients JSON"); }
        }
        setShowDrafts(false);
        toast.success('Draft loaded');
    };

    const deleteDraft = async (id, e) => {
        e.stopPropagation();
        if (!await confirm({ title: 'Delete Draft', description: 'Are you sure you want to delete this draft?', variant: 'destructive' })) return;
        try {
            await api.delete(`/api/drafts/${id}`);
            fetchDrafts();
            toast.success('Draft deleted');
        } catch { toast.error('Failed to delete draft'); }
    };

    return {
        drafts,
        showDrafts,
        setShowDrafts,
        savingDraft,
        saveDraft,
        loadDraft,
        deleteDraft,
        fetchDrafts
    };
};
