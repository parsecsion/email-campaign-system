import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AgentInterface } from './AgentInterface';
import { useAgent } from '../../context/AgentContext';
import { Button } from '@/components/ui/button';
import { Bot, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const AgentOverlay = () => {
    const { isChatOpen, setIsChatOpen } = useAgent();
    // Delay rendering of content for exit animations if needed, 
    // but for now we'll rely on simple conditional rendering with CSS animations or just simple unmount.
    // To do proper exit animations without framer-motion requires more state or a library, 
    // sticking to tailwind-animate for entry.

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape') setIsChatOpen(false);
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [setIsChatOpen]);

    const location = useLocation();
    if (location.pathname === '/agent') return null;

    const COLLAPSED_WIDTH = 60;
    const EXPANDED_WIDTH = 420;
    const EXPANDED_HEIGHT = 520;

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            <div
                onClick={() => {
                    if (!isChatOpen) setIsChatOpen(true);
                }}
                className={cn(
                    "relative bg-white shadow-xl shadow-black/10 border border-border overflow-hidden",
                    "transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
                    !isChatOpen && "cursor-pointer hover:shadow-2xl hover:shadow-black/15"
                )}
                style={{
                    width: isChatOpen ? EXPANDED_WIDTH : COLLAPSED_WIDTH,
                    height: isChatOpen ? EXPANDED_HEIGHT : 60,
                    borderRadius: isChatOpen ? 24 : 999,
                }}
            >
                {/* Collapsed state content */}
                <div
                    className={cn(
                        "absolute inset-0 flex items-center justify-center", // Centered content
                        "transition-all duration-300",
                        isChatOpen ? "opacity-0 pointer-events-none" : "opacity-100"
                    )}
                >
                    {/* Only the icon, centered */}
                    <div className="relative w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        <Bot className="size-6" />
                    </div>
                </div>

                {/* Expanded state: full chat interface */}
                <div
                    className={cn(
                        "absolute inset-0 transition-opacity duration-300",
                        isChatOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                >
                    {/* Mobile close button overlay */}
                    <div className="absolute top-3 right-3 z-20 sm:hidden">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="rounded-full shadow-sm bg-background"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsChatOpen(false);
                            }}
                        >
                            <X className="size-5" />
                        </Button>
                    </div>

                    <AgentInterface
                        onClose={() => setIsChatOpen(false)}
                        isOverlay={true}
                    />
                </div>
            </div>
        </div>
    );
};
