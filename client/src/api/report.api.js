import api from './axios';

export const getDashboard          = ()        => api.get('/reports/dashboard');
export const getAttendanceSummary  = (params)  => api.get('/reports/attendance-summary', { params });
export const getLeaveSummary       = (params)  => api.get('/reports/leave-summary', { params });
export const getMonthlyReport      = (params)  => api.get('/reports/monthly', { params });
