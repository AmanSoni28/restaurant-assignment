import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

export function getErrorMessage(err) {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.request && !err.response) return 'Cannot reach the server. Please check that it is running.';
  return err.message || 'Something went wrong';
}

export default api;
