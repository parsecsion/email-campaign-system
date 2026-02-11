import React from 'react';
import Modal from './ui/Modal';

const SmtpConfigModal = ({ email, config, onClose, onSave, onChange }) => {
    if (!email) return null;

    const footer = (
        <button
            onClick={onSave}
            className="bg-black text-white px-4 py-2 text-sm font-bold rounded hover:bg-gray-800 transition-all"
        >
            Save Configuration
        </button>
    );

    return (
        <Modal
            isOpen={!!email}
            onClose={onClose}
            title="SMTP Configuration"
            footer={footer}
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-500 -mt-2 mb-4">For {email}</p>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-gray-500">Host</label>
                        <input
                            className="w-full border p-2 text-sm rounded-md focus:border-black outline-none focus:ring-1 focus:ring-black"
                            placeholder="smtp.gmail.com"
                            value={config.host}
                            onChange={e => onChange({ ...config, host: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-bold uppercase text-gray-500">Port</label>
                        <input
                            className="w-full border p-2 text-sm rounded-md focus:border-black outline-none focus:ring-1 focus:ring-black"
                            placeholder="587"
                            value={config.port}
                            onChange={e => {
                                // Allow only numbers
                                const val = e.target.value.replace(/\D/g, '');
                                onChange({ ...config, port: val });
                            }}
                        />
                    </div>
                </div>

                {/* Quick Presets */}
                <div className="flex gap-2 text-xs">
                    <span className="text-gray-500 py-1">Pixels:</span>
                    <button
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 hover:text-black transition-colors"
                        onClick={() => onChange({ ...config, host: 'smtp.gmail.com', port: '587' })}
                    >
                        Gmail
                    </button>
                    <button
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 hover:text-black transition-colors"
                        onClick={() => onChange({ ...config, host: 'smtp.office365.com', port: '587' })}
                    >
                        Outlook
                    </button>
                    <button
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 hover:text-black transition-colors"
                        onClick={() => onChange({ ...config, host: 'smtp.hostinger.com', port: '465' })}
                    >
                        Hostinger
                    </button>
                    <button
                        className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 hover:text-black transition-colors"
                        onClick={() => onChange({ ...config, host: 'smtp.titan.email', port: '465' })}
                    >
                        Titan
                    </button>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500">SMTP Username</label>
                    <input
                        className="w-full border p-2 text-sm rounded-md focus:border-black outline-none focus:ring-1 focus:ring-black"
                        value={config.user}
                        onChange={e => onChange({ ...config, user: e.target.value })}
                        placeholder="user@example.com"
                    />
                    <p className="text-[10px] text-gray-400">
                        The username used to authenticate with the SMTP server. Usually the full email address.
                    </p>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-gray-500">SMTP Password / App Password</label>
                    <input
                        type="password"
                        className="w-full border p-2 text-sm rounded-md focus:border-black outline-none focus:ring-1 focus:ring-black"
                        value={config.password}
                        onChange={e => onChange({ ...config, password: e.target.value })}
                    />
                </div>

                <div className="bg-blue-50 p-3 rounded-md text-xs text-blue-700">
                    <strong>Tip:</strong> For Gmail, generate an 'App Password' if you use 2FA. For Outlook/Office365, ensure SMTP Auth is enabled.
                </div>
            </div>
        </Modal>
    );
};

export default SmtpConfigModal;
