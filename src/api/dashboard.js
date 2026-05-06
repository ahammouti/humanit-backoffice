import api from './client.js';

export const getStats = (params) =>
  api.get('/dashboard/stats', { params }).then((r) => r.data);

export const getPoleHistory = (pole) =>
  api.get('/dashboard/pole-history', { params: { pole } }).then((r) => r.data);
