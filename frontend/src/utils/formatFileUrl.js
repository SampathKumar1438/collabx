import config from '../config';

/**
 * Formats a URL to ensure it is accessible from the client browser.
 * Specifically handles replacing internal Docker hostnames with the public API URL.
 * 
 * @param {string} url - The URL to format
 * @returns {string} - The formatted, accessible URL
 */
export const formatFileUrl = (url) => {
    if (!url) return null;

    // If it's already a data URL (base64) or external https link, return as is
    if (url.startsWith('data:') || url.startsWith('blob:')) return url;

    // Check if the URL contains the internal docker network hostname 'minio:9000'
    if (url.includes('minio:9000')) {
        // Replace internal docker host with the public API URL base
        // We know the Proxy in backend/index.js handles the path routing

        // Remove the 'http://minio:9000' part
        const relativePath = url.split('minio:9000')[1];

        // Use the API_URL from config, stripping the '/api' suffix if present
        // because the proxy is usually at root or specific path 
        // Logic: http://localhost:5000/api -> http://localhost:5000
        const baseUrl = config.API.BASE_URL.replace(/\/api$/, '');

        return `${baseUrl}${relativePath}`;
    }

    // Another case: if the URL is relative (starts with /), prepend base URL
    if (url.startsWith('/')) {
        const baseUrl = config.API.BASE_URL.replace(/\/api$/, '');
        return `${baseUrl}${url}`;
    }

    return url;
};
