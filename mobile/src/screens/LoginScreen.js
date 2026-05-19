import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loadingApp, setLoadingApp] = useState(''); // 'google', 'apple'
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, register } = useContext(AuthContext);
  
  // Password visibility state
  const [securePassword, setSecurePassword] = useState(true);
  
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

  const handleSocialLogin = async (platform) => {
    setLoadingApp(platform);

    if (platform === 'google') {
      try {
        await WebBrowser.openBrowserAsync('https://accounts.google.com/ServiceLogin');
      } catch (error) {
        console.log(error);
      }
    } else if (platform === 'apple') {
      try {
        await WebBrowser.openBrowserAsync('https://appleid.apple.com/sign-in');
      } catch (error) {
        console.log(error);
      }
    }

    const demoUser = platform === 'google' ? 'GoogleUser' : 'AppleUser';
    const demoPass = 'SocialSecr3t!';
    const demoEmail = platform === 'google' ? 'user@gmail.com' : 'user@icloud.com';

    try {
      await login(demoUser, demoPass);
    } catch (e) {
      try {
        await register({ username: demoUser, email: demoEmail, password: demoPass, age: null, gender: 'O' });
      } catch (err) {
        Alert.alert('Login Failed', `Could not connect to ${platform}.`);
      }
    } finally {
      setLoadingApp('');
    }
  };

  const handleLogin = async () => {
    try {
      if (!username || !password) {
        Alert.alert('Error', 'Please enter username and password');
        return;
      }
      setIsLoggingIn(true);
      await login(username, password);
    } catch (e) {
      let errorMsg = 'An unexpected error occurred. Please try again.';
      
      if (!e.response) {
        // Network error / server unreachable
        errorMsg = 'Cannot connect to the server. Please check your internet connection and try again.';
      } else {
        // Server responded with an error
        const serverError = e.response?.data?.detail || e.response?.data?.non_field_errors?.[0] || '';
        if (serverError.toLowerCase().includes('no active account') || serverError.toLowerCase().includes('credentials')) {
          errorMsg = 'The username or password you entered is incorrect. Please try again.';
        } else if (serverError) {
          errorMsg = serverError;
        }
      }
      
      Alert.alert('Login Failed', errorMsg);
    } finally {
      setIsLoggingIn(false);
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
            <View style={styles.logoRow}>
              <View style={styles.logoContainer}>
                <View style={styles.logoIconCircle}>
                  <Ionicons name="pulse" size={28} color="#2d7df6" />
                </View>
                <Text style={styles.logoText}>CardioGo</Text>
              </View>
              <TouchableOpacity style={styles.gearIconBtn} onPress={() => setDjangoModalVisible(true)}>
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.headerTitle}>Welcome Back</Text>
            <Text style={styles.headerSub}>Monitoring your heart health, continuously and intelligently.</Text>
          </LinearGradient>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.fieldLabel}>USERNAME</Text>
              <View style={styles.inputBox}>
                <Ionicons name="person-outline" size={20} color="#3282f6" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter your username"
                  value={username}
                  onChangeText={setUsername}
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

            <TouchableOpacity style={styles.forgotPassLink} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotPassText}>Forgot password?</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.mainActionBtn} 
              onPress={handleLogin} 
              activeOpacity={0.9}
              disabled={isLoggingIn}
            >
              <LinearGradient
                colors={['#4ca0ff', '#2d7df6']}
                style={styles.gradientBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isLoggingIn ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={styles.actionBtnText}>Sign In</Text>
                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerLabel}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialAuthRow}>
              <TouchableOpacity style={styles.socialAuthBtn} onPress={() => handleSocialLogin('google')}>
                {loadingApp === 'google' ? <ActivityIndicator size="small" color="#333" /> : <Ionicons name="logo-google" size={24} color="#EA4335" />}
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialAuthBtn} onPress={() => handleSocialLogin('apple')}>
                {loadingApp === 'apple' ? <ActivityIndicator size="small" color="#333" /> : <Ionicons name="logo-apple" size={24} color="#000" />}
              </TouchableOpacity>
            </View>

            <View style={styles.authFooter}>
              <Text style={styles.authFooterText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.authFooterLink}>Create Account</Text>
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
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
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
  logoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
    letterSpacing: 0.5
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
  forgotPassLink: {
    alignSelf: 'flex-end',
    marginBottom: 30
  },
  forgotPassText: {
    color: '#3282f6',
    fontWeight: '700',
    fontSize: 14
  },
  mainActionBtn: {
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e9ecef'
  },
  dividerLabel: {
    marginHorizontal: 15,
    fontSize: 11,
    fontWeight: '700',
    color: '#adb5bd',
    letterSpacing: 1
  },
  socialAuthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 40
  },
  socialAuthBtn: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  authFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20
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

export default LoginScreen;
