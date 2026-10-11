import api from './client';
import { expectArrayResponse } from './response';

const data = (res) => res.data;

export const menuApi = {
  list: (params) => api.get('/menu', { params }).then((res) => expectArrayResponse(res.data, '/api/menu')),
  create: (item) => api.post('/menu', item).then(data),
  update: (id, item) => api.put(`/menu/${id}`, item).then(data),
  remove: (id) => api.delete(`/menu/${id}`),
};

export const tableApi = {
  list: () => api.get('/tables').then((res) => expectArrayResponse(res.data, '/api/tables')),
  create: (table) => api.post('/tables', table).then(data),
  remove: (id) => api.delete(`/tables/${id}`),
};

export const orderApi = {
  list: (params) => api.get('/orders', { params }).then((res) => expectArrayResponse(res.data, '/api/orders')),
  get: (id) => api.get(`/orders/${id}`).then(data),
  create: (order) => api.post('/orders', order).then(data),
  update: (id, changes) => api.patch(`/orders/${id}`, changes).then(data),
  checkout: (id, payment) => api.post(`/orders/${id}/checkout`, payment).then(data),
  cancel: (id) => api.post(`/orders/${id}/cancel`).then(data),
};

export const reportApi = {
  summary: (params) => api.get('/reports/summary', { params }).then(data),
};
