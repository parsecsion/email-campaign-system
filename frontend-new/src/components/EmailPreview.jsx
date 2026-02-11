import React, { useEffect, useRef } from 'react';
import { Send, Loader2, CheckCircle, FileText } from 'lucide-react';
import { useCampaign } from '../context/CampaignContext';
import { toast } from 'sonner';

const EmailPreview = () => {
    const {
        emailTemplateTab,
        selectedTemplate,
        formattedCustomEmail,
        handleSendEmails,
        sendStatus,
        sendProgress,
        candidates,
        subject,
        customEmailText
    } = useCampaign();

    const previewWrapperRef = useRef(null);
    const previewContentRef = useRef(null);

    useEffect(() => {
        const updateHeight = () => {
            if (previewWrapperRef.current && previewContentRef.current) {
                const contentHeight = previewContentRef.current.scrollHeight;
                const scale = 0.65; // The scale we set in style
                // Set wrapper height to accommodate scaled content
                previewWrapperRef.current.style.height = `${contentHeight * scale}px`;
            }
        };

        // Update on mount and when content changes
        updateHeight();

        // Also update when images load
        const images = previewContentRef.current?.getElementsByTagName('img');
        if (images) {
            Array.from(images).forEach(img => {
                img.addEventListener('load', updateHeight);
            });
        }

        window.addEventListener('resize', updateHeight);

        return () => {
            window.removeEventListener('resize', updateHeight);
            if (images) {
                Array.from(images).forEach(img => {
                    img.removeEventListener('load', updateHeight);
                });
            }
        };
    }, [emailTemplateTab, selectedTemplate, formattedCustomEmail]);

    const selectedCandidatesCount = candidates ? candidates.filter(c => c.selected !== false).length : 0;

    const canSend = (sendStatus === 'idle' || sendStatus === 'complete') &&
        selectedCandidatesCount > 0 &&
        subject &&
        ((emailTemplateTab === 'templates' && selectedTemplate) ||
            (emailTemplateTab === 'compose' && customEmailText.trim()));

    const contentToRender = emailTemplateTab === 'compose'
        ? formattedCustomEmail
        : selectedTemplate?.html_template;

    const onSendClick = async () => {
        try {
            await handleSendEmails();
        } catch (e) {
            toast.error(e.message);
        }
    };

    return (
        <div className="ink-card flex flex-col h-full">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-500" /> Preview
                </h3>
            </div>
            <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                {contentToRender ? (
                    <div className="flex items-center justify-center">
                        <div className="border border-gray-200 bg-gray-50" style={{ display: 'inline-block', padding: '16px' }}>
                            <div ref={previewWrapperRef} style={{
                                width: '455px',
                                overflow: 'hidden',
                                position: 'relative',
                                transition: 'height 0.3s ease'
                            }}>
                                <div ref={previewContentRef} style={{
                                    transform: 'scale(0.65)',
                                    transformOrigin: 'top left',
                                    width: '700px'
                                }}>
                                    <div dangerouslySetInnerHTML={{ __html: contentToRender }} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <FileText size={64} className="mb-4 opacity-20" />
                        <p className="text-lg font-medium text-gray-500">No email loaded</p>
                        <p className="text-sm text-center mt-2 max-w-[200px] text-gray-400">Select a template or use the Compose tab to see a preview.</p>
                    </div>
                )}
            </div>

            {/* Send Button */}
            <div className="px-6 pb-6 pt-4 border-t border-gray-200">
                <button
                    onClick={onSendClick}
                    disabled={!canSend}
                    className={`w-full relative overflow-hidden select-none btn-primary text-white px-8 py-6 font-bold text-base uppercase tracking-wider flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all ${sendStatus === 'sending' || sendStatus === 'sent' ? 'pointer-events-none' : ''
                        }`}
                >
                    {sendStatus === 'idle' && (
                        <>
                            <Send size={20} />
                            Send to {selectedCandidatesCount} Selected Recipient{selectedCandidatesCount !== 1 ? 's' : ''}
                        </>
                    )}

                    {sendStatus === 'sending' && (
                        <div className="z-[5] flex items-center justify-center gap-2">
                            <Loader2 size={20} className="animate-spin" />
                            <span>{Math.round(sendProgress)}%</span>
                        </div>
                    )}

                    {sendStatus === 'sent' && (
                        <>
                            <CheckCircle size={20} />
                            <span>Sent</span>
                        </>
                    )}

                    {sendStatus === 'complete' && (
                        <span className="text-white">Send to {selectedCandidatesCount} Selected Recipient{selectedCandidatesCount !== 1 ? 's' : ''}</span>
                    )}

                    {sendStatus === 'sending' && (
                        <div
                            className="absolute bottom-0 z-[3] h-full left-0 bg-white bg-opacity-30 inset-0 transition-all duration-200 ease-in-out"
                            style={{ width: `${sendProgress}%` }}
                        />
                    )}
                </button>
            </div>
        </div>
    );
};

export default EmailPreview;
