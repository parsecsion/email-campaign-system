import React, { useEffect, useRef } from 'react';
import { Send, Bot, Trash2 } from 'lucide-react';
import { useAgent } from './useAgent';
// cn removed
import { Badge } from '../../components/ui/badge';

const AgentChat = () => {
    const { messages, sendMessage, processing, clearHistory } = useAgent();
    const [input, setInput] = React.useState('');
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || processing) return;

        const msg = input;
        setInput('');
        await sendMessage(msg);
    };

    // Helper to render message content with basic formatting
    const renderContent = (content) => {
        // Basic bolding for **text**
        const parts = content.split(/(\*\*.*?\*\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="text-green-400 font-bold">{part.slice(2, -2)}</strong>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <div className="flex flex-col h-[600px] w-full max-w-4xl mx-auto bg-black border border-gray-800 rounded-xl shadow-2xl overflow-hidden font-mono text-sm relative">
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-500">
                    <Bot size={20} />
                    <span className="font-bold tracking-wider">AI COMMANDER V2</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-gray-500 text-xs hidden sm:inline">ONLINE</span>
                    <button onClick={clearHistory} className="ml-4 text-gray-500 hover:text-white transition-colors" title="Clear History">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Matrix Background Effect */}
            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-0 bg-[length:100%_4px,6px_100%]"></div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black text-gray-200 z-10" ref={scrollRef}>
                {messages.length === 0 && (
                    <div className="text-center text-gray-600 mt-20">
                        <p>System Initialized.</p>
                        <p>Waiting for command...</p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role !== 'user' && (
                            <div className="w-8 h-8 rounded bg-gray-900 border border-green-500/30 flex items-center justify-center shrink-0">
                                <Bot size={16} className="text-green-500" />
                            </div>
                        )}

                        <div className={`max-w-[80%] rounded-lg p-3 border ${msg.role === 'user'
                            ? 'bg-gray-800 border-gray-700 text-white'
                            : 'bg-gray-900/50 border-green-500/20 text-green-100'
                            }`}>
                            <p className="whitespace-pre-wrap">{renderContent(msg.content)}</p>
                        </div>

                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center shrink-0">
                                <div className="font-bold text-xs text-gray-400">YOU</div>
                            </div>
                        )}
                    </div>
                ))}

                {processing && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded bg-gray-900 border border-green-500/30 flex items-center justify-center">
                            <Bot size={16} className="text-green-500" />
                        </div>
                        <div className="flex items-center gap-1 h-8 text-green-500 px-2">
                            <span className="animate-pulse">Processing...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="bg-gray-900 p-4 border-t border-gray-800 z-20">
                <form onSubmit={handleSubmit} className="relative bg-black border border-gray-700 rounded-xl p-2 focus-within:ring-1 focus-within:ring-green-500 focus-within:border-green-500 transition-all shadow-inner">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a command (e.g., 'Find candidates in UK', 'Draft email to John')..."
                        className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 px-2 py-3 outline-none font-mono"
                    />

                    <div className="flex justify-end items-center mt-2 px-1 border-t border-gray-800/50 pt-2">
                        <button
                            type="submit"
                            disabled={!input.trim() || processing}
                            className="p-2 bg-green-600/90 text-white rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AgentChat;
