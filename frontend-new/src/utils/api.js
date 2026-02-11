import axios from 'axios';

// Determine backend URL
const getBaseUrl = () => {
    const origin = window.location.origin;
    if (origin.includes(':5173') || origin.includes(':3000')) {
        return 'http://localhost:5000';
    } else if (origin.includes(':8080')) {
        return origin.replace(':8080', ':5000');
    }
    return origin;
};

const api = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add a request interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Clear token and redirect to login if 401
            localStorage.removeItem('access_token');
            // dispatch event or use callback if possible, but window.location is simplest for now
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
