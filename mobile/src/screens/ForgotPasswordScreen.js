import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import api from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted!');
      }
    })();
  }, []);

  const showCodeNotification = async (code) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "🔐 CardioGo Reset Code",
        body: `Your verification code is: ${code}. Do not share this with anyone.`,
        data: { data: 'reset' },
      },
      trigger: null,
    });
  };

  const handleRequestOTP = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('auth/password-reset-request/', { email });

      if (response.data.otp) {
        await showCodeNotification(response.data.otp);
      }

      Alert.alert('Success', 'OTP code sent! Check your notifications (or server console).');
      navigation.navigate('ResetPasswordConfirm', { email });
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Something went wrong. Please try again.';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>

        <LinearGradient colors={['#4ba1ff', '#2d7df6']} style={styles.headerArea}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forgot{'\n'}Password?</Text>
          <Text style={styles.headerSub}>Don't worry! Enter your registered email to receive a reset code.</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#888" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="example@gmail.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#bbb"
            />
          </View>

          <TouchableOpacity onPress={handleRequestOTP} activeOpacity={0.8} style={{ marginTop: 30 }} disabled={loading}>
            <LinearGradient
              colors={['#4ca0ff', '#3282f6']}
              style={styles.primaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.btnText}>Send Reset Code</Text>
                  <Ionicons name="send-outline" size={20} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafd'
  },
  scrollContent: {
    flexGrow: 1
  },
  headerArea: {
    paddingTop: 60,
    paddingHorizontal: 30,
    paddingBottom: 40,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  backBtn: {
    marginBottom: 20
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 38,
    marginBottom: 10
  },
  headerSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 15,
    lineHeight: 22
  },
  formContainer: {
    paddingHorizontal: 30,
    paddingTop: 40
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 8
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e9f2',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    height: '100%'
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 55,
    borderRadius: 15,
    shadowColor: '#3282f6',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10
  }
});

export default ForgotPasswordScreen;
