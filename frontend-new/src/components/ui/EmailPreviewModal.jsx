import React, { useState, useEffect } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { Button } from './button';

const EmailPreviewModal = ({ isOpen, onClose, onSend, candidate, template, initialContent, initialSubject }) => {
    const [subject, setSubject] = useState('');
    const [content, setContent] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSubject(initialSubject || '');
            setContent(initialContent || '');
            setSending(false);
        }
    }, [isOpen, initialSubject, initialContent]);

    if (!isOpen) return null;

    const handleSend = async () => {
        setSending(true);
        await onSend(subject, content);
        setSending(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-semibold text-lg text-gray-900">Preview Email</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-900 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">To</label>
                        <div className="p-2 bg-gray-50 rounded-md text-sm text-gray-800 border border-gray-200">
                            {candidate?.full_name} &lt;{candidate?.email}&gt;
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Subject</label>
                        <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-2 flex-1 flex flex-col">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full p-3 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all min-h-[300px] font-mono resize-none leading-relaxed"
                        />
                        <p className="text-xs text-gray-400">Supported variables will be processed by the server if not already replaced.</p>
                    </div>
                </div>

                <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={sending}>
                        Cancel
                    </Button>
                    <Button onClick={handleSend} disabled={sending} className="bg-black text-white hover:bg-gray-800 flex items-center gap-2">
                        {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                        Send Email
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EmailPreviewModal;
