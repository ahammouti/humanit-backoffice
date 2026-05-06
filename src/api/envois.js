import api from './client.js';

export const getEnvois = () =>
  api.get('/envois').then((r) => r.data);

export const createEnvoi = (data) =>
  api.post('/envois', data).then((r) => r.data);

export const updateEnvoi = (id, data) =>
  api.put(`/envois/${id}`, data).then((r) => r.data);

export const syncRemitly = () =>
  api.get('/envois/remitly/sync').then((r) => r.data);
