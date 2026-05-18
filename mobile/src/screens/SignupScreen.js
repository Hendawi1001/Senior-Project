import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const SignupScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [isSigningUp, setIsSigningUp] = useState(false);
  const { register } = useContext(AuthContext);

  const handleSignup = async () => {
    try {
      if (!username || !password) {
        Alert.alert('Error', 'Username and password are required');
        return;
      }
      
      let finalGender = gender ? gender.toUpperCase().trim().charAt(0) : '';
      if (!['M', 'F', 'O', ''].includes(finalGender)) {
        Alert.alert('Error', 'Gender must be M, F, or O');
        return; 
      }

      setIsSigningUp(true);
      await register({ username, email, password, age: parseInt(age) || null, gender: finalGender });
    } catch (e) {
      if (e.response && e.response.data) {
        let errorData = e.response.data;
        let errorMsg = '';
        if (typeof errorData === 'object') {
           errorMsg = Object.keys(errorData).map(key => `${key}: ${errorData[key]}`).join('\n');
        } else {
           errorMsg = JSON.stringify(errorData);
        }
        Alert.alert('Registration Failed', errorMsg);
      } else {
        Alert.alert('Registration Failed', 'Check your information and try again.');
      }
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
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
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
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="#adb5bd"
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 0.45 }]}>
                <Text style={styles.fieldLabel}>AGE</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="25"
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"
                    placeholderTextColor="#adb5bd"
                  />
                </View>
              </View>
              <View style={[styles.inputGroup, { flex: 0.45 }]}>
                <Text style={styles.fieldLabel}>GENDER</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="M/F/O"
                    value={gender}
                    onChangeText={setGender}
                    placeholderTextColor="#adb5bd"
                  />
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
    marginBottom: 20
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
