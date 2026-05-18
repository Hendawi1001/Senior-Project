import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LanguageContext = createContext();

const translations = {
  en: {
    home: "Home",
    dashboard: "Dashboard",
    chat: "Chat AI",
    profile: "Profile",
    settings: "Settings",
    health_overview: "Your Health Overview",
    hello: "Hello,",
    pulse_score: "Medical Pulse Score",
    bpm: "BPM",
    steps: "Steps",
    calories: "kcal",
    risk_level: "Risk Level",
    personal_info: "Personal Info",
    heart_history: "Heart History",
    medical_records: "Medical Records",
    emergency_contacts: "Emergency Contacts",
    logout: "Logout",
    notifications: "Notifications",
    language: "Language",
    privacy: "Privacy & Security",
    app_preferences: "APP PREFERENCES",
    monitoring: "MONITORING",
    save: "Save",
    done: "Done",
    cancel: "Cancel",
    edit: "Edit",
    health_warning: "Health Warning",
    status_normal: "Normal",
    status_warning: "Warning",
    status_critical: "Critical",
    avg_bpm: "Avg BPM",
    bpm_now: "bpm now",
    medical_pulse: "Medical Pulse",
  },
  ar: {
    home: "الرئيسية",
    dashboard: "لوحة التحكم",
    chat: "الذكاء الاصطناعي",
    profile: "الملف الشخصي",
    settings: "الإعدادات",
    health_overview: "نظرة عامة على صحتك",
    hello: "أهلاً،",
    pulse_score: "نبضك الطبيبي",
    bpm: "نبضة/د",
    steps: "خطوة",
    calories: "سعرة",
    risk_level: "مستوى الخطر",
    personal_info: "المعلومات الشخصية",
    heart_history: "سجل القلب",
    medical_records: "السجلات الطبية",
    emergency_contacts: "جهات اتصال الطوارئ",
    logout: "تسجيل الخروج",
    notifications: "التنبيهات",
    language: "اللغة",
    privacy: "الخصوصية والأمان",
    app_preferences: "تفضيلات التطبيق",
    monitoring: "المراقبة",
    save: "حفظ",
    done: "تم",
    cancel: "إلغاء",
    edit: "تعديل",
    health_warning: "تحذير صحي",
    status_normal: "طبيعي",
    status_warning: "تحذير",
    status_critical: "حرج",
    avg_bpm: "متوسط نبضات القلب",
    bpm_now: "نبضة/دقيقة الآن",
    medical_pulse: "النبض الطبي",
  }
};

export const LanguageProvider = ({ children }) => {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    const saved = await AsyncStorage.getItem('user_language');
    if (saved) setLocale(saved);
  };

  const changeLanguage = async (lang) => {
    setLocale(lang);
    await AsyncStorage.setItem('user_language', lang);
  };

  const t = (key) => {
    return translations[locale][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ locale, t, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
