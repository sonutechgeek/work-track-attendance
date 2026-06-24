import api from './axios';

export const getDepartments   = ()         => api.get('/departments');
export const getDepartmentById = (id)      => api.get(`/departments/${id}`);
export const createDepartment = (data)     => api.post('/departments', data);
export const updateDepartment = (id, data) => api.patch(`/departments/${id}`, data);
export const deleteDepartment = (id)       => api.delete(`/departments/${id}`);
