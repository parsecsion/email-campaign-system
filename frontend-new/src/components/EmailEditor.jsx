import React, { useState, useRef } from 'react';
import { Bold, ChevronDown, User, FileText, Mail, Clipboard, Save, Trash2, X, Plus, Edit2, Info } from 'lucide-react';
import SmoothTabTransition from './SmoothTabTransition';
import { useCampaign } from '../context/CampaignContext';
import { convertTextToHtml, extractVariables, stripHtml } from '../utils/textUtils';
import { useDrafts } from '../hooks/useDrafts';
import { toast } from 'sonner';

import Modal from './ui/Modal';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useConfirm } from '../hooks/useConfirm';

const EmailEditor = () => {
    // Confirmation Hook
    const { confirm, ConfirmDialog } = useConfirm();

    const {
        senderEmail,
        setSenderEmail,
        companyEmails,
        subject,
        setSubject,
        emailTemplateTab,
        setEmailTemplateTab,
        templates,
        loadingTemplates,
        selectedTemplate,
        setSelectedTemplate,
        customEmailText,
        setCustomEmailText,
        formattedCustomEmail,
        setFormattedCustomEmail,
        detectedVariables,
        setDetectedVariables,
        candidates, // Needed for drafts
        setCandidates, // Needed for drafts
        saveTemplate,
        deleteTemplate,
        statusMappings, // New
        updateStatusMapping // New
    } = useCampaign();

    // Init useDrafts hook
    const {
        drafts,
        showDrafts,
        setShowDrafts,
        savingDraft,
        saveDraft,
        loadDraft,
        deleteDraft
    } = useDrafts(
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
        confirm // Pass confirm hook
    );

    const textareaRef = useRef(null);
    const [showVariableGuide, setShowVariableGuide] = useState(false);

    // Template Management State
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [templateForm, setTemplateForm] = useState({
        name: '',
        subject: '',
        html_content: '',
        plain_content: ''
    });

    const [modalView, setModalView] = useState('html'); // 'html' or 'text'
    const [linkedStatus, setLinkedStatus] = useState('none'); // New state for modal

    // Email Format State
    const [emailFormat, setEmailFormat] = useState('html'); // 'html' or 'plain' (was 'branded')

    // Status Options
    const interviewStatuses = [
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'rescheduled', label: 'Rescheduled' },
        { value: 'cancelled', label: 'Cancelled' },
        { value: 'completed', label: 'Completed' },
        { value: 'absent', label: 'Absent' }
    ];

    // Template Management Handlers
    const handleCreateTemplate = () => {
        setEditingTemplate(null);
        setTemplateForm({ name: '', subject: '', html_content: '', plain_content: '' });
        setLinkedStatus('none');
        setModalView('html');
        setShowTemplateModal(true);
    };

    const handleEditTemplate = (template) => {
        setEditingTemplate(template);

        let html = template.html_template || '';
        let plain = template.plain_content || '';

        // Auto-fill missing counterparts
        if (!plain && html) plain = stripHtml(html);
        if (!html && plain) html = convertTextToHtml(plain, 'plain');

        setTemplateForm({
            name: template.name,
            subject: template.subject,
            html_content: html,
            plain_content: plain
        });

        // Find linked status
        const status = Object.keys(statusMappings).find(key => statusMappings[key] === template.id) || 'none';
        setLinkedStatus(status);

        setModalView('html');
        setShowTemplateModal(true);
    };

    // ... 

    const handleSaveTemplate = async () => {
        if (!templateForm.name || !templateForm.html_content) {
            toast.error('Name and HTML Content are required');
            return;
        }

        try {
            const variables = extractVariables(templateForm.html_content);
            const data = {
                ...templateForm,
                variables,
                plain_content: templateForm.plain_content || templateForm.html_content.replace(/<[^>]*>?/gm, ''), // Fallback to auto-strip if empty
                isNew: !editingTemplate,
                id: editingTemplate?.id
            };

            const savedTemplate = await saveTemplate(data);

            // Handle Status Mapping Update
            if (linkedStatus !== 'none') {
                // If we selected a status, map it to this template ID
                // If it's a new template, savedTemplate.id is the new ID
                if (savedTemplate && savedTemplate.id) {
                    // Check if this status was mapped to something else? updateStatusMapping handles overwrite.
                    // Also check if this template was mapped to OTHER statuses? 
                    // The requirement implies 1 status -> 1 template (dropdown selection). 
                    // If we switch status from 'Pending' to 'Confirmed', we should probably UNMAP 'Pending'?
                    // The logic below only SETS the new mapping.
                    // To be cleaner:
                    // 1. Find if this template was mapped to any status previously (if editing)
                    //    Actually `handleEditTemplate` found `const status`.
                    //    If `status` (old) != `linkedStatus` (new), we should unmap old?
                    //    `updateStatusMapping` only sets.
                    // Let's rely on the user. If they change it, we update. 
                    // Ideally we should unmap the old one if it's different.

                    // Let's implement unmapping if we can. 
                    // But `updateStatusMapping` takes (status, templateId). 
                    // If I want to unmap 'Pending', I call updateStatusMapping('pending', 'none').

                    const oldStatus = Object.keys(statusMappings).find(key => statusMappings[key] === savedTemplate.id);
                    if (oldStatus && oldStatus !== linkedStatus) {
                        await updateStatusMapping(oldStatus, 'none');
                    }

                    await updateStatusMapping(linkedStatus, savedTemplate.id);
                }
            } else {
                // If set to none, we should unmap if it was mapped
                const oldStatus = Object.keys(statusMappings).find(key => statusMappings[key] === (editingTemplate?.id || savedTemplate?.id));
                if (oldStatus) {
                    await updateStatusMapping(oldStatus, 'none');
                }
            }

            toast.success(editingTemplate ? 'Template updated' : 'Template created');
            closeTemplateModal();
        } catch (error) {
            toast.error('Failed to save template: ' + error.message);
        }
    };

    const handleFormatEmail = () => {
        if (!customEmailText.trim()) {
            return;
        }
        const variables = extractVariables(customEmailText);
        setDetectedVariables(variables);

        const html = convertTextToHtml(customEmailText, emailFormat);
        setFormattedCustomEmail(html);
    };

    const insertTag = (tag, endTag = null) => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = customEmailText.substring(start, end);
        const closeTag = endTag || `</${tag}>`;

        // If nothing selected, just insert the tags with cursor in between
        // If selected, wrap selection
        const newText = customEmailText.substring(0, start) +
            `<${tag}>` + selectedText + closeTag +
            customEmailText.substring(end);

        setCustomEmailText(newText);
        setFormattedCustomEmail(null);
        setDetectedVariables([]);

        setTimeout(() => {
            textarea.focus();
            if (selectedText) {
                // Select the wrapped text
                textarea.setSelectionRange(start, end + tag.length * 2 + 5);
            } else {
                // Place cursor between tags
                textarea.setSelectionRange(start + tag.length + 2, start + tag.length + 2);
            }
        }, 0);
    };

    const handleBold = () => insertTag('b');
    const handleItalic = () => insertTag('i');
    const handleUnderline = () => insertTag('u');

    const handleDeleteTemplate = async (id) => {
        if (await confirm({ title: 'Delete Template', description: 'Are you sure you want to delete this template?', variant: 'destructive' })) {
            try {
                await deleteTemplate(id);
                toast.success('Template deleted successfully');
            } catch (error) {
                toast.error('Failed to delete template: ' + error.message);
            }
        }
    };

    const handleInsertVariable = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const placeholder = "{Variable}";

        const newText = customEmailText.substring(0, start) +
            placeholder +
            customEmailText.substring(end);

        setCustomEmailText(newText);
        setFormattedCustomEmail(null);
        setDetectedVariables([]); // Will be re-detected on format

        setTimeout(() => {
            textarea.focus();
            // Select the word "Variable" inside the braces
            textarea.setSelectionRange(start + 1, start + placeholder.length - 1);
        }, 0);
    };

    const closeTemplateModal = () => {
        setShowTemplateModal(false);
        setEditingTemplate(null);
    };

    // Render Modal Content
    return (
        <div className="ink-card relative">
            <ConfirmDialog />
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Edit2 className="h-5 w-5 text-gray-500" /> Email Template
                </h3>
            </div>

            {/* Tabs */}
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setEmailTemplateTab('templates')}
                        className={`px-4 py-3 text-sm font-medium transition-all ${emailTemplateTab === 'templates'
                            ? 'bg-black text-white'
                            : 'border border-gray-300 text-gray-700 hover:border-black'
                            }`}
                    >
                        Templates
                    </button>
                    <button
                        onClick={() => setEmailTemplateTab('compose')}
                        className={`px-4 py-3 text-sm font-medium transition-all ${emailTemplateTab === 'compose'
                            ? 'bg-black text-white'
                            : 'border border-gray-300 text-gray-700 hover:border-black'
                            }`}
                    >
                        Compose
                    </button>
                </div>
            </div>

            {/* Email Configuration */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Mail className="text-black" size={16} />
                        <h3 className="text-sm font-semibold text-black uppercase tracking-wide">Email Configuration</h3>
                    </div>

                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-black mb-2 uppercase tracking-wide flex items-center gap-1">
                            <User size={12} />
                            Sender Email
                        </label>
                        <Select
                            value={senderEmail}
                            onValueChange={setSenderEmail}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Sender Email" />
                            </SelectTrigger>
                            <SelectContent>
                                {companyEmails.map(email => (
                                    <SelectItem key={email} value={email}>{email}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-black mb-2 uppercase tracking-wide flex items-center gap-1">
                            <FileText size={12} />
                            Email Subject
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter subject line"
                            className="w-full px-4 py-2 border border-gray-300 text-sm transition-all bg-white hover:border-black focus:border-black focus:ring-2 focus:ring-black focus:ring-opacity-20 outline-none"
                        />
                    </div>
                </div>
            </div>

            <SmoothTabTransition>
                {/* Template Selection Tab */}
                {emailTemplateTab === 'templates' && (
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex justify-between items-center mb-3">
                            <label className="block text-xs font-semibold text-black uppercase tracking-wide">
                                Select Template
                            </label>
                            <button
                                onClick={handleCreateTemplate}
                                className="text-xs flex items-center gap-1 text-white bg-black hover:bg-gray-800 transition-colors px-2 py-1 rounded"
                            >
                                <Plus size={12} />
                                <span className="hidden sm:inline">New Template</span>
                            </button>
                        </div>
                        {loadingTemplates ? (
                            <div className="text-center py-8 text-gray-500">Loading templates...</div>
                        ) : templates.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No templates available</div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto no-scrollbar p-4">
                                {templates.map(template => (
                                    <div
                                        key={template.id}
                                        className={`template-item border p-3 cursor-pointer transition-all group relative ${selectedTemplate && selectedTemplate.id === template.id
                                            ? 'border-black bg-gray-50'
                                            : 'border-gray-200 hover:border-black'
                                            }`}
                                        onClick={() => setSelectedTemplate(template.id)}
                                    >
                                        <div className="template-content flex justify-between items-start">
                                            <div className="flex-1 pr-8">
                                                <p className="font-semibold text-black text-sm">{template.name}</p>
                                                <p className="text-xs text-gray-600 mt-1 truncate">{template.subject}</p>
                                                {template.variables && template.variables.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {template.variables.map(v => (
                                                            <span key={v} className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-[10px] rounded font-mono">
                                                                {v}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            {selectedTemplate && selectedTemplate.id === template.id && (
                                                <div className="w-2 h-2 rounded-full bg-black mt-1.5 flex-shrink-0"></div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded backdrop-blur-sm">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEditTemplate(template); }}
                                                className="p-1 hover:bg-gray-200 rounded text-gray-600 hover:text-black"
                                                title="Edit Template"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            {!template.is_system && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(template.id); }}
                                                    className="p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600"
                                                    title="Delete Template"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Compose Tab */}
                {emailTemplateTab === 'compose' && (
                    <div className="px-6 py-4 border-b border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <label className="block text-xs font-semibold text-black uppercase tracking-wide">
                                Custom Email Body
                            </label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowDrafts(true)}
                                    className="text-xs flex items-center gap-1 text-gray-600 hover:text-black transition-colors px-2 py-1 border border-transparent hover:border-gray-200 rounded"
                                >
                                    <FileText size={12} />
                                    <span>Drafts ({drafts.length})</span>
                                </button>
                                <button
                                    onClick={saveDraft}
                                    disabled={savingDraft || !customEmailText.trim()}
                                    className="text-xs flex items-center gap-1 text-gray-600 hover:text-black transition-colors px-2 py-1 border border-transparent hover:border-gray-200 rounded disabled:opacity-50"
                                >
                                    <Save size={12} />
                                    <span>{savingDraft ? 'Saving...' : 'Save Draft'}</span>
                                </button>
                                <div className="w-px bg-gray-300 mx-1"></div>
                                <button
                                    onClick={() => setShowVariableGuide(true)}
                                    className="text-xs flex items-center gap-1 text-gray-500 hover:text-black transition-colors"
                                    title="See Variables Guide"
                                >
                                    <Clipboard size={12} />
                                    <span>Variables Guide</span>
                                </button>
                            </div>
                        </div>
                        <div className="border border-gray-300 rounded-sm overflow-hidden focus-within:ring-1 focus-within:ring-black transition-all">
                            {/* Toolbar */}
                            <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 flex flex-wrap gap-3 text-gray-600 items-center justify-between">
                                <div className="flex gap-3 items-center">
                                    <button type="button" onClick={handleBold} className="hover:text-black font-bold text-xs" title="Bold">B</button>
                                    <button type="button" onClick={handleItalic} className="hover:text-black italic text-xs" title="Italic">I</button>
                                    <button type="button" onClick={handleUnderline} className="hover:text-black underline text-xs" title="Underline">U</button>
                                    <div className="w-px bg-gray-300 mx-1 h-3"></div>
                                    <button type="button" onClick={handleInsertVariable} className="hover:text-black text-xs flex items-center gap-1" title="Insert Variable">
                                        <span className="text-[10px]">{`{ }`}</span>
                                        Variable
                                    </button>
                                </div>
                                <div className="flex items-center gap-2 bg-gray-200 rounded p-0.5">
                                    <button
                                        onClick={() => setEmailFormat('html')}
                                        className={`text-[10px] px-2 py-0.5 rounded transition-all ${emailFormat === 'html' ? 'bg-white shadow text-black font-semibold' : 'text-gray-500 hover:text-black'}`}
                                        title="Paste your own HTML code"
                                    >
                                        HTML Code
                                    </button>
                                    <button
                                        onClick={() => setEmailFormat('plain')}
                                        className={`text-[10px] px-2 py-0.5 rounded transition-all ${emailFormat === 'plain' ? 'bg-white shadow text-black font-semibold' : 'text-gray-500 hover:text-black'}`}
                                        title="Simple text email (auto-formatted)"
                                    >
                                        Text
                                    </button>
                                </div>
                            </div>
                            <textarea
                                ref={textareaRef}
                                value={customEmailText}
                                onChange={(e) => {
                                    setCustomEmailText(e.target.value);
                                    setFormattedCustomEmail(null);
                                    setDetectedVariables([]);
                                }}
                                onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
                                        e.preventDefault();
                                        handleBold();
                                    }
                                }}
                                placeholder="Enter your email content here..."
                                className="w-full px-4 py-3 text-sm font-mono h-64 outline-none resize-none"
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Tip: Use {`{Variable}`} syntax to insert dynamic data.
                        </p>
                        <div className="mt-4">
                            <button
                                onClick={handleFormatEmail}
                                disabled={!customEmailText.trim()}
                                className="w-full btn-primary text-white px-6 py-4 font-bold text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Format Email
                            </button>
                        </div>

                    </div>
                )}
            </SmoothTabTransition>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-600">
                    {emailTemplateTab === 'templates' ? (
                        selectedTemplate ? (
                            <>Template uses variables: {selectedTemplate.variables.map(v => `{${v}}`).join(', ')}</>
                        ) : (
                            <>Select a template to preview and send emails</>
                        )
                    ) : (
                        formattedCustomEmail ? (
                            <>Custom email formatted and ready to send. {detectedVariables.length > 0 ? `Variables detected: ${detectedVariables.map(v => `{${v}}`).join(', ')}` : 'No variables detected.'}</>
                        ) : customEmailText.trim() ? (
                            <>Click "Format Email" to format your email and see preview</>
                        ) : (
                            <>Enter your email content above</>
                        )
                    )}
                </p>
            </div>

            {/* Drafts Modal */}
            <Modal
                isOpen={showDrafts}
                onClose={() => setShowDrafts(false)}
                title="Saved Drafts"
                maxWidth="max-w-lg"
            >
                <div className="max-h-[60vh] overflow-y-auto space-y-2">
                    {drafts.length === 0 && <p className="text-gray-500 text-center py-4">No drafts saved.</p>}
                    {drafts.map(d => (
                        <div key={d.id} onClick={() => loadDraft(d)} className="border p-3 rounded hover:bg-gray-50 cursor-pointer flex justify-between items-center group transition-colors">
                            <div>
                                <p className="font-bold text-sm text-black">{d.subject || '(No Subject)'}</p>
                                <p className="text-xs text-gray-500 mt-1">{new Date(d.updated_at).toLocaleString()}</p>
                            </div>
                            <button
                                onClick={(e) => deleteDraft(d.id, e)}
                                className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                                title="Delete Draft"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </Modal>

            {/* Template Management Modal */}
            <Modal
                isOpen={showTemplateModal}
                onClose={closeTemplateModal}
                title={editingTemplate ? 'Edit Template' : 'Create New Template'}
                maxWidth="max-w-xl"
                footer={
                    <>
                        <button
                            onClick={closeTemplateModal}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded text-sm font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveTemplate}
                            disabled={!templateForm.name || !templateForm.html_content}
                            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 text-sm font-bold"
                        >
                            {editingTemplate ? 'Update Template' : 'Create Template'}
                        </button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Template Name</label>
                            <input
                                type="text"
                                value={templateForm.name}
                                onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })}
                                placeholder="e.g., Follow-up Email"
                                className="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-black outline-none transition-all h-[42px]"
                            />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <label className="block text-sm font-semibold">Linked Status</label>
                                <div className="group relative">
                                    <Info size={14} className="text-gray-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none text-center">
                                        Auto-selects this template for status.
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                                    </div>
                                </div>
                            </div>
                            <Select
                                value={linkedStatus}
                                onValueChange={setLinkedStatus}
                            >
                                <SelectTrigger className="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-black outline-none transition-all h-[42px]">
                                    <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">-- None --</SelectItem>
                                    {interviewStatuses.map(s => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1">Subject Line</label>
                        <input
                            type="text"
                            value={templateForm.subject}
                            onChange={e => setTemplateForm({ ...templateForm, subject: e.target.value })}
                            placeholder="Email Subject"
                            className="w-full px-3 py-2 border rounded focus:ring-1 focus:ring-black outline-none transition-all"
                        />
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-sm font-semibold">Content</label>
                            <div className="flex bg-gray-100 rounded p-0.5">
                                <button
                                    onClick={() => {
                                        if (modalView !== 'html') {
                                            // Switching to HTML
                                            // If HTML is empty and we have plain text, auto-convert
                                            if (!templateForm.html_content && templateForm.plain_content) {
                                                setTemplateForm(prev => ({ ...prev, html_content: convertTextToHtml(prev.plain_content, 'plain') }));
                                            }
                                            setModalView('html');
                                        }
                                    }}
                                    className={`px-3 py-1 text-xs font-medium rounded transition-all ${modalView === 'html' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}
                                >
                                    HTML
                                </button>
                                <button
                                    onClick={() => {
                                        if (modalView !== 'text') {
                                            // Switching to Text
                                            // If text is empty and we have HTML, auto-strip
                                            if (!templateForm.plain_content && templateForm.html_content) {
                                                setTemplateForm(prev => ({ ...prev, plain_content: stripHtml(prev.html_content) }));
                                            }
                                            setModalView('text');
                                        }
                                    }}
                                    className={`px-3 py-1 text-xs font-medium rounded transition-all ${modalView === 'text' ? 'bg-white shadow text-black' : 'text-gray-500 hover:text-black'}`}
                                >
                                    Plain Text
                                </button>
                            </div>
                        </div>

                        <div className="border rounded focus-within:ring-1 focus-within:ring-black transition-all">
                            {modalView === 'html' ? (
                                <textarea
                                    value={templateForm.html_content}
                                    onChange={e => setTemplateForm({ ...templateForm, html_content: e.target.value })}
                                    placeholder="<html>...</html>"
                                    className="w-full px-3 py-2 h-64 font-mono text-xs outline-none resize-none"
                                />
                            ) : (
                                <textarea
                                    value={templateForm.plain_content}
                                    onChange={e => setTemplateForm({ ...templateForm, plain_content: e.target.value })}
                                    placeholder="Enter plain text version..."
                                    className="w-full px-3 py-2 h-64 font-mono text-xs outline-none resize-none"
                                />
                            )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Variables detected: {extractVariables(modalView === 'html' ? templateForm.html_content : templateForm.plain_content).join(', ')}
                        </p>
                    </div>
                </div>
            </Modal>

            {/* Variable Guide Modal */}
            <Modal
                isOpen={showVariableGuide}
                onClose={() => setShowVariableGuide(false)}
                title="How to Use Variables"
                maxWidth="max-w-md"
                footer={
                    <button
                        onClick={() => setShowVariableGuide(false)}
                        className="bg-black text-white px-4 py-2 text-sm font-bold rounded hover:bg-gray-800 transition-all"
                    >
                        Got it
                    </button>
                }
            >
                <div className="space-y-4 text-sm text-gray-700">
                    <p>
                        Personalize your emails by using <strong>variables</strong>. Variables are placeholders that get replaced with actual data from your recipient list when the email is sent.
                    </p>

                    <div className="bg-gray-50 p-3 rounded-md border border-gray-100">
                        <h4 className="font-bold text-gray-900 mb-2 text-xs uppercase">Syntax</h4>
                        <p className="font-mono text-xs bg-white p-1 rounded border inline-block mb-2">{`{VariableName}`}</p>
                        <p className="text-xs text-gray-500">
                            Wrap the column header name in single curly braces. Capitalization doesn't matter (e.g., {`{name}`} is the same as {`{Name}`}).
                        </p>
                    </div>

                    <div className="space-y-2">
                        <h4 className="font-bold text-gray-900 text-xs uppercase">Common Variables</h4>
                        <ul className="list-disc pl-4 space-y-1 text-xs">
                            <li><strong>{`{Name}`}</strong>: Automatically extracts the <em>first name</em> (e.g., "John Doe" → "John").</li>
                            <li><strong>{`{Email}`}</strong>: The recipient's email address.</li>
                            <li><strong>{`{Company}`}</strong>: The company name (if present in your CSV/Database).</li>
                            <li><strong>{`{Position}`}</strong>: The job title (if present).</li>
                        </ul>
                    </div>

                    <div className="bg-blue-50 p-3 rounded-md text-blue-800 text-xs">
                        <strong>Dynamic Fields:</strong> Any column in your uploaded CSV or database can be used as a variable. If you have a column named "Industry", just use <code>{`{Industry}`}</code>.
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default EmailEditor;
