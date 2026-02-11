import React from 'react';
import { AgentInterface } from '../components/agent/AgentInterface';

const AgentPage = () => {
    return (
        <div className="flex flex-col h-[calc(100vh-60px)] w-full bg-gray-50 overflow-hidden relative">
            <div className="flex-1 w-full max-w-[1920px] mx-auto p-6 h-full z-10">
                {/* Applied ink-card styles: white bg, specific shadow. 
                    Added h-full and flex-col to ensure it fills space like before. 
                    Preserved overflow-hidden to keep chat contained. */}
                <div className="w-full h-full ink-card overflow-hidden flex flex-col border border-transparent">
                    <AgentInterface />
                </div>
            </div>
        </div>
    );
};

export default AgentPage;
