import axios from 'axios';
import config from '../config';

// ============================================================================
// AXIOS INSTANCE CONFIGURATION
// ============================================================================

// ============================================================================
// AXIOS INSTANCE CONFIGURATION
// ============================================================================
const api = axios.create({
    baseURL: config.API.BASE_URL,
    timeout: config.API.TIMEOUT,
    withCredentials: true, // Send cookies (for refresh token)
    headers: {
        'Content-Type': 'application/json',
    },
});

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================
api.interceptors.request.use(
    (config) => {
        // Access token is now sent via HttpOnly cookie automatically by browser
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// ============================================================================
// RESPONSE INTERCEPTOR - Handle Token Refresh
// ============================================================================
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Skip refresh for specific requests (like initial auth check)
        if (originalRequest._skipAuthRefresh) {
            return Promise.reject(error);
        }

        // Skip refresh for auth endpoints to prevent loops
        if (originalRequest.url?.includes('/auth/refresh-token') ||
            originalRequest.url?.includes('/auth/login') ||
            originalRequest.url?.includes('/auth/register') ||
            originalRequest.url?.includes('/auth/verify-email') ||
            originalRequest.url?.includes('/auth/reset-password')) {
            return Promise.reject(error);
        }

        // If error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                // If already refreshing, queue this request
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(() => {
                        return api(originalRequest);
                    })
                    .catch((err) => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Try to refresh the token using refresh token from cookie
                // This will set a new accessToken cookie
                await api.post('/auth/refresh-token');

                // Retry the original request (browser will attach new cookie)
                processQueue(null);
                return api(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError, null);

                // Only redirect if we're not already on login/auth pages
                if (!window.location.pathname.includes('/login') &&
                    !window.location.pathname.includes('/register') &&
                    !window.location.pathname.includes('/forgot-password') &&
                    !window.location.pathname.includes('/reset-password') &&
                    !window.location.pathname.includes('/verify-email')) {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Users API
export const usersAPI = {
    getAll: async (limit = 50, offset = 0) => {
        const response = await api.get(`/users?limit=${limit}&offset=${offset}`);
        return response.data;
    },

    getById: async (userId) => {
        const response = await api.get(`/users/${userId}`);
        return response.data;
    },

    search: async (query, limit = 20) => {
        const response = await api.get(`/users/search?query=${encodeURIComponent(query)}&limit=${limit}`);
        return response.data;
    },
};

// Conversations API
export const conversationsAPI = {
    getAll: async (limit = 20, offset = 0, type) => {
        let url = `/conversations?limit=${limit}&offset=${offset}`;
        if (type) url += `&type=${type}`;
        const response = await api.get(url);
        return response.data;
    },

    getById: async (conversationId) => {
        const response = await api.get(`/conversations/${conversationId}`);
        return response.data;
    },

    create: async (data) => {
        const response = await api.post('/conversations', data);
        return response.data;
    },

    update: async (conversationId, data) => {
        const response = await api.put(`/conversations/${conversationId}`, data);
        return response.data;
    },

    delete: async (conversationId) => {
        const response = await api.delete(`/conversations/${conversationId}`);
        return response.data;
    },

    addParticipants: async (conversationId, memberIds) => {
        const response = await api.post(`/conversations/${conversationId}/participants`, { memberIds });
        return response.data;
    },

    removeParticipants: async (conversationId, memberIds) => {
        const response = await api.delete(`/conversations/${conversationId}/participants`, { data: { memberIds } });
        return response.data;
    },

    markAsRead: async (conversationId) => {
        const response = await api.post(`/conversations/${conversationId}/read`);
        return response.data;
    },

    updateParticipantRole: async (conversationId, userId, role) => {
        const response = await api.put(`/conversations/${conversationId}/participants/role`, { userId, role });
        return response.data;
    },

    leaveGroup: async (conversationId) => {
        const response = await api.post(`/conversations/${conversationId}/leave`);
        return response.data;
    },
};

// Files API
export const filesAPI = {
    upload: async (file, folder = 'uploads', onProgress = null) => {
        const formData = new FormData();
        formData.append('folder', folder);
        formData.append('file', file);

        const response = await api.post('/files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    onProgress(percentCompleted);
                }
            }
        });
        return response.data;
    },

    getUrl: async (fileName, folder = 'uploads') => {
        const response = await api.get(`/files/${fileName}?folder=${folder}`);
        return response.data;
    },

    delete: async (fileName, folder = 'uploads') => {
        const response = await api.delete(`/files/${fileName}?folder=${folder}`);
        return response.data;
    },
};

// Messages API
export const messagesAPI = {
    getByConversation: async (conversationId, limit = 50, offset = 0, query = '', filters = {}) => {
        let url = `/messages/${conversationId}?limit=${limit}&offset=${offset}`;
        if (query) url += `&query=${encodeURIComponent(query)}`;
        if (filters.senderId) url += `&senderId=${filters.senderId}`;
        if (filters.startDate) url += `&startDate=${filters.startDate}`;
        if (filters.endDate) url += `&endDate=${filters.endDate}`;

        const response = await api.get(url);
        return response.data;
    },

    send: async (data) => {
        const response = await api.post('/messages', data);
        return response.data;
    },

    update: async (messageId, content) => {
        const response = await api.put(`/messages/${messageId}`, { content });
        return response.data;
    },

    delete: async (messageId) => {
        const response = await api.delete(`/messages/${messageId}`);
        return response.data;
    },

    getMedia: async (conversationId, limit = 50, offset = 0) => {
        const response = await api.get(`/messages/${conversationId}/media?limit=${limit}&offset=${offset}`);
        return response.data;
    },

    getFiles: async (conversationId, limit = 50, offset = 0) => {
        const response = await api.get(`/messages/${conversationId}/files?limit=${limit}&offset=${offset}`);
        return response.data;
    },

    getPinned: async (conversationId) => {
        const response = await api.get(`/messages/${conversationId}/pinned`);
        return response.data;
    },
    pin: async (messageId) => {
        const response = await api.post(`/messages/pin/${messageId}`);
        return response.data;
    },
    unpin: async (messageId) => {
        const response = await api.post(`/messages/unpin/${messageId}`);
        return response.data;
    },
};

export default api;
