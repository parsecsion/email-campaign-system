import React, { createContext, useContext, useState, useEffect } from 'react';
import { ROLES, AVAILABLE_MODELS, DEFAULT_MODEL } from '@/lib/constants';
import api from '@/utils/api';

const AgentContext = createContext();

export const useAgent = () => {
    const context = useContext(AgentContext);
    if (!context) {
        throw new Error('useAgent must be used within an AgentProvider');
    }
    return context;
};

export const AgentProvider = ({ children }) => {
    // Persistent State: Sessions
    const [sessions, setSessions] = useState(() => {
        const saved = localStorage.getItem('agent_sessions');
        let parsed = saved ? JSON.parse(saved) : [];

        // Migration: Convert 'agent' role to 'assistant' immediately on load
        let migrated = false;
        parsed = parsed.map(session => ({
            ...session,
            messages: session.messages.map(msg => {
                if (msg.role === 'agent') {
                    migrated = true;
                    return { ...msg, role: ROLES.ASSISTANT };
                }
                return msg;
            })
        }));

        if (migrated) {
            // console.log('Migrated legacy agent messages to assistant role');
        }

        return parsed;
    });

    // Persistent State: Current Session ID
    const [currentSessionId, setCurrentSessionId] = useState(() => {
        return localStorage.getItem('agent_current_session_id') || null;
    });

    // Ref to track currentSessionId without stale closures
    const currentSessionIdRef = React.useRef(currentSessionId);

    useEffect(() => {
        currentSessionIdRef.current = currentSessionId;
    }, [currentSessionId]);

    // Model State
    const [availableModels, setAvailableModels] = useState(AVAILABLE_MODELS);
    const [defaultModel, setDefaultModel] = useState(DEFAULT_MODEL);

    // Fetch Agent Settings
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/api/settings');
                const s = res.data.settings || {};

                if (s.agent_models) {
                    let customModels = s.agent_models;
                    if (typeof customModels === 'string') {
                        try { customModels = JSON.parse(customModels); } catch { }
                    }
                    if (Array.isArray(customModels)) {
                        // Merge custom (isCustom: true) with constant AVAILABLE_MODELS
                        // Logic: Start with constants, append custom. 
                        // Or if we want to allow hiding standard ones, we'd need a more complex logic.
                        // For now, just append custom ones.
                        const combined = [...AVAILABLE_MODELS, ...customModels];
                        // Deduplicate by ID just in case
                        const unique = Array.from(new Map(combined.map(m => [m.id, m])).values());
                        setAvailableModels(unique);
                    }
                }

                if (s.agent_default_model) {
                    setDefaultModel(s.agent_default_model);
                }
            } catch (error) {
                console.error("Failed to load agent settings:", error);
            }
        };
        fetchSettings();
    }, []);

    // UI Persistence: Is Chat Open?
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Derived State: Active Session
    const activeSession = sessions.find(s => s.id === currentSessionId) || null;

    // Persist to LocalStorage
    useEffect(() => {
        localStorage.setItem('agent_sessions', JSON.stringify(sessions));
    }, [sessions]);

    useEffect(() => {
        if (currentSessionId) {
            localStorage.setItem('agent_current_session_id', currentSessionId);
        } else {
            localStorage.removeItem('agent_current_session_id');
        }
    }, [currentSessionId]);

    // Create a new session
    const createNewSession = (initialMsg = null) => {
        const newId = `session_${Date.now()}`;
        const newSession = {
            id: newId,
            title: 'New Chat',
            messages: initialMsg ? [initialMsg] : [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSessionId(newId);
        setIsChatOpen(true);
        return newId;
    };

    // Add message to current session
    // Default to ASSISTANT if role is 'agent' (legacy) or just 'assistant'
    const addMessage = (role, content, type = 'text', data = null, meta = null) => {
        const activeId = currentSessionIdRef.current; // Use Ref to get fresh ID

        // Normalize role
        if (role === 'agent') role = ROLES.ASSISTANT;

        if (!activeId) {
            createNewSession({ role, content, type, data, meta });
            return;
        }

        const newMessage = { role, content, type, data, meta, timestamp: Date.now() };

        setSessions(prev => prev.map(session => {
            if (session.id === activeId) {
                // Generate a title if it's the first user message
                let title = session.title;
                if (session.messages.length === 0 && role === ROLES.USER) {
                    title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
                }

                return {
                    ...session,
                    title,
                    messages: [...session.messages, newMessage],
                    updatedAt: Date.now()
                };
            }
            return session;
        }));
    };

    const switchSession = (id) => {
        setCurrentSessionId(id);
        setIsChatOpen(true);
    };

    const deleteSession = (id) => {
        setSessions(prev => prev.filter(s => s.id !== id));
        if (currentSessionId === id) {
            setCurrentSessionId(null);
        }
    };

    const clearHistory = () => {
        setSessions([]);
        setCurrentSessionId(null);
    };

    // Ensure there's always at least one session on first load if open
    useEffect(() => {
        if (isChatOpen && !currentSessionId && sessions.length === 0) {
            createNewSession();
        }
    }, [isChatOpen]);

    // Processing State: Track *which* session is processing
    const [processingSessionId, setProcessingSessionId] = useState(null);

    // Core Interaction Logic
    const sendMessage = async (content, model = null) => {
        if (!content.trim() || processingSessionId) return;

        // 1. Add User Message
        const activeId = currentSessionIdRef.current;
        if (!activeId) {
            const newId = createNewSession({ role: ROLES.USER, content, timestamp: Date.now() });
            // For new session, set processing ID immediately
            setProcessingSessionId(newId);
        } else {
            addMessage(ROLES.USER, content);
            setProcessingSessionId(activeId);
        }

        try {
            // Get fresh session state (or create temporary history if new)
            // Note: addMessage is async in terms of React state, so we manually construct the payload
            // We use the ID effectively active at start of request
            const targetSessionId = activeId || currentSessionIdRef.current;

            const currentSession = sessions.find(s => s.id === targetSessionId);
            const currentHistory = currentSession ? currentSession.messages : [];

            // If we just created a session, currentSession might not be updated in closure yet, 
            // but for a new session we know it only has the one message we just added (or passed to createNewSession)
            // Ideally we'd wait for state, but for now we construct payload carefully.

            let historyPayload = [];
            if (!activeId) {
                // New session case: history is just the new message
                historyPayload = [{ role: ROLES.USER, content }];
            } else {
                historyPayload = [...currentHistory, { role: ROLES.USER, content }];
            }

            // 2. Call API
            // Use provided model or default
            const res = await api.post('/api/agent/chat', {
                messages: historyPayload,
                model: model // Optional, backend handles default
            });

            // 3. Add Assistant Response
            const { content: aiContent, meta } = res.data;

            // Ensure we add message to the session that initiated the request
            // (Even if user switched away, we want the response to go to the original session)
            // But addMessage functionality relies on currentSessionIdRef... 
            // Actually, addMessage uses currentSessionIdRef. If user switched, activeId changed.
            // We need a way to add message to a SPECIFIC session.

            // NOTE: The current addMessage implementation defaults to currentSessionIdRef. 
            // We should ideally refactor addMessage to accept an ID, but for now let's stick to the plan:
            // "Agent loading state" was the main issue. 
            // If we want response to go to background session, we need to hack addMessage or `setSessions` directly here.

            // Let's modify setSessions directly to ensure correct target
            const newMessage = { role: ROLES.ASSISTANT, content: aiContent, type: 'text', data: null, meta, timestamp: Date.now() };

            setSessions(prev => prev.map(session => {
                if (session.id === targetSessionId) {
                    return {
                        ...session,
                        messages: [...session.messages, newMessage],
                        updatedAt: Date.now()
                    };
                }
                return session;
            }));

        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data?.error || error.message;
            // Same here, add error to target session
            const targetSessionId = activeId || currentSessionIdRef.current;
            const errorPayload = { role: ROLES.ASSISTANT, content: `System Error: ${errorMsg}`, type: 'error', timestamp: Date.now() };

            setSessions(prev => prev.map(session => {
                if (session.id === targetSessionId) {
                    return { ...session, messages: [...session.messages, errorPayload], updatedAt: Date.now() };
                }
                return session;
            }));

        } finally {
            setProcessingSessionId(null);
        }
    };


    const value = {
        sessions,
        currentSessionId,
        activeSession,
        isChatOpen,
        setIsChatOpen,
        createNewSession,
        addMessage,
        sendMessage,
        processingSessionId, // Expose ID instead of boolean
        switchSession,
        deleteSession,
        clearHistory,
        availableModels,
        defaultModel
    };

    return (
        <AgentContext.Provider value={value}>
            {children}
        </AgentContext.Provider>
    );
};
