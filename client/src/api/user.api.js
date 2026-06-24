import api from './axios';

export const getUsers         = (params)    => api.get('/users', { params });
export const getUserById      = (id)        => api.get(`/users/${id}`);
export const createUser       = (data)      => api.post('/users', data);
export const updateUser       = (id, data)  => api.patch(`/users/${id}`, data);
export const deleteUser       = (id)        => api.delete(`/users/${id}`);
export const assignManager    = (id, data)  => api.patch(`/users/${id}/assign-manager`, data);
export const getMyTeam        = (params)    => api.get('/users/my-team', { params });
export const updateMyProfile  = (data)      => api.patch('/users/my-profile', data);
export const getLeaveBalance  = (id, year)  => api.get(`/users/${id}/leave-balance`, { params: { year } });
export const updateLeaveBalance = (id, data, year) =>
  api.patch(`/users/${id}/leave-balance`, data, { params: { year } });
