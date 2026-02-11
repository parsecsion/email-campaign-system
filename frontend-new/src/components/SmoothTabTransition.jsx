import React, { useRef, useState, useEffect } from 'react';

const SmoothTabTransition = ({ children, className = "" }) => {
    const contentRef = useRef(null);
    const [height, setHeight] = useState('auto');

    useEffect(() => {
        if (!contentRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                // Use borderBoxSize if available for better accuracy, typically contentRect is fine too
                const targetHeight = entry.borderBoxSize
                    ? entry.borderBoxSize[0].blockSize
                    : entry.contentRect.height;

                setHeight(targetHeight);
            }
        });

        observer.observe(contentRef.current);

        return () => observer.disconnect();
    }, [children]); // Re-observe if children structure changes significantly (though ref stays same usually)

    return (
        <div
            style={{ height }}
            className={`transition-[height] duration-300 ease-in-out overflow-hidden ${className}`}
        >
            <div ref={contentRef}>
                {children}
            </div>
        </div>
    );
};

export default SmoothTabTransition;
