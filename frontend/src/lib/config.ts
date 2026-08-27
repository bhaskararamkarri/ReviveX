export const API_BASE = typeof window !== 'undefined'
    ? '/api'
    : (process.env.API_BASE_URL || "http://localhost:8000/api");