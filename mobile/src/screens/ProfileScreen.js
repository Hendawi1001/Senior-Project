import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { LanguageContext } from '../context/LanguageContext';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = ({ navigation }) => {
  const { logout } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [profile, setProfile] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [recordsModalVisible, setRecordsModalVisible] = useState(false);

  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('');
  const [image, setImage] = useState(null);

  useEffect(() => {
    fetchData();
    loadSavedAvatar();
  }, []);

  const loadSavedAvatar = async () => {
    try {
      const currentUsername = await AsyncStorage.getItem('current_username');
      if (currentUsername) {
        const savedUri = await AsyncStorage.getItem(`@cardio_avatar_${currentUsername}`);
        if (savedUri) setImage(savedUri);
      }
    } catch (e) {
      console.log('Failed to load saved avatar', e);
    }
  };

  const fetchData = async () => {
    try {
      const profileRes = await api.get('user/profile/');
      setProfile(profileRes.data);
      setEditAge(profileRes.data.age?.toString() || '');
      setEditGender(profileRes.data.gender || '');

      const healthRes = await api.get('health/data/');
      if (healthRes.data.length > 0) {
        setHealthData(healthRes.data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const genderMap = { 'Male': 'M', 'Female': 'F', 'Other': 'O' };
      await api.patch('user/profile/', {
        age: parseInt(editAge),
        gender: genderMap[editGender] || editGender
      });
      await fetchData();
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImage(uri);
      // Persist avatar to AsyncStorage so all screens can display it
      try {
        const currentUsername = await AsyncStorage.getItem('current_username');
        if (currentUsername) {
          await AsyncStorage.setItem(`@cardio_avatar_${currentUsername}`, uri);
        }
      } catch (e) {
        console.log('Failed to save avatar', e);
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => logout() }
      ]
    );
  };

  const isHealthy = healthData?.status === 'normal' || !healthData;

  const renderMenuItem = (icon, title, sub, iconColor, bg, onPress) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={[styles.menuIconWrap, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Premium Header & Profile Section */}
        <LinearGradient
          colors={['#4ba1ff', '#2d7df6']}
          style={styles.headerArea}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileSection}>
            <TouchableOpacity style={styles.avatarWrapper} onPress={pickImage}>
              <View style={styles.avatarMain}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.profileImage} />
                ) : (
                  <Ionicons name="person" size={50} color="#3282f6" />
                )}
              </View>
              <View style={styles.editAvatarBtn}>
                <Ionicons name="camera" size={18} color="#fff" />
              </View>
            </TouchableOpacity>
            
            <Text style={styles.userName}>{profile ? profile.username : 'User Name'}</Text>
            <Text style={styles.userEmail}>{profile ? profile.email : 'user@example.com'}</Text>
            
            <View style={styles.badgeRow}>
              <View style={styles.statusBadge}>
                <View style={[styles.statusDot, { backgroundColor: isHealthy ? '#28c46c' : '#ff4b4b' }]} />
                <Text style={styles.statusBadgeText}>{isHealthy ? 'Healthy' : 'Warning'}</Text>
              </View>
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={12} color="#fff" />
                <Text style={styles.premiumText}>Premium</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.contentArea}>

          <View style={styles.statsCard}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{healthData ? healthData.heart_rate : '86'}</Text>
              <Text style={styles.statLabel}>{t('bpm')}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{profile && profile.age ? profile.age : '28'}</Text>
              <Text style={styles.statLabel}>Age</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: isHealthy ? '#222' : '#ff4b4b' }]}>{isHealthy ? t('status_normal') : t('status_critical')}</Text>
              <Text style={styles.statLabel}>{t('risk_level')}</Text>
            </View>
          </View>

          <View style={[styles.healthyBanner, { backgroundColor: isHealthy ? '#eafcf0' : '#ffebeb', borderColor: isHealthy ? '#c3f5d5' : '#ffcaca' }]}>
            <View style={[styles.statusIcon, { backgroundColor: isHealthy ? '#28c46c' : '#ff4b4b' }]}>
              <Ionicons name={isHealthy ? "checkmark" : "warning"} size={20} color="#fff" />
            </View>
            <View>
              <Text style={[styles.healthyTitle, { color: isHealthy ? '#1b8a47' : '#d12e2e' }]}>
                {isHealthy ? t('status_normal') : t('status_critical')}
              </Text>
              <Text style={[styles.healthySub, { color: isHealthy ? '#28c46c' : '#ff4b4b' }]}>Last check: Today 9:41 AM</Text>
            </View>
          </View>

          <View style={styles.menuContainer}>
            {renderMenuItem('person-circle', t('personal_info'), 'Age, gender, and metrics', '#3282f6', '#e6f0ff', () => setEditModalVisible(true))}
            {renderMenuItem('heart', t('heart_history'), 'All recorded readings', '#ff4b4b', '#ffebeb', () => navigation.navigate('Dashboard'))}
            {renderMenuItem('document-text', t('medical_records'), 'Upload & manage documents', '#f5a623', '#fef3c7', () => setRecordsModalVisible(true))}
            {renderMenuItem('people', t('emergency_contacts'), 'Manage trusted numbers', '#28c46c', '#ebfbee', () => setContactModalVisible(true))}
            {renderMenuItem('log-out-outline', t('logout'), 'Sign out of your account', '#888', '#f8f9fa', handleLogout)}
          </View>

          {/* Edit Profile Modal */}
          <Modal visible={editModalVisible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Update Profile</Text>
                  <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.inputLabel}>Age</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editAge}
                  onChangeText={setEditAge}
                  placeholder="Enter age"
                  keyboardType="numeric"
                />

                <Text style={styles.inputLabel}>Gender</Text>
                <View style={styles.genderRow}>
                  {['Male', 'Female', 'Other'].map(g => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderBtn, editGender === g ? styles.genderBtnActive : null]}
                      onPress={() => setEditGender(g)}
                    >
                      <Text style={[styles.genderText, editGender === g ? styles.genderTextActive : null]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Contacts Modal (Mock) */}
          <Modal visible={contactModalVisible} animationType="fade" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Emergency Contacts</Text>
                  <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                {[
                  { name: 'Dr. Sarah (Heart Specialist)', phone: '+1 234 567 890' },
                  { name: 'John Doe (Brother)', phone: '+1 987 654 321' },
                  { name: 'Local Hospital', phone: '911' }
                ].map((c, i) => (
                  <View key={i} style={styles.contactItem}>
                    <View>
                      <Text style={styles.contactName}>{c.name}</Text>
                      <Text style={styles.contactPhone}>{c.phone}</Text>
                    </View>
                    <TouchableOpacity style={styles.callBtn}>
                      <Ionicons name="call" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}

                <TouchableOpacity style={styles.addContactBtn} onPress={() => setContactModalVisible(false)}>
                  <Text style={styles.addContactText}>+ Add New Contact</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Records Modal (Mock) */}
          <Modal visible={recordsModalVisible} animationType="fade" transparent>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Medical Records</Text>
                  <TouchableOpacity onPress={() => setRecordsModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                <View style={styles.emptyRecords}>
                  <Ionicons name="cloud-upload-outline" size={50} color="#ccc" />
                  <Text style={styles.emptyText}>No documents uploaded yet.</Text>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={() => setRecordsModalVisible(false)}>
                  <Text style={styles.saveBtnText}>Upload Document</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

        </View>
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
    flexGrow: 1,
    paddingBottom: 40
  },
  headerArea: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 80,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTop: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30
  },
  headerTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.5
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  profileSection: {
    alignItems: 'center'
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 15
  },
  avatarMain: {
    width: 90,
    height: 90,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    overflow: 'hidden'
  },
  profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  editAvatarBtn: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#3282f6',
    borderWidth: 3,
    borderColor: '#4ba1ff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  userName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 20,
    fontWeight: '500'
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 12
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 5
  },
  premiumText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  contentArea: {
    paddingHorizontal: 20,
    marginTop: -40
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20
  },
  statBox: {
    alignItems: 'center',
    width: '30%'
  },
  statVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222'
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 5
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee'
  },
  healthyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 25
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  healthyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2
  },
  healthySub: {
    fontSize: 12
  },
  menuContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
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
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5'
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
    marginTop: 3
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
    maxHeight: '80%'
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
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '600'
  },
  modalInput: {
    backgroundColor: '#f5f7fa',
    height: 50,
    borderRadius: 15,
    paddingHorizontal: 15,
    marginBottom: 20,
    fontSize: 16,
    color: '#333'
  },
  genderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25
  },
  genderBtn: {
    flex: 1,
    height: 45,
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#eee'
  },
  genderBtnActive: {
    backgroundColor: '#3282f6',
    borderColor: '#3282f6'
  },
  genderText: {
    color: '#666',
    fontWeight: '600'
  },
  genderTextActive: {
    color: '#fff'
  },
  saveBtn: {
    backgroundColor: '#3282f6',
    height: 55,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3282f6',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 15,
    marginBottom: 12
  },
  contactName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  contactPhone: {
    fontSize: 14,
    color: '#888',
    marginTop: 2
  },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#28c46c',
    justifyContent: 'center',
    alignItems: 'center'
  },
  addContactBtn: {
    padding: 15,
    alignItems: 'center'
  },
  addContactText: {
    color: '#3282f6',
    fontWeight: 'bold'
  },
  emptyRecords: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyText: {
    color: '#999',
    marginTop: 10,
    fontSize: 14
  }
});

export default ProfileScreen;
