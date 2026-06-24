import api from './axios';

export const applyLeave    = (data)     => api.post('/leaves', data);
export const getMyLeaves   = (params)   => api.get('/leaves/my', { params });
export const getMyBalance  = (params)   => api.get('/leaves/my-balance', { params });
export const getPending    = ()         => api.get('/leaves/pending');
export const getTeamLeaves = (params)   => api.get('/leaves/team', { params });
export const getAllLeaves   = (params)   => api.get('/leaves', { params });
export const getLeaveById  = (id)       => api.get(`/leaves/${id}`);
export const approveLeave  = (id, data) => api.post(`/leaves/${id}/approve`, data);
export const rejectLeave   = (id, data) => api.post(`/leaves/${id}/reject`, data);
export const cancelLeave   = (id)       => api.delete(`/leaves/${id}`);
