import api from './client.js';

// Returns { data, total, page, pages, limit }
export const getDonors = (params) =>
  api.get('/donors', { params }).then((r) => r.data);

export const getDonor = (id) =>
  api.get(`/donors/${id}`).then((r) => r.data);

export const getDonorPayments = (id) =>
  api.get('/payments', { params: { donorId: id, limit: 200 } }).then((r) => r.data);

export const getDonorRelances = (id) =>
  api.get('/relances', { params: { donorId: id } }).then((r) => r.data);

export const createDonor = (data) =>
  api.post('/donors', data).then((r) => r.data);

export const updateDonor = (id, data) =>
  api.put(`/donors/${id}`, data).then((r) => r.data);

export const deleteDonor  = (id) => api.delete(`/donors/${id}`);
export const restoreDonor = (id) => api.post(`/donors/${id}/restore`).then(r => r.data);
export const purgeDonor   = (id) => api.delete(`/donors/${id}/purge`);
export const getTrashed   = ()   => api.get('/donors/trash').then(r => r.data);

export const rgpdExport = (id) =>
  api.get(`/donors/${id}/export`).then((r) => r.data);

export const rgpdDelete = (id) =>
  api.delete(`/donors/${id}/full`);
