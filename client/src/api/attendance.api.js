import api from './axios';

export const checkIn      = (data)   => api.post('/attendance/check-in', data);
export const checkOut     = (data)   => api.post('/attendance/check-out', data);
export const getLiveTimer = ()        => api.get('/attendance/live-timer');
export const getToday     = ()        => api.get('/attendance/today');
export const getMyHistory = (params)  => api.get('/attendance/my', { params });
export const getTeam      = (params)  => api.get('/attendance/team', { params });
export const getAll       = (params)  => api.get('/attendance', { params });
export const updateRecord = (id, data) => api.patch(`/attendance/${id}`, data);
