import api from './client.js';

export const getMembers = ()         => api.get('/members').then(r => r.data);
export const createMember = (data)   => api.post('/members', data).then(r => r.data);
export const updateMember = (id, d)  => api.put(`/members/${id}`, d).then(r => r.data);
export const deleteMember = (id)     => api.delete(`/members/${id}`).then(r => r.data);
