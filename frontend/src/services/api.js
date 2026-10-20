import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

export const sensorApi = {
  // Ambil data terbaru & status perangkat
  getLatest: async () => {
    const res = await api.get('/sensor/latest');
    return res.data;
  },

  // Ambil riwayat sensor dengan filter & pagination
  getHistory: async ({ startDate, endDate, isDemo, page = 1, limit = 15 }) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (isDemo !== undefined && isDemo !== '') params.append('isDemo', isDemo);
    params.append('page', page);
    params.append('limit', limit);

    const res = await api.get(`/sensor/history?${params.toString()}`);
    return res.data;
  },

  // Dapatkan URL download file CSV
  getExportCSVUrl: ({ startDate, endDate, isDemo }) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (isDemo !== undefined && isDemo !== '') params.append('isDemo', isDemo);
    return `${API_BASE_URL}/sensor/export?${params.toString()}`;
  },

  // Trigger generator data demo simulator
  triggerDemoData: async (scenario = 'random') => {
    const res = await api.post('/sensor/demo/generate', { scenario });
    return res.data;
  }
};

export const settingsApi = {
  // Ambil pengaturan ambang batas saat ini
  getSettings: async () => {
    const res = await api.get('/settings');
    return res.data;
  },

  // Perbarui pengaturan ambang batas & kalibrasi
  updateSettings: async (settings) => {
    const res = await api.put('/settings', settings);
    return res.data;
  },

  // Kalibrasi otomatis R0 di udara bersih
  autoCalibrateR0: async ({ adc_clean_air, rl_kohm }) => {
    const res = await api.post('/settings/calibrate', { adc_clean_air, rl_kohm });
    return res.data;
  }
};

export default api;
