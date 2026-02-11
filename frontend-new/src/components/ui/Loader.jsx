import React from 'react';
import './loader.css';

const Loader = ({ size = 'default' }) => {
    return (
        <div className={`flex items-center justify-center ${size === 'default' ? 'p-8' : 'p-0'}`}>
            <div className={`ripple-loader ${size}`}>
                <div className="ripple-cell d-0" />
                <div className="ripple-cell d-1" />
                <div className="ripple-cell d-2" />
                <div className="ripple-cell d-1" />
                <div className="ripple-cell d-2" />
                <div className="ripple-cell d-2" />
                <div className="ripple-cell d-3" />
                <div className="ripple-cell d-3" />
                <div className="ripple-cell d-4" />
            </div>
        </div>
    );
};

export default Loader;
