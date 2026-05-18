import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';

import api from '../services/api';

const SettingsScreen = ({ navigation }) => {
  const { logout } = useContext(AuthContext);
  const { t, locale, changeLanguage } = useContext(LanguageContext);
  
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(true);
  const [emergencyEnabled, setEmergencyEnabled] = useState(false);

  // New states for interactive sections
  const [notiModalVisible, setNotiModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  
  // Profile state
  const [profile, setProfile] = useState(null);
  const [editedName, setEditedName] = useState('');
  
  // Specific settings states
  const [pushEnabled, setPushEnabled] = useState(true);
  const [reportEnabled, setReportEnabled] = useState(true);

  // Profile photo state
  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    loadSettings();
    fetchProfile();
    loadProfilePic();
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfilePic();
    });
    return unsubscribe;
  }, [navigation]);

  const loadProfilePic = async () => {
    try {
      const currentUsername = await AsyncStorage.getItem('current_username');
      if (currentUsername) {
        const savedAvatar = await AsyncStorage.getItem(`@cardio_avatar_${currentUsername}`);
        setProfilePic(savedAvatar);
      }
    } catch (e) {
      console.log('Failed to load settings avatar', e);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await api.get('user/profile/');
      setProfile(response.data);
      setEditedName(response.data.username);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSettings = async () => {
    try {
      const push = await AsyncStorage.getItem('push_enabled');
      const report = await AsyncStorage.getItem('report_enabled');
      const alerts = await AsyncStorage.getItem('heart_alerts_enabled');
      
      if (push !== null) setPushEnabled(JSON.parse(push));
      if (report !== null) setReportEnabled(JSON.parse(report));
      if (alerts !== null) setAlertsEnabled(JSON.parse(alerts));
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateName = async () => {
    if (!editedName.trim()) return;
    try {
      const response = await api.patch('user/profile/', { username: editedName });
      setProfile(response.data);
      setNameModalVisible(false);
      Alert.alert("Success", "Profile name updated!");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not update name.");
    }
  };
  const handleAlertsToggle = async (value) => {
    setAlertsEnabled(value);
    await AsyncStorage.setItem('heart_alerts_enabled', JSON.stringify(value));
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to exit?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout }
    ]);
  };

  const handlePushToggle = async (value) => {
    setPushEnabled(value);
    await AsyncStorage.setItem('push_enabled', JSON.stringify(value));
  };

  const handleReportToggle = async (value) => {
    setReportEnabled(value);
    await AsyncStorage.setItem('report_enabled', JSON.stringify(value));
    if (!value) {
      Alert.alert("Notifications", "Daily reports have been disabled.");
    }
  };


  const handleClearChat = async () => {
    try {
      // 1. Clear Backend Chat History
      await api.delete('chat/clear/');
      
      Alert.alert("Success", "All chat history has been permanently deleted.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not clear data. Please try again.");
    }
  };

  const renderToggle = (icon, title, sub, iconColor, bg, value, onValueChange) => (
    <View style={styles.menuItem}>
      <View style={[styles.menuIconWrap, {backgroundColor: bg}]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSub}>{sub}</Text>
      </View>
      <Switch 
         value={value} 
         onValueChange={onValueChange} 
         trackColor={{ false: '#e5e5ea', true: '#34c759' }}
         thumbColor="#fff"
      />
    </View>
  );

  const renderLink = (icon, title, sub, iconColor, bg, onPress) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconWrap, {backgroundColor: bg}]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={[styles.menuTitle, {color: iconColor === '#ff4b4b' ? '#ff4b4b' : '#333'}]}>{title}</Text>
        {sub && <Text style={styles.menuSub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{marginRight: 15}}>
                <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>{t('settings')}</Text>
              <Text style={styles.headerSub}>Customize your experience</Text>
            </View>
        </View>

        <LinearGradient
          colors={['#4ba1ff', '#2d7df6']}
          style={styles.premiumCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.premiumAvatar}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={{ width: '100%', height: '100%', borderRadius: 25 }} />
            ) : (
              <Ionicons name="person" size={24} color="#3282f6" />
            )}
          </View>
          <View style={styles.premiumInfo}>
            <Text style={styles.premiumName}>{profile ? profile.username : 'User Account'}</Text>
            <Text style={styles.premiumSub}>{profile ? profile.email : 'Premium Plan ✦'}</Text>
          </View>
          <TouchableOpacity style={styles.editBtn} onPress={() => setNameModalVisible(true)}>
             <Ionicons name="pencil" size={16} color="#3282f6" />
          </TouchableOpacity>
        </LinearGradient>

        <Text style={styles.sectionHeader}>{t('monitoring')}</Text>
        <View style={styles.cardBlock}>
          {renderToggle('heart', 'Heart Rate Alerts', 'Notify when abnormal', '#ff4b4b', '#ffebeb', alertsEnabled, handleAlertsToggle)}
          <View style={styles.divider} />
          {renderToggle('sync', 'Live Sync', 'Connect hardware device', '#3282f6', '#e6f0ff', liveSyncEnabled, setLiveSyncEnabled)}
          <View style={styles.divider} />
          {renderToggle('warning', 'Emergency Alert', 'Auto-call contacts', '#f5a623', '#fef3c7', emergencyEnabled, setEmergencyEnabled)}
        </View>

        <Text style={styles.sectionHeader}>{t('app_preferences')}</Text>
        <View style={styles.cardBlock}>
          {renderLink('notifications', t('notifications'), 'Manage reminders', '#f5a623', '#fef3c7', () => setNotiModalVisible(true))}
          <View style={styles.divider} />
          {renderLink('globe', t('language'), locale === 'en' ? 'English' : 'العربية', '#3282f6', '#e6f0ff', () => setLangModalVisible(true))}
          <View style={styles.divider} />
          {renderLink('lock-closed', t('privacy'), 'Data & permissions', '#845ef7', '#f1f0ff', () => setPrivacyModalVisible(true))}
          <View style={styles.divider} />
          {renderLink('help-circle', 'Help & Support', 'FAQ & Contact', '#28c46c', '#ebfbee', () => navigation.navigate('Help'))}
          <View style={styles.divider} />
          {renderLink('log-out', t('logout'), null, '#ff4b4b', '#fff0f0', handleLogout)}
        </View>

        {/* --- MODALS --- */}

        {/* Name Edit Modal */}
        <Modal visible={nameModalVisible} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile Name</Text>
                <TouchableOpacity onPress={() => setNameModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              <TextInput 
                style={styles.nameInput}
                value={editedName}
                onChangeText={setEditedName}
                placeholder="Enter your name"
                autoFocus
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateName}>
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Notifications Modal */}
        <Modal visible={notiModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Notification Settings</Text>
                <TouchableOpacity onPress={() => setNotiModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              {renderToggle('notifications', 'Push Notifications', 'Real-time health alerts', '#3282f6', '#e6f0ff', pushEnabled, handlePushToggle)}
              <TouchableOpacity style={styles.saveBtn} onPress={() => setNotiModalVisible(false)}>
                <Text style={styles.saveBtnText}>{t('done')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Language Modal */}
        <Modal visible={langModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Language</Text>
                <TouchableOpacity onPress={() => setLangModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
                {['English', 'العربية (Arabic)'].map((lang, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={styles.langItem} 
                  onPress={() => {
                    const newLocale = lang.includes('Arabic') ? 'ar' : 'en';
                    changeLanguage(newLocale);
                    setLangModalVisible(false);
                  }}
                >
                  <Text style={[styles.langText, (locale === 'ar' && lang.includes('Arabic')) || (locale === 'en' && lang === 'English') ? styles.langActive : null]}>{lang}</Text>
                  {((locale === 'ar' && lang.includes('Arabic')) || (locale === 'en' && lang === 'English')) && <Ionicons name="checkmark-circle" size={20} color="#3282f6" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

        {/* Privacy & Security Modal */}
        <Modal visible={privacyModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Privacy & Security</Text>
                <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>
              {renderLink('trash-outline', 'Clear Chat History', 'Delete all AI records', '#ff4b4b', '#fff0f0', () => {
                Alert.alert("Confirm", "Delete all chat history permanently?", [
                  { text: 'Cancel' },
                  { text: 'Delete', style: 'destructive', onPress: handleClearChat }
                ])
              })}
              <TouchableOpacity style={styles.saveBtn} onPress={() => setPrivacyModalVisible(false)}>
                <Text style={styles.saveBtnText}>Save Preferences</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 40
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222'
  },
  headerSub: {
    fontSize: 14,
    color: '#888'
  },
  premiumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    marginBottom: 30,
    shadowColor: '#3282f6',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5
  },
  premiumAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden'
  },
  premiumInfo: {
    flex: 1
  },
  premiumName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  premiumSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888',
    marginBottom: 10,
    marginLeft: 5,
    letterSpacing: 1
  },
  cardBlock: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  menuTextWrap: {
    flex: 1
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  menuSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#f0f0f0'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 40
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  saveBtn: {
    backgroundColor: '#3282f6',
    padding: 16,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  langItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
  },
  langText: {
    fontSize: 16,
    color: '#333'
  },
  langActive: {
    color: '#3282f6',
    fontWeight: 'bold'
  },
  nameInput: {
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e6e6e6',
    marginTop: 10
  }
});

export default SettingsScreen;
