import React from 'react';
import { Mail, Calendar, Users, Settings, LogOut, Bot } from 'lucide-react';
import GradientBlinds from './ui/GradientBlinds';

const Sidebar = ({ currentPage, setCurrentPage, logout }) => {
    return (
        <div className="sidebar relative overflow-hidden h-full">
            {/* Static Grainy Noise Background */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-noise opacity-50 mix-blend-overlay"></div>
            <div className="sidebar-top relative z-10">
                <div
                    onClick={() => setCurrentPage('sender')}
                    className={`sidebar-item ${currentPage === 'sender' ? 'active' : ''}`}
                    title="Sender"
                >
                    <Mail size={20} />
                </div>
                <div
                    onClick={() => setCurrentPage('scheduler')}
                    className={`sidebar-item ${currentPage === 'scheduler' ? 'active' : ''}`}
                    title="Scheduler"
                >
                    <Calendar size={20} />
                </div>
                <div
                    onClick={() => setCurrentPage('candidates')}
                    className={`sidebar-item ${currentPage === 'candidates' ? 'active' : ''}`}
                    title="Candidates"
                >
                    <Users size={20} />
                </div>
                <div
                    onClick={() => setCurrentPage('settings')}
                    className={`sidebar-item ${currentPage === 'settings' ? 'active' : ''}`}
                    title="Settings"
                >
                    <Settings size={20} />
                </div>
                <div
                    onClick={() => setCurrentPage('agent')}
                    className={`sidebar-item ${currentPage === 'agent' ? 'active' : ''}`}
                    title="AI Agent"
                >
                    <div className="relative">
                        <Bot size={20} />
                        <span className="absolute -top-1 -right-2 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-brand"></span>
                        </span>
                    </div>
                </div>
            </div>
            <div className="sidebar-bottom">
                <div
                    onClick={logout}
                    className="sidebar-item hover:!bg-red-900/20 hover:!text-red-500 transition-colors duration-200"
                    title="Logout"
                >
                    <LogOut size={20} />
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
