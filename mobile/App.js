import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { SafetyProvider } from './src/context/SafetyContext';
import AppNav from './src/navigation/AppNav';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <SafetyProvider>
          <AppNav />
        </SafetyProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
