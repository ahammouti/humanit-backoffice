import api from './client.js';

export const getActivity = (params) =>
  api.get('/activity', { params }).then((r) => r.data);

export const logAction = (action, subject, details) =>
  api.post('/activity', { action, subject, details }).then((r) => r.data);
