import api from './client.js';

export const getRelances = (params) =>
  api.get('/relances', { params }).then((r) => r.data);

export const createRelance = (data) =>
  api.post('/relances', data).then((r) => r.data);
