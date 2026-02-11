import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { FullScreenSignup } from './ui/FullScreenSignup';

const Login = ({ onLoginSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        // Check if already authenticated
        const checkAuth = async () => {
            const token = localStorage.getItem('access_token');
            if (!token) return;

            try {
                const response = await api.get('/api/auth-status');
                if (response.data.authenticated) {
                    onLoginSuccess();
                }
            } catch {
                localStorage.removeItem('access_token');
            }
        };
        checkAuth();
    }, [onLoginSuccess]);

    const handleLogin = async (email, password) => {
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/api/token', { email, password });

            if (response.data.success) {
                localStorage.setItem('access_token', response.data.access_token);
                onLoginSuccess();
            }
        } catch (err) {
            console.error("Login Error:", err);
            setError('Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <FullScreenSignup
            onLogin={handleLogin}
            loading={loading}
            error={error}
        />
    );
};

export default Login;
