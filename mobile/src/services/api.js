import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Use the explicit computer Wi-Fi IP so both Physical Phones and Emulators can connect
const API_URL = 'http://10.21.2.151:8000/api/';

// 🇪🇬 EGYPT DOCTOR / EMERGENCY PHONE NUMBER: Change this to your doctor's real number!
export const EMERGENCY_PHONE = 'tel:+201017141995'; // Active Egypt Mobile: 01017141995

const api = axios.create({
  baseURL: API_URL,
  timeout: 5000, // 5 seconds timeout to prevent hanging forever offline
});

let logoutHandler = () => { };

export const setLogoutHandler = (handler) => {
  logoutHandler = handler;
};

api.interceptors.request.use(
  async (config) => {
    const savedServerIp = await AsyncStorage.getItem('@django_server_ip');
    if (savedServerIp && savedServerIp.trim()) {
      config.baseURL = `http://${savedServerIp.trim()}:8000/api/`;
    } else {
      config.baseURL = API_URL;
    }

    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
      logoutHandler();
    }
    return Promise.reject(error);
  }
);

export default api;
