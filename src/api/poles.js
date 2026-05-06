import api from './client.js';

export const getPoles = () =>
  api.get('/poles').then((r) => r.data);

export const createPole = (name) =>
  api.post('/poles', { name }).then((r) => r.data);

export const deletePole = (id) =>
  api.delete(`/poles/${id}`);
