import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const SignupScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const { register } = useContext(AuthContext);

  const [securePassword, setSecurePassword] = useState(true);
  const [secureConfirmPassword, setSecureConfirmPassword] = useState(true);
  const [gender, setGender] = useState('M'); // Default to Male

  // Birthdate Picker States
  const [birthDate, setBirthDate] = useState(new Date(2000, 0, 1));
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [selectedYear, setSelectedYear] = useState(2000);
  const [selectedMonth, setSelectedMonth] = useState(0); // Jan
  const [selectedDay, setSelectedDay] = useState(1);

  const YEARS = Array.from({ length: 90 }, (_, i) => new Date().getFullYear() - i);
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const getDaysArray = (year, monthIdx) => {
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  };

  const handleConfirmBirthDate = () => {
    const maxDays = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const finalDay = selectedDay > maxDays ? maxDays : selectedDay;
    setBirthDate(new Date(selectedYear, selectedMonth, finalDay));
    setCalendarModalVisible(false);
  };

  // Django Server IP Address states
  const [djangoModalVisible, setDjangoModalVisible] = useState(false);
  const [djangoIp, setDjangoIp] = useState('10.21.2.151');
  const [editedDjangoIp, setEditedDjangoIp] = useState('10.21.2.151');

  useEffect(() => {
    const loadSavedIp = async () => {
      try {
        const saved = await AsyncStorage.getItem('@django_server_ip');
        if (saved) {
          setDjangoIp(saved);
          setEditedDjangoIp(saved);
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadSavedIp();
  }, []);

  const handleSaveDjangoIp = async () => {
    if (!editedDjangoIp.trim()) return;
    try {
      await AsyncStorage.setItem('@django_server_ip', editedDjangoIp.trim());
      setDjangoIp(editedDjangoIp.trim());
      setDjangoModalVisible(false);
      Alert.alert('Success', 'Django Server IP updated! You can now log in or register.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to save server IP.');
    }
  };

  const handleSignup = async () => {
    try {
      if (!username || !password || !confirmPassword) {
        Alert.alert('Error', 'Username, password, and confirm password are required');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
      
      // Calculate age from birthDate
      const currentYearNum = new Date().getFullYear();
      const birthYearNum = birthDate.getFullYear();
      let calculatedAge = currentYearNum - birthYearNum;
      
      const today = new Date();
      if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }

      setIsSigningUp(true);
      await register({ username, email, password, age: calculatedAge, gender: gender });
    } catch (e) {
      let errorMsg = 'An unexpected error occurred. Please try again.';
      
      if (!e.response) {
        // Network error / server unreachable
        errorMsg = 'Cannot connect to the server. Please check your internet connection and try again.';
      } else {
        const errorData = e.response.data;
        if (typeof errorData === 'object') {
          errorMsg = Object.keys(errorData).map(key => {
            const fieldVal = errorData[key];
            const cleanVal = Array.isArray(fieldVal) ? fieldVal.join(', ') : fieldVal;
            if (key === 'non_field_errors') {
              return cleanVal;
            }
            // Capitalize field name
            const fieldName = key.charAt(0).toUpperCase() + key.slice(1);
            return `${fieldName}: ${cleanVal}`;
          }).join('\n');
        } else if (typeof errorData === 'string') {
          errorMsg = errorData;
        }
      }
      Alert.alert('Registration Failed', errorMsg);
    } finally {
      setIsSigningUp(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
          
          {/* Premium Header */}
          <LinearGradient
            colors={['#4ba1ff', '#2d7df6']}
            style={styles.headerArea}
          >
            <View style={styles.headerNavRow}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.gearIconBtn} onPress={() => setDjangoModalVisible(true)}>
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.headerTitle}>Create Account</Text>
            <Text style={styles.headerSub}>Join CardioGo and start monitoring your heart intelligently today.</Text>
          </LinearGradient>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>FULL NAME / USERNAME</Text>
              <View style={styles.inputBox}>
                <Ionicons name="person-outline" size={20} color="#3282f6" />
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. ahmed_99"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  placeholderTextColor="#adb5bd"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <View style={styles.inputBox}>
                <Ionicons name="mail-outline" size={20} color="#3282f6" />
                <TextInput
                  style={styles.textInput}
                  placeholder="name@example.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#adb5bd"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>PASSWORD</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={20} color="#3282f6" />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  secureTextEntry={securePassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="#adb5bd"
                />
                <TouchableOpacity onPress={() => setSecurePassword(!securePassword)} style={{ padding: 10 }}>
                  <Ionicons name={securePassword ? "eye-off-outline" : "eye-outline"} size={20} color="#adb5bd" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
              <View style={styles.inputBox}>
                <Ionicons name="lock-closed-outline" size={20} color="#3282f6" />
                <TextInput
                  style={styles.textInput}
                  placeholder="••••••••"
                  secureTextEntry={secureConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholderTextColor="#adb5bd"
                />
                <TouchableOpacity onPress={() => setSecureConfirmPassword(!secureConfirmPassword)} style={{ padding: 10 }}>
                  <Ionicons name={secureConfirmPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#adb5bd" />
                </TouchableOpacity>
              </View>
            </View>

             <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 0.55 }]}>
                <Text style={styles.fieldLabel}>BIRTH DATE</Text>
                <TouchableOpacity 
                  style={styles.inputBox}
                  onPress={() => setCalendarModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={20} color="#3282f6" />
                  <Text style={styles.selectedDateText}>
                    {birthDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputGroup, { flex: 0.42 }]}>
                <Text style={styles.fieldLabel}>GENDER</Text>
                <View style={styles.genderContainer}>
                  <TouchableOpacity 
                    style={[styles.genderBtn, gender === 'M' && styles.genderBtnActive]} 
                    onPress={() => setGender('M')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.genderBtnText, gender === 'M' && styles.genderBtnTextActive]}>M</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.genderBtn, gender === 'F' && styles.genderBtnActive]} 
                    onPress={() => setGender('F')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.genderBtnText, gender === 'F' && styles.genderBtnTextActive]}>F</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.genderBtn, gender === 'O' && styles.genderBtnActive]} 
                    onPress={() => setGender('O')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.genderBtnText, gender === 'O' && styles.genderBtnTextActive]}>O</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.mainActionBtn} 
              onPress={handleSignup} 
              activeOpacity={0.9}
              disabled={isSigningUp}
            >
              <LinearGradient
                colors={['#4ca0ff', '#2d7df6']}
                style={styles.gradientBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isSigningUp ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.actionBtnText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.authFooter}>
              <Text style={styles.authFooterText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.authFooterLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Django Server IP Config Modal */}
      <Modal visible={djangoModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Django Server Configuration</Text>
              <TouchableOpacity onPress={() => setDjangoModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, color: '#666', marginBottom: 15 }}>
              Enter the IP address of your Django Backend Server (e.g. 192.168.4.2 or 10.21.2.151).
            </Text>
            <TextInput 
              style={styles.modalInput}
              value={editedDjangoIp}
              onChangeText={setEditedDjangoIp}
              placeholder="10.21.2.151"
              autoFocus
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveDjangoIp}>
              <Text style={styles.saveBtnText}>Save Configuration</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Dynamic Birth Date Picker Modal */}
      <Modal visible={calendarModalVisible} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Birth Date</Text>
              <TouchableOpacity onPress={() => setCalendarModalVisible(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Scrollable Year selector */}
            <Text style={styles.pickerSubLabel}>YEAR</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 10 }}
              style={{ maxHeight: 60 }}
            >
              {YEARS.map(y => (
                <TouchableOpacity 
                  key={y} 
                  style={[styles.yearPill, selectedYear === y && styles.activeYearPill]}
                  onPress={() => setSelectedYear(y)}
                >
                  <Text style={[styles.yearPillText, selectedYear === y && styles.activeYearPillText]}>{y}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Month Selection Grid */}
            <Text style={[styles.pickerSubLabel, { marginTop: 15 }]}>MONTH</Text>
            <View style={styles.gridContainer}>
              {MONTHS.map((m, idx) => (
                <TouchableOpacity 
                  key={m} 
                  style={[styles.monthGridItem, selectedMonth === idx && styles.activeMonthGridItem]}
                  onPress={() => setSelectedMonth(idx)}
                >
                  <Text style={[styles.gridText, selectedMonth === idx && styles.activeGridText]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Day Selection Grid */}
            <Text style={[styles.pickerSubLabel, { marginTop: 15 }]}>DAY</Text>
            <ScrollView style={{ maxHeight: 150 }}>
              <View style={styles.gridContainer}>
                {getDaysArray(selectedYear, selectedMonth).map(d => (
                  <TouchableOpacity 
                    key={d} 
                    style={[styles.dayGridItem, selectedDay === d && styles.activeDayGridItem]}
                    onPress={() => setSelectedDay(d)}
                  >
                    <Text style={[styles.gridText, selectedDay === d && styles.activeGridText]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <TouchableOpacity style={[styles.saveBtn, { marginTop: 20 }]} onPress={handleConfirmBirthDate}>
              <Text style={styles.saveBtnText}>Confirm Date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerArea: {
    paddingTop: 60,
    paddingHorizontal: 30,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#212529',
    marginLeft: 8,
  },
  genderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 60,
  },
  genderBtn: {
    flex: 1,
    height: 60,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  genderBtnActive: {
    backgroundColor: '#3282f6',
    borderColor: '#3282f6',
  },
  genderBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#495057',
  },
  genderBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    width: '100%',
    maxHeight: '90%',
  },
  pickerSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#adb5bd',
    letterSpacing: 1,
    marginBottom: 5,
  },
  yearPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeYearPill: {
    backgroundColor: '#e6f0ff',
    borderColor: '#3282f6',
  },
  yearPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
  },
  activeYearPillText: {
    color: '#3282f6',
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginHorizontal: -4,
  },
  monthGridItem: {
    width: '23%',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    margin: '1%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeMonthGridItem: {
    backgroundColor: '#e6f0ff',
    borderColor: '#3282f6',
  },
  dayGridItem: {
    width: '12%',
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    margin: '1%',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeDayGridItem: {
    backgroundColor: '#e6f0ff',
    borderColor: '#3282f6',
  },
  gridText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#495057',
  },
  activeGridText: {
    color: '#3282f6',
    fontWeight: '700',
  },
  headerNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  gearIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
  },
  modalInput: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#e9ecef',
    fontSize: 16,
    color: '#212529',
    fontWeight: '500',
    marginBottom: 20,
  },
  saveBtn: {
    backgroundColor: '#3282f6',
    borderRadius: 16,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 10
  },
  headerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500'
  },
  formSection: {
    paddingHorizontal: 30,
    paddingTop: 30,
    backgroundColor: '#fff',
    flex: 1
  },
  inputGroup: {
    marginBottom: 20
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#adb5bd',
    marginBottom: 8,
    letterSpacing: 1
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#212529',
    marginLeft: 12,
    fontWeight: '500'
  },
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  mainActionBtn: {
    marginTop: 10,
    marginBottom: 30
  },
  gradientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 60,
    borderRadius: 18,
    shadowColor: '#3282f6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8
  },
  authFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 30
  },
  authFooterText: {
    color: '#6c757d',
    fontSize: 15,
    fontWeight: '500'
  },
  authFooterLink: {
    color: '#3282f6',
    fontSize: 15,
    fontWeight: '700'
  }
});

export default SignupScreen;
