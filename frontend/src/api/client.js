import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
})

export const getHealth    = ()           => api.get('/health').then(r => r.data)
export const getMachines  = ()           => api.get('/machines').then(r => r.data)
export const getDemoPredict = (id)       => api.get(`/demo/${id}`).then(r => r.data)
export const getHistory   = (id, limit=50) => api.get('/history', { params: id ? { machine_id: id, limit } : { limit } }).then(r => r.data)
export const getAlerts    = (limit=20)   => api.get('/alerts', { params: { limit } }).then(r => r.data)

export default api