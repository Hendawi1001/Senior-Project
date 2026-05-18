import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setLogoutHandler } from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (username, password) => {
    try {
      const response = await api.post('auth/login/', { username, password });
      // 1. Commit tokens to disk first to avoid 401 race conditions on screen transitions
      await AsyncStorage.setItem('access_token', response.data.access);
      await AsyncStorage.setItem('refresh_token', response.data.refresh);
      await AsyncStorage.setItem('current_username', username); // Save logged-in username for chat privacy
      // 2. Trigger react navigation state switch second
      setUserToken(response.data.access);
    } catch (e) {
      console.error('Login error', e);
      throw e;
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post('auth/register/', userData);
      // Fast single-roundtrip signup: Save the immediately returned tokens directly!
      await AsyncStorage.setItem('access_token', response.data.access);
      await AsyncStorage.setItem('refresh_token', response.data.refresh);
      await AsyncStorage.setItem('current_username', userData.username); // Save registered username for chat privacy
      setUserToken(response.data.access);
    } catch (e) {
      console.error('Registration error', e);
      throw e;
    }
  };

  const logout = async () => {
    setUserToken(null);
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
  };

  const isLoggedIn = async () => {
    try {
      let token = await AsyncStorage.getItem('access_token');
      setUserToken(token);
      setIsLoading(false);
    } catch (e) {
      console.log(`isLogged in error ${e}`);
    }
  };

  useEffect(() => {
    isLoggedIn();
    setLogoutHandler(logout);
  }, []);

  return (
    <AuthContext.Provider value={{ login, logout, register, userToken, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
