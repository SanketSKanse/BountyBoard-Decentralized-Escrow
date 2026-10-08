const rawApiUrl = import.meta.env.VITE_API_URL;

export const API_BASE_URL = rawApiUrl
    ? (rawApiUrl.replace(/\/+$/, '').endsWith('/api')
        ? rawApiUrl.replace(/\/+$/, '')
        : `${rawApiUrl.replace(/\/+$/, '')}/api`)
    : 'http://localhost:5055/api';