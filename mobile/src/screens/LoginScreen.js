import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
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
      let errorMsg = e.response?.data?.detail || e.response?.data?.non_field_errors?.[0] || 'Invalid credentials or server error.';
      
      // If the username or password doesn't exist or is wrong, show a clean standard error
      if (errorMsg.toLowerCase().includes('no active account') || errorMsg.toLowerCase().includes('credentials')) {
        errorMsg = 'Invalid username or password';
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
            <View style={styles.logoContainer}>
              <View style={styles.logoIconCircle}>
                <Ionicons name="pulse" size={28} color="#2d7df6" />
              </View>
              <Text style={styles.logoText}>CardioGo</Text>
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
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="#adb5bd"
                />
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
    marginBottom: 30
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
