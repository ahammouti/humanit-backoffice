import api from './client.js';

// Returns { data, total, page, pages, limit }
export const getPayments = (params) =>
  api.get('/payments', { params }).then((r) => r.data);

export const createPayment = (data) =>
  api.post('/payments', data).then((r) => r.data);

export const syncHelloasso = (params) =>
  api.get('/helloasso/sync', { params }).then((r) => r.data);

export const syncHelloassoMembers = () =>
  api.get('/helloasso/sync-members').then((r) => r.data);

export const resetHelloassoData = () =>
  api.delete('/helloasso/reset').then((r) => r.data);
