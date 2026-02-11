import React, { useState, useEffect, useRef } from "react";
import {
    BarChart,
    Image,
    Map,
    PenTool,
    ScanLine,
    Sparkles,
    Send,
    Trash2,
    Bot,
    History,
    Plus,
    MessageSquare,
    PanelLeftClose,
    PanelLeft,
    Check,
    AlertTriangle,
    User,
    Calendar,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    X
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { useAgent } from "@/context/AgentContext";
import { AVAILABLE_MODELS, DEFAULT_MODEL, ROLES } from "@/lib/constants";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const AgentInterface = ({ onClose, isOverlay = false }) => {
    const {
        activeSession,
        sessions,
        addMessage,
        sendMessage, // New context method
        processingSessionId, // New context state
        createNewSession,
        switchSession,
        deleteSession,
        clearHistory
    } = useAgent();

    const [input, setInput] = useState('');
    // Derive processing state: Is the CURRENT active session the one processing?
    const processing = processingSessionId === activeSession?.id;

    const [inputModel, setInputModel] = useState(DEFAULT_MODEL);
    const [showSidebar, setShowSidebar] = useState(!isOverlay);
    const scrollRef = useRef(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activeSession?.messages, processing]);

    const handleCommand = async (cmd, isConfirmation = false) => {
        if (!cmd.trim() || processing) return;

        // Confirmation handling: Just send the text. The context/backend handles the rest.
        // We clear input here to be responsive.
        setInput('');

        await sendMessage(cmd, inputModel);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleCommand(input);
        }
    };

    // --- Helper Components ---

    const ConfirmationCard = ({ request, disabled }) => {
        const { tool, args } = request;

        // Format tool name for display (e.g., "delete_interview" -> "Delete Interview")
        const actionName = tool.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        const handleConfirm = () => {
            if (disabled) return;
            handleCommand(`CONFIRMED: ${tool}`);
        };

        const handleCancel = () => {
            if (disabled) return;
            addMessage(ROLES.USER, "Cancelled.");
        };

        // Styled as an inline section inside the assistant bubble, not a separate card.
        return (
            <div className={`mt-3 border-l-2 pl-3 sm:pl-4 space-y-3 ${disabled ? 'border-gray-300 opacity-60 grayscale' : 'border-amber-500'}`}>
                <div className="flex items-center gap-2">
                    <div className={`inline-flex items-center justify-center rounded-full p-1.5 ${disabled ? 'bg-gray-100 text-gray-500' : 'bg-amber-500/10 text-amber-700'}`}>
                        <AlertTriangle className="size-3.5" />
                    </div>
                    <span className={`text-[11px] font-semibold tracking-wide uppercase ${disabled ? 'text-gray-500' : 'text-amber-700'}`}>
                        {disabled ? 'Action Completed' : 'Confirmation required'}
                    </span>
                </div>
                <p className="text-xs sm:text-sm text-foreground">
                    Are you sure you want to <span className="font-semibold">{actionName}</span>?
                </p>
                <div className={`rounded-md border px-3 py-2 text-[11px] font-mono whitespace-pre-wrap max-h-40 overflow-auto ${disabled ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-amber-50/60 border-amber-100 text-amber-900'}`}>
                    {JSON.stringify(args, null, 2)}
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancel}
                        disabled={disabled}
                        className="h-7 text-[11px] px-3 hover:bg-red-50 hover:text-red-600 disabled:hover:bg-transparent disabled:text-gray-400"
                    >
                        Cancel
                    </Button>
                    {!disabled && (
                        <Button
                            size="sm"
                            onClick={handleConfirm}
                            disabled={disabled}
                            className="h-7 text-[11px] px-3 bg-amber-600 hover:bg-amber-700 text-white border-0"
                        >
                            <Check className="size-3 mr-1.5" />
                            Yes, proceed
                        </Button>
                    )}
                </div>
            </div>
        );
    };

    const CandidateCard = ({ candidate }) => {
        return (
            <div className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors group">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary group-hover:bg-primary/20 transition-colors">
                    <User size={20} />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm truncate">{candidate.first_name} {candidate.last_name}</h4>
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground">
                            {candidate.country || 'N/A'}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {candidate.email && (
                            <>
                                <Mail size={12} />
                                <span className="truncate">{candidate.email}</span>
                            </>
                        )}
                    </div>
                    {candidate.id && (
                        <div className="pt-2 flex gap-2">
                            <Button variant="outline" size="sm" className="h-7 text-[10px] px-2" onClick={() => handleCommand(`Schedule interview for candidate ID ${candidate.id}`)}>
                                <Calendar size={12} className="mr-1.5" />
                                Schedule
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderMessageContent = (msg, isLatest) => {
        const { role, content, meta } = msg;

        // 1. Render Confirmation Request
        if (meta?.confirmation_request) {
            return (
                <div className="space-y-3">
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{content}</p>
                    <ConfirmationCard request={meta.confirmation_request} disabled={!isLatest} />
                </div>
            );
        }

        // 2. Render Tool Outputs (Rich UI)
        if (meta?.tool_outputs && meta.tool_outputs.length > 0) {
            const searchResults = meta.tool_outputs.find(t => t.tool === 'search_candidates')?.output;
            const addResult = meta.tool_outputs.find(t => t.tool === 'add_candidate')?.output;

            // If we have search results, render them nicely
            if (searchResults && Array.isArray(searchResults)) {
                return (
                    <div className="space-y-4 w-full">
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{content}</p>
                        <div className="grid grid-cols-1 gap-2">
                            {searchResults.slice(0, 5).map((c, i) => (
                                <CandidateCard key={i} candidate={c} />
                            ))}
                        </div>
                        {searchResults.length > 5 && (
                            <p className="text-xs text-center text-muted-foreground italic">
                                + {searchResults.length - 5} more results
                            </p>
                        )}
                    </div>
                );
            }

            // Fallback for other tools if needed, or just let the text handle it
        }

        if (role === ROLES.USER) {
            return <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{content}</p>;
        }

        // Legacy / Standard Text Handling
        switch (msg.type) {
            case 'error':
                return (
                    <div className="flex items-start gap-3 bg-red-500/10 p-3 rounded-lg text-red-600 dark:text-red-400">
                        <span className="relative flex h-2 w-2 mt-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <p className="text-sm font-medium">{content}</p>
                    </div>
                );
            default:
                return (
                    <div className="text-[15px] leading-relaxed text-foreground/90 markdown-content">
                        <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2" {...props} />,
                                ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                                li: ({ node, ...props }) => <li className="mb-0.5" {...props} />,
                                code: ({ node, inline, className, children, ...props }) => {
                                    return inline ? (
                                        <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
                                    ) : (
                                        <div className="bg-muted/50 rounded-md p-3 my-2 overflow-x-auto">
                                            <code className="text-xs font-mono block" {...props}>{children}</code>
                                        </div>
                                    );
                                },
                                table: ({ node, ...props }) => <div className="overflow-x-auto my-2"><table className="w-full text-sm border-collapse" {...props} /></div>,
                                th: ({ node, ...props }) => <th className="border border-border bg-muted/50 p-2 text-left font-semibold" {...props} />,
                                td: ({ node, ...props }) => <td className="border border-border p-2" {...props} />,
                            }}
                        >
                            {content}
                        </ReactMarkdown>
                    </div>
                );
        }
    };

    return (
        <div className="flex h-full w-full flex-row bg-white text-foreground relative">

            {/* Sidebar */}
            <div
                className={`${showSidebar ? 'w-full sm:w-[280px]' : 'w-0'} bg-gray-100 border-r flex flex-col transition-all duration-300 ease-in-out overflow-hidden absolute z-20 h-full shadow-xl`}
            >
                <div className={`p-4 h-[70px] flex items-center justify-between border-b ${isOverlay ? 'bg-gray-100' : 'bg-background/50 backdrop-blur-sm'}`}>
                    <span className="font-semibold text-sm flex items-center gap-2 text-foreground/80">
                        <History size={16} />
                        Conversations
                    </span>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => createNewSession()}>
                            <Plus size={18} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setShowSidebar(false)}>
                            <X size={18} />
                        </Button>
                    </div>
                </div>

                <ScrollArea className="flex-1">
                    <div className="p-3 space-y-1">
                        <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">Recents</p>
                        {sessions.map(session => (
                            <div
                                key={session.id}
                                className={`group flex items-center justify-between p-3 rounded-md text-sm cursor-pointer transition-all border border-transparent
                                    ${activeSession?.id === session.id
                                        ? 'bg-primary/5 text-primary border-primary/10 shadow-sm'
                                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                                    }`}
                                onClick={() => { switchSession(session.id); if (window.innerWidth < 640) setShowSidebar(false); }}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <MessageSquare size={16} className={`shrink-0 ${activeSession?.id === session.id ? 'text-primary' : 'text-muted-foreground/50'}`} />
                                    <div className="flex flex-col overflow-hidden">
                                        <span className="truncate font-medium">{session.title || 'New Conversation'}</span>
                                        <span className="text-[10px] text-muted-foreground/60 truncate">{new Date(session.updatedAt || Date.now()).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/10 hover:text-red-500"
                                    onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                                >
                                    <Trash2 size={12} />
                                </Button>
                            </div>
                        ))}
                        {sessions.length === 0 && (
                            <div className="text-center py-8 px-4 text-muted-foreground/50 text-xs">
                                No history yet. Start a new chat!
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className={`p-4 border-t ${isOverlay ? 'bg-white' : 'bg-background/50 backdrop-blur-sm'}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs h-9 justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5 hover:border-destructive/20 transition-colors" onClick={clearHistory}>
                        <Trash2 size={14} className="mr-2" />
                        Clear All History
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full bg-background relative min-w-0">

                {/* Header */}
                <header className={`h-[70px] border-b flex items-center justify-between px-6 ${isOverlay ? 'bg-white' : 'bg-background/80 backdrop-blur-md'} z-10 sticky top-0`}>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)} className="h-9 w-9 text-muted-foreground hover:text-foreground">
                            {showSidebar ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
                        </Button>
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 text-primary shadow-sm">
                                <Bot size={18} />
                            </div>
                            <div>
                                <h2 className="text-sm font-semibold tracking-tight">{activeSession?.title || 'New Chat'}</h2>
                                <div className="flex items-center gap-1.5">
                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                    <p className="text-xs text-muted-foreground font-medium">
                                        {AVAILABLE_MODELS.find(m => m.id === inputModel)?.name || 'AI Assistant'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1">
                        {onClose && (
                            <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 text-muted-foreground hover:text-foreground md:hover:bg-muted rounded-full">
                                <span className="sr-only">Close</span>
                                <X size={20} />
                            </Button>
                        )}
                    </div>
                </header>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto relative scroll-smooth" ref={scrollRef}>
                    {!activeSession || activeSession.messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
                            <div className="space-y-4 max-w-md">
                                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary/20 to-blue-500/20 flex items-center justify-center shadow-inner mb-6">
                                    <Sparkles className="size-8 text-primary" />
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">How can I help you?</h1>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    I can help you manage candidates, send email campaigns, or analyze your recruitment data.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                                <button onClick={() => handleCommand("Display all candidates in table")} className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all text-left group">
                                    <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 group-hover:bg-blue-500/20 transition-colors">
                                        <ScanLine size={18} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">List Candidates</div>
                                        <div className="text-xs text-muted-foreground">View formatted table</div>
                                    </div>
                                </button>
                                <button onClick={() => handleCommand("Analyze current recruitment stats")} className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/30 transition-all text-left group">
                                    <div className="p-2.5 rounded-lg bg-orange-500/10 text-orange-600 group-hover:bg-orange-500/20 transition-colors">
                                        <BarChart size={18} />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-sm">Analyze Data</div>
                                        <div className="text-xs text-muted-foreground">Get insights & stats</div>
                                    </div>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="min-h-full p-4 sm:p-6 space-y-6">
                            {activeSession.messages.map((msg, i) => (
                                <div key={i} className={`flex gap-4 group ${msg.role === ROLES.USER ? 'justify-end' : 'justify-start max-w-3xl'}`}>
                                    {(msg.role === ROLES.ASSISTANT || msg.role === 'agent') && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 mt-1 border border-primary/10 shadow-sm">
                                            <Bot size={14} className="text-primary" />
                                        </div>
                                    )}

                                    <div className={`relative px-5 py-3.5 shadow-sm max-w-[85%] sm:max-w-[75%] ${msg.role === ROLES.USER
                                        ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-md'
                                        : 'bg-card border text-card-foreground rounded-2xl rounded-tl-md'
                                        }`}>
                                        {renderMessageContent(msg, i === activeSession.messages.length - 1)}
                                        <div className={`absolute bottom-0 ${msg.role === ROLES.USER ? '-left-8 text-right' : '-right-8 text-left'} opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground py-2`}>
                                            {/* Timestamp could go here */}
                                        </div>
                                    </div>

                                    {msg.role === ROLES.USER && (
                                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                                            <div className="text-[10px] font-bold text-muted-foreground">ME</div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {processing && (
                                <div className="flex gap-4 justify-start max-w-3xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 mt-1 border border-primary/10 shadow-sm">
                                        <Bot size={14} className="text-primary" />
                                    </div>
                                    <div className="bg-card border px-4 py-3 rounded-2xl rounded-tl-md flex items-center gap-1.5 h-[46px] shadow-sm">
                                        <span className="size-2 bg-primary/40 rounded-full animate-bounce delay-0" />
                                        <span className="size-2 bg-primary/40 rounded-full animate-bounce delay-150" />
                                        <span className="size-2 bg-primary/40 rounded-full animate-bounce delay-300" />
                                    </div>
                                </div>
                            )}
                            <div className="h-4" /> {/* Spacer */}
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className={`p-4 sm:p-6 border-t pt-2 ${isOverlay ? 'bg-white' : 'bg-background/80 backdrop-blur-md'}`}>
                    <div className="max-w-4xl mx-auto relative rounded-2xl border bg-muted/40 hover:bg-muted/60 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200 shadow-sm">
                        <Textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message Agent..."
                            className="min-h-[56px] max-h-[180px] w-full resize-none border-0 bg-transparent focus-visible:ring-0 px-4 py-3.5 pb-12 text-[15px] shadow-none placeholder:text-muted-foreground/50"
                        />

                        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                            <Select value={inputModel} onValueChange={(val) => { setInputModel(val); }}>
                                <SelectTrigger className="h-8 border-0 bg-transparent shadow-none text-xs w-auto gap-1.5 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg px-2.5 transition-colors">
                                    <Sparkles className="size-3.5" />
                                    <span className="font-medium truncate max-w-[120px]">
                                        {AVAILABLE_MODELS.find(m => m.id === inputModel)?.name || 'Model'}
                                    </span>
                                </SelectTrigger>
                                <SelectContent align="start">
                                    {AVAILABLE_MODELS.map((model) => (
                                        <SelectItem key={model.id} className="text-xs py-2 cursor-pointer" value={model.id}>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{model.name}</span>
                                                <span className="text-[10px] text-muted-foreground">{model.id.split(':')[0]}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button
                                size="sm"
                                className={`h-9 w-9 rounded-xl shadow-md transition-all duration-300 flex items-center justify-center 
                                    ${input.trim()
                                        ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground hover:scale-105 hover:shadow-lg'
                                        : 'bg-muted/50 text-muted-foreground/50 cursor-not-allowed'
                                    }
                                    ${processing ? 'cursor-wait opacity-80' : ''}
                                `}
                                disabled={!input.trim() || processing}
                                onClick={() => handleCommand(input)}
                            >
                                {processing ? (
                                    <span className="relative flex h-3.5 w-3.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white/80 border-t-transparent animate-spin"></span>
                                    </span>
                                ) : (
                                    <Send className={`size-4 ${input.trim() ? 'fill-current' : ''}`} />
                                )}
                            </Button>
                        </div>
                    </div>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-muted-foreground/40 font-medium">
                            AI Agent can make mistakes. Please verify important information.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};
