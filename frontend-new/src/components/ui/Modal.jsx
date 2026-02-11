import React, { useEffect, useState } from 'react';
import { XCircle } from 'lucide-react';


const Modal = ({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-md', className = '' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [shouldRender, setShouldRender] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            requestAnimationFrame(() => setIsVisible(true));
        } else {
            setIsVisible(false);
            const timer = setTimeout(() => setShouldRender(false), 200); // Wait for animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!shouldRender) return null;

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
            onClick={onClose}
        >
            <div
                className={`bg-white w-full ${maxWidth} rounded-lg shadow-xl overflow-hidden transform transition-all duration-200 ${isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} ${className}`}
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                {/* Header */}
                <div className="border-b px-6 py-4 flex justify-between items-center bg-gray-50">
                    <h3 id="modal-title" className="text-lg font-bold text-gray-900">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-black transition-colors focus:outline-none focus:ring-2 focus:ring-black rounded-full p-1"
                        aria-label="Close modal"
                    >
                        <XCircle size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {children}
                </div>

                {/* Footer (Optional) */}
                {footer && (
                    <div className="bg-gray-50 px-6 py-4 border-t flex justify-end gap-2">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;
