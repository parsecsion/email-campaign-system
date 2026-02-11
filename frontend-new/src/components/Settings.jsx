
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import api from '../utils/api';
import { Mail, Shield, Save, RotateCcw, Plus, Trash2, CheckCircle, X, AlertCircle, Server, Activity, Database, Key, Cpu, UserPlus, Terminal, FileText, LayoutTemplate, Edit } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Switch } from './ui/switch';
import { ToastSave } from './ui/toast-save';
import SmtpConfigModal from './SmtpConfigModal';
import { AgentSettings } from './settings/AgentSettings';

import { useConfirm } from '../hooks/useConfirm';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const Settings = ({ companyEmails, setCompanyEmails, senderEmail, setSenderEmail }) => {
    // Confirmation Hook
    const { confirm, ConfirmDialog } = useConfirm();

    const [loading, setLoading] = useState(true);

    // Toast Save State
    const [saveStatus, setSaveStatus] = useState("initial");
    const [isDirty, setIsDirty] = useState(false);
    const originalSettingsRef = useRef(null);

    // Settings State
    const [appName, setAppName] = useState('Email Campaign System');
    const [adminEmail, setAdminEmail] = useState('');
    const [recruitmentCountries, setRecruitmentCountries] = useState(['US', 'UK']);
    const [newCountry, setNewCountry] = useState('');
    const [defaultCountry, setDefaultCountry] = useState('US');

    // Email Config
    const [authorizedSenders, setAuthorizedSenders] = useState([]); // Array of {name, email}
    const [smtpConfigs, setSmtpConfigs] = useState({}); // Map of email -> {host, port, user, password}
    const [replyTo, setReplyTo] = useState('');
    const [dailyLimit, setDailyLimit] = useState(500);
    const [rateLimitDelay, setRateLimitDelay] = useState(2.0);

    // System Data
    const [systemStats, setSystemStats] = useState(null);
    const [logs, setLogs] = useState([]);
    const [health, setHealth] = useState(null);

    // Agent Settings
    const [apiKey, setApiKey] = useState('');
    const [agentModels, setAgentModels] = useState([]);
    const [defaultModel, setDefaultModel] = useState('');
    // Email Templates
    const [statusEmailMappings, setStatusEmailMappings] = useState({});

    // Helper to get current state object
    const getCurrentSettings = useCallback(() => ({
        app_name: appName,
        admin_email: adminEmail,
        recruitment_countries: recruitmentCountries,
        default_country: defaultCountry,
        authorized_senders: authorizedSenders,
        smtp_configs: smtpConfigs,
        reply_to: replyTo,
        daily_send_limit: Number(dailyLimit),
        email_rate_limit: Number(rateLimitDelay),
        agent_api_key: apiKey,
        agent_models: agentModels,
        agent_default_model: defaultModel,
        status_email_mappings: statusEmailMappings
    }), [appName, adminEmail, recruitmentCountries, defaultCountry, authorizedSenders, smtpConfigs, replyTo, dailyLimit, rateLimitDelay, apiKey, agentModels, defaultModel, statusEmailMappings]);

    // Check Dirty Status
    useEffect(() => {
        if (!originalSettingsRef.current) return;
        const current = getCurrentSettings();
        const original = originalSettingsRef.current;
        const dirty = JSON.stringify(current) !== JSON.stringify(original);
        setIsDirty(dirty);

        if (!dirty && saveStatus === 'success') {
            setTimeout(() => setSaveStatus('initial'), 2000);
        }
    }, [getCurrentSettings, saveStatus]);

    // Prevent Unload if Dirty
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    // Initial Load
    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = async () => {
        setLoading(true);
        try {
            await Promise.allSettled([
                fetchSettings(),
                fetchSystemStats(),
                fetchLogs(),
                fetchHealth() // if exists
            ]);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await api.get('/api/settings');
            const s = res.data.settings || {};

            if (s.app_name) setAppName(s.app_name);
            if (s.admin_email) setAdminEmail(s.admin_email);
            if (s.recruitment_countries) setRecruitmentCountries(s.recruitment_countries);
            if (s.default_country) setDefaultCountry(s.default_country);
            if (s.authorized_senders) setAuthorizedSenders(s.authorized_senders);

            // SMTP Configs: Ensure it's an object
            let smtpParams = s.smtp_configs || {};
            if (typeof smtpParams === 'string') {
                try { smtpParams = JSON.parse(smtpParams); } catch (e) { }
            }
            setSmtpConfigs(smtpParams);

            if (s.reply_to) setReplyTo(s.reply_to);
            if (s.daily_send_limit) setDailyLimit(s.daily_send_limit);
            if (s.email_rate_limit) setRateLimitDelay(s.email_rate_limit);

            // Agent Settings
            if (s.agent_api_key) setApiKey(s.agent_api_key);

            let models = s.agent_models || [];
            if (typeof models === 'string') {
                try { models = JSON.parse(models); } catch (e) { }
            }
            setAgentModels(models);

            if (s.agent_default_model) setDefaultModel(s.agent_default_model);

            // Status Mappings
            let mappings = s.status_email_mappings || {};
            if (typeof mappings === 'string') {
                try { mappings = JSON.parse(mappings); } catch (e) { }
            }
            setStatusEmailMappings(mappings);

            // Set Original Reference
            originalSettingsRef.current = {
                app_name: s.app_name || 'Email Campaign System',
                admin_email: s.admin_email || '',
                recruitment_countries: s.recruitment_countries || ['US', 'UK'],
                default_country: s.default_country || 'US',
                authorized_senders: s.authorized_senders || [],
                smtp_configs: smtpParams,
                reply_to: s.reply_to || '',
                daily_send_limit: Number(s.daily_send_limit || 500),
                email_rate_limit: Number(s.email_rate_limit || 2.0),
                agent_api_key: s.agent_api_key || '',
                agent_models: models,
                agent_default_model: s.agent_default_model || '',
                status_email_mappings: mappings
            };
            setIsDirty(false);

        } catch (error) {
            console.error("Failed to load settings", error);
        }
    };

    const fetchSystemStats = async () => {
        try {
            const res = await api.get('/api/system/stats');
            setSystemStats(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchLogs = async () => {
        try {
            const res = await api.get('/api/system/logs');
            setLogs(res.data.logs || []);
        } catch (e) { console.error(e); }
    };

    const fetchHealth = async () => {
        try {
            const res = await api.get('/api/health'); // Assuming this exists or we built it
            setHealth(res.data);
        } catch (e) { console.error(e); }
    };

    // --- Actions ---

    const saveSettings = async () => {
        setSaveStatus("loading");
        try {
            const payload = {
                company_emails: authorizedSenders.map(s => s.email),
                ...getCurrentSettings()
            };

            await api.post('/api/settings', payload);

            // Immediately reflect sender changes in global app state so Sender page updates without reload
            const updatedEmails = authorizedSenders.map(s => s.email);
            if (typeof setCompanyEmails === 'function') {
                setCompanyEmails(updatedEmails);
            }
            if (typeof setSenderEmail === 'function') {
                setSenderEmail(prev => {
                    if (updatedEmails.includes(prev)) return prev;
                    return updatedEmails.length > 0 ? updatedEmails[0] : '';
                });
            }

            originalSettingsRef.current = getCurrentSettings();
            setIsDirty(false);

            setSaveStatus("success");
            setTimeout(() => {
                setSaveStatus("initial");
            }, 3000);

            toast.success('Settings saved successfully!');
        } catch (error) {
            console.error("Save failed", error);
            toast.error('Failed to save settings.');
            setSaveStatus("initial");
        }
    };

    const resetSettings = () => {
        if (!originalSettingsRef.current) return;
        const o = originalSettingsRef.current;

        setAppName(o.app_name);
        setAdminEmail(o.admin_email);
        setRecruitmentCountries(o.recruitment_countries);
        setDefaultCountry(o.default_country);
        setAuthorizedSenders(o.authorized_senders);
        setSmtpConfigs(o.smtp_configs);
        setReplyTo(o.reply_to);
        setDailyLimit(o.daily_send_limit);
        setReplyTo(o.reply_to);
        setDailyLimit(o.daily_send_limit);
        setRateLimitDelay(o.email_rate_limit);
        setApiKey(o.agent_api_key);
        setAgentModels(o.agent_models);
        setDefaultModel(o.agent_default_model);

        setIsDirty(false);
        toast.info("Changes reverted");
    };

    const clearLogs = async () => {
        if (!await confirm({ title: 'Clear Logs', description: 'Are you sure you want to clear the system logs? This cannot be undone.', variant: 'destructive' })) return;
        try {
            await api.post('/api/system/logs/clear');
            fetchLogs();
            toast.success("Logs cleared.");
        } catch (e) { toast.error("Failed to clear logs."); }
    };

    // --- Sub-Components Logic ---

    // Countries
    const addCountry = () => {
        if (newCountry && !recruitmentCountries.includes(newCountry)) {
            setRecruitmentCountries([...recruitmentCountries, newCountry]);
            setNewCountry('');
        }
    };
    const removeCountry = (c) => {
        setRecruitmentCountries(recruitmentCountries.filter(x => x !== c));
        if (defaultCountry === c) setDefaultCountry('US'); // Fallback
    };

    // Senders
    const [newSenderName, setNewSenderName] = useState('');
    const [newSenderEmail, setNewSenderEmail] = useState('');

    // Email Validation Helper
    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const addSender = () => {
        if (!newSenderName || !newSenderEmail) return toast.error("Name and Email required");
        if (!isValidEmail(newSenderEmail)) return toast.error("Invalid email format");

        setAuthorizedSenders([...authorizedSenders, { name: newSenderName, email: newSenderEmail }]);
        setNewSenderName('');
        setNewSenderEmail('');
    };
    const removeSender = (email) => {
        setAuthorizedSenders(authorizedSenders.filter(s => s.email !== email));
        // Also remove config if exists
        const newConfigs = { ...smtpConfigs };
        delete newConfigs[email];
        setSmtpConfigs(newConfigs);
    };

    // SMTP Config Modal
    const [editingSmtp, setEditingSmtp] = useState(null); // Email string
    const [smtpForm, setSmtpForm] = useState({ host: '', port: '587', user: '', password: '' });

    const openSmtpConfig = (email) => {
        const existing = smtpConfigs[email] || { host: '', port: '587', user: email, password: '' };
        setSmtpForm(existing);
        setEditingSmtp(email);
    };

    const saveSmtpConfig = () => {
        setSmtpConfigs({ ...smtpConfigs, [editingSmtp]: smtpForm });
        setEditingSmtp(null);
    };

    // Reusable styles
    const tabTriggerClass = "px-6 py-2.5 rounded-md text-sm font-semibold transition-all data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm text-gray-500 hover:text-gray-900";

    return (
        <div className="max-w-[1600px] mx-auto p-4 lg:p-8">
            <ConfirmDialog />
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-gray-500 mt-1">Manage application configuration and system health.</p>
                </div>
                <div className="h-12 min-w-[200px] flex justify-end">
                    {(isDirty || saveStatus !== 'initial') && (
                        <ToastSave
                            state={saveStatus}
                            onSave={saveSettings}
                            onReset={resetSettings}
                            initialText="Unsaved changes"
                        />
                    )}
                </div>
            </div>

            <Tabs defaultValue="general" className="w-full space-y-8">
                {/* Tabs Navigation - Matching CandidateManager styling */}
                <div className="bg-gray-100 p-1.5 rounded-lg inline-flex space-x-1">
                    <TabsList className="bg-transparent p-0 h-auto gap-1">
                        <TabsTrigger value="general" className={tabTriggerClass}>
                            General
                        </TabsTrigger>
                        <TabsTrigger value="recruitment" className={tabTriggerClass}>
                            Recruitment
                        </TabsTrigger>
                        <TabsTrigger value="email" className={tabTriggerClass}>
                            Email Configuration
                        </TabsTrigger>
                        <TabsTrigger value="system" className={tabTriggerClass}>
                            System & Logs
                        </TabsTrigger>
                        <TabsTrigger value="agent" className={tabTriggerClass}>
                            AI Agent
                        </TabsTrigger>
                        <TabsTrigger value="templates" className={tabTriggerClass}>
                            Email Templates
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* --- TAB CONTENT --- */}

                <TabsContent value="general" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="ink-card bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Activity className="h-5 w-5 text-gray-500" /> General Settings
                            </h3>
                        </div>
                        <div className="p-6 space-y-6 max-w-2xl">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Application Name</label>
                                <input
                                    value={appName}
                                    onChange={e => setAppName(e.target.value)}
                                    className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                                />
                                <p className="text-xs text-gray-500">Visible in browser title and system emails.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Administrator Email</label>
                                <input
                                    value={adminEmail}
                                    readOnly
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-md text-gray-500 cursor-not-allowed"
                                />
                                <p className="text-xs text-gray-500">Contact system admin to change this.</p>
                            </div>

                            <div className="space-y-2 pt-4">
                                <div className="flex items-center space-x-2">
                                    <Switch id="dark-mode" />
                                    <label htmlFor="dark-mode" className="text-sm font-medium text-gray-700 cursor-pointer">Dark Mode (Coming Soon)</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>


                <TabsContent value="recruitment" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="ink-card bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Database className="h-5 w-5 text-gray-500" /> Active Markets
                            </h3>
                        </div>
                        <div className="p-6 space-y-6 max-w-3xl">
                            <div className="flex gap-2">
                                <input
                                    placeholder="Add Country Code (e.g. DE, FR)"
                                    value={newCountry}
                                    onChange={e => setNewCountry(e.target.value.toUpperCase())}
                                    className="flex-1 p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-black outline-none"
                                    maxLength={3}
                                />
                                <button onClick={addCountry} className="bg-gray-100 text-black px-4 py-2 rounded-md font-medium hover:bg-gray-200 border border-gray-300 flex items-center gap-2">
                                    <Plus size={18} /> Add
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {recruitmentCountries.map(c => (
                                    <div key={c} className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 border border-gray-200">
                                        {c}
                                        <button onClick={() => removeCountry(c)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={14} /></button>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-4 border-t border-gray-100">
                                <label className="text-sm font-medium text-gray-700 block mb-2">Default Country for New Candidates</label>
                                <Select
                                    value={defaultCountry}
                                    onValueChange={(value) => setDefaultCountry(value)}
                                >
                                    <SelectTrigger className="w-full md:w-1/3">
                                        <SelectValue placeholder="Select Country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {recruitmentCountries.map(c => (
                                            <SelectItem key={c} value={c}>{c}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </TabsContent>


                <TabsContent value="email" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* LEFT: Sender Identities */}
                        <div className="md:col-span-2 space-y-6">
                            <div className="ink-card bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Mail className="h-5 w-5 text-gray-500" /> Sender Identities
                                    </h3>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <input
                                            placeholder="Sender Name (e.g. John Doe)"
                                            value={newSenderName}
                                            onChange={e => setNewSenderName(e.target.value)}
                                            className="p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-black outline-none"
                                        />
                                        <div className="flex gap-2">
                                            <input
                                                placeholder="Email Address"
                                                value={newSenderEmail}
                                                onChange={e => setNewSenderEmail(e.target.value)}
                                                className="flex-1 p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-black outline-none"
                                            />
                                            <button onClick={addSender} className="bg-black text-white px-4 rounded-md hover:bg-gray-800 transition-all">
                                                <Plus size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {authorizedSenders.length === 0 && <p className="text-gray-400 text-sm italic">No senders added yet.</p>}
                                        {authorizedSenders.map((s, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-gray-100 p-2 rounded-full text-gray-500">
                                                        <Mail size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{s.name}</p>
                                                        <p className="text-sm text-gray-500">{s.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => openSmtpConfig(s.email)}
                                                        className={`text-xs px-3 py-1.5 rounded-md font-medium border transition-colors ${smtpConfigs[s.email] ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'}`}
                                                    >
                                                        {smtpConfigs[s.email] ? 'SMTP Configured' : 'Configure SMTP'}
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (await confirm({
                                                                title: 'Remove Sender',
                                                                description: `Remove sender ${s.email} and their SMTP config ? `,
                                                                variant: 'destructive'
                                                            })) {
                                                                removeSender(s.email);
                                                            }
                                                        }}
                                                        className="text-gray-400 hover:text-red-500 p-2"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Limits & Global Config */}
                        <div className="space-y-6">
                            <div className="ink-card bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        <Shield className="h-5 w-5 text-gray-500" /> Safety Limits
                                    </h3>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Daily Send Limit</label>
                                        <input
                                            type="number"
                                            value={dailyLimit}
                                            onChange={e => setDailyLimit(e.target.value)}
                                            className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-black outline-none"
                                        />
                                        <p className="text-xs text-gray-500">Max emails per 24h rolling window.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Rate Limit Delay (Seconds)</label>
                                        <input
                                            type="number"
                                            value={rateLimitDelay}
                                            onChange={e => setRateLimitDelay(e.target.value)}
                                            step="0.1"
                                            className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-black outline-none"
                                        />
                                        <p className="text-xs text-gray-500">Wait time between each email.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="ink-card bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                    <h3 className="font-semibold text-lg flex items-center gap-2">
                                        Global Settings
                                    </h3>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-gray-700">Global Reply-To</label>
                                        <input
                                            value={replyTo}
                                            onChange={e => setReplyTo(e.target.value)}
                                            placeholder="no-reply@company.com"
                                            className="w-full p-2.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-black outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>


                <TabsContent value="system" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Candidates', value: systemStats?.candidates || 0, icon: <UserPlus className="text-blue-500" /> },
                            { label: 'Total Interviews', value: systemStats?.interviews || 0, icon: <CheckCircle className="text-green-500" /> },
                            { label: 'Emails Sent', value: systemStats?.emails_sent || 0, icon: <Mail className="text-purple-500" /> },
                            { label: 'Database Size', value: systemStats?.db_size ? `${(systemStats.db_size / 1024 / 1024).toFixed(2)} MB` : '0 MB', icon: <Database className="text-orange-500" /> },
                        ].map((stat, i) => (
                            <div key={i} className="bg-white p-6 border border-gray-200 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
                                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded-full">{stat.icon}</div>
                            </div>
                        ))}
                    </div>

                    {/* Logs Viewer */}
                    <div className="ink-card bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Terminal className="h-5 w-5 text-gray-500" /> System Logs
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={fetchLogs} className="text-sm px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Refresh</button>
                                <button onClick={clearLogs} className="text-sm px-3 py-1.5 bg-white border border-gray-300 text-red-600 rounded-md hover:bg-red-50">Clear Logs</button>
                            </div>
                        </div>
                        <div className="flex-1 bg-black p-4 overflow-auto font-mono text-xs text-green-400">
                            {logs.length === 0 ? (
                                <p className="text-gray-500 italic">No logs available.</p>
                            ) : (
                                logs.map((line, i) => (
                                    <div key={i} className="whitespace-pre-wrap hover:bg-gray-900">{line}</div>
                                ))
                            )}
                        </div>
                    </div>
                </TabsContent>



                <TabsContent value="agent" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <AgentSettings
                        apiKey={apiKey}
                        setApiKey={setApiKey}
                        models={agentModels}
                        setModels={setAgentModels}
                        defaultModel={defaultModel}
                        setDefaultModel={setDefaultModel}
                        isDirty={isDirty}
                    />
                </TabsContent>
            </Tabs>



            {/* SMTP Config Modal */}
            <SmtpConfigModal
                email={editingSmtp}
                config={smtpForm}
                onClose={() => setEditingSmtp(null)}
                onSave={saveSmtpConfig}
                onChange={setSmtpForm}
            />
        </div>
    );
};



export default Settings;
