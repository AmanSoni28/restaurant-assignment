import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://restaurant-assignment.onrender.com/api');

const api = axios.create({ baseURL, timeout: 15000 });

export function getErrorMessage(err) {
  if (err.response?.data?.message) return err.response.data.message;
  if (err.request && !err.response) return 'Cannot reach the server. Please check that it is running.';
  return err.message || 'Something went wrong';
}

export default api;
