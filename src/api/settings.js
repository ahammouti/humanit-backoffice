import client from './client.js';

export const fetchSettings   = ()       => client.get('/settings').then(r => r.data);
export const updateSettings  = (data)   => client.put('/settings', data).then(r => r.data);
