import api from './api';

const API_URL = '/polls';

export const createPoll = async (pollData) => {
    const response = await api.post(API_URL, pollData);
    return response.data;
};

export const getPolls = async () => {
    const response = await api.get(API_URL);
    return response.data;
};

export const votePoll = async (pollId, optionId) => {
    const response = await api.post(`${API_URL}/${pollId}/vote`, { optionId });
    return response.data;
};
