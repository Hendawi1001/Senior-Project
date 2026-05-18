import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Vibration, Linking, Image } from 'react-native';
import * as Audio from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import api, { EMERGENCY_PHONE } from '../services/api';
import { LanguageContext } from '../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';


const DashboardScreen = ({ navigation }) => {
  const { t } = useContext(LanguageContext);
  const [healthData, setHealthData] = useState(null);
  const [allHistory, setAllHistory] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [entryModalVisible, setEntryModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pulseScore, setPulseScore] = useState(94);
  const [aiInsight, setAiInsight] = useState('Your health is looking great! No major risks detected today.');

  const [formData, setFormData] = useState({
    heart_rate: '80',
    blood_pressure_sys: '120',
    blood_pressure_dia: '80',
    sp02: '98',
    temperature: '36.6'
  });

  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
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
      console.log("Failed to load dashboard avatar", e);
    }
  };

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  useEffect(() => {
    fetchHealthData();
  }, []);

  const fetchHealthData = async () => {
    try {
      const response = await api.get('health/data/');
      setAllHistory(response.data);
      if (response.data.length > 0) {
        setHealthData(response.data[0]);
        calculateAnalytics(response.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const calculateAnalytics = (data) => {
    if (data.length === 0) return;

    let score = 100;
    const recent = data.slice(0, 10);

    recent.forEach(item => {
      if (item.status === 'critical') score -= 12;
      if (item.status === 'warning') score -= 5;
    });

    const avgHr = recent.reduce((sum, item) => sum + item.heart_rate, 0) / recent.length;
    if (avgHr > 100 || avgHr < 60) score -= 10;

    const finalScore = Math.max(0, Math.min(100, score));
    setPulseScore(finalScore);

    let insight = "Your vital trends are stable. Keep following your daily routine.";
    if (finalScore < 60) {
      insight = "Attention: Multiple high-risk events detected recently. Consult your doctor.";
    } else if (finalScore < 85) {
      insight = "Slight instability in your heart rate. Try to rest and stay hydrated.";
    } else if (avgHr > 110) {
      insight = "High resting heart rate detected. Avoid caffeine and intense exercise.";
    }
    setAiInsight(insight);
  };

  const handleManualEntry = async () => {
    setIsSubmitting(true);
    try {
      const hr = parseInt(formData.heart_rate);
      const spo2 = parseInt(formData.sp02);
      let status = 'normal';
      
      // Heart rate threshold mapping requested by the user:
      // 60 to 75 is warning, below 60 is critical risk alarm
      if (hr >= 60 && hr <= 75) {
        status = 'warning';
      } else if (hr < 60) {
        status = 'critical';
      }

      // Keep standard high heart rate limits
      if (hr > 100 && hr <= 120) {
        if (status === 'normal') status = 'warning';
      } else if (hr > 120) {
        status = 'critical';
      }

      // Keep standard oxygen saturation limits
      if (spo2 < 95 && spo2 >= 90) {
        if (status === 'normal') status = 'warning';
      } else if (spo2 < 90) {
        status = 'critical';
      }

      if (status !== 'normal') {
        if (status === 'critical') {
          const pattern = [500, 500, 500, 500];
          Vibration.vibrate(pattern, true); // true = LOOP
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }

        let alertTitle = "Health Warning";
        let alertMsg = `Your heart rate (${hr} bpm) is in the warning range (60-75 bpm). Please take it easy and monitor how you feel.`;

        if (status === 'critical') {
          alertTitle = "🚨 CRITICAL RISK DETECTED!";
          alertMsg = hr < 60 
            ? `WARNING: Your heart rate (${hr} bpm) is dangerously below 60 bpm! You are in a high-risk zone. Alarm is active!`
            : `WARNING: Your vitals are outside the healthy range! Alarm is active!`;
        }

        Alert.alert(
          alertTitle,
          alertMsg,
          [{
            text: "I Understand",
            style: "destructive",
            onPress: () => {
              Vibration.cancel();
            }
          }],
          { cancelable: false }
        );

        // Send push notification logic removed
      }

      await api.post('health/data/', {
        ...formData,
        heart_rate: parseInt(formData.heart_rate),
        blood_pressure_sys: parseInt(formData.blood_pressure_sys),
        blood_pressure_dia: parseInt(formData.blood_pressure_dia),
        sp02: parseInt(formData.sp02),
        temperature: parseFloat(formData.temperature),
        status: status
      });

      Alert.alert("Success", "Health record saved!");
      setEntryModalVisible(false);
      fetchHealthData();
    } catch (e) {
      Alert.alert("Error", "Could not save record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const riskHistory = allHistory.filter(item => item.status !== 'normal');

  return (
    <View style={styles.container}>
      {/* Small Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.headerAvatarWrap}>
            {profilePic ? (
              <Image source={{ uri: profilePic }} style={styles.headerAvatarImage} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Ionicons name="person" size={16} color="#3282f6" />
              </View>
            )}
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>{t('dashboard')}</Text>
            <Text style={styles.headerSub}>{t('health_overview')}</Text>
          </View>
        </View>
        <LinearGradient colors={['#e6f0ff', '#e6f0ff']} style={styles.dateBadge}>
          <Text style={styles.dateText}>{dateStr}</Text>
        </LinearGradient>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchHealthData} />}
      >
        {/* Risk Level Banner */}
        <LinearGradient
          colors={
            (!healthData || healthData.status === 'normal')
              ? ['#28c76f', '#1cd343'] // Vibrant medical green
              : healthData.status === 'warning'
              ? ['#ff9f43', '#ff8411'] // Warning orange
              : ['#ea5455', '#ff3739'] // Emergency red
          }
          style={styles.riskBanner}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.riskRow}>
            <View style={styles.riskIconCircle}>
              <Ionicons 
                name={
                  (!healthData || healthData.status === 'normal')
                    ? "checkmark-circle"
                    : healthData.status === 'warning'
                    ? "warning"
                    : "alert-circle"
                } 
                size={24} 
                color={
                  (!healthData || healthData.status === 'normal')
                    ? "#28c76f"
                    : healthData.status === 'warning'
                    ? "#ff9f43"
                    : "#ea5455"
                } 
              />
            </View>
            <View style={styles.riskInfo}>
              <Text style={styles.riskLabel}>{t('risk_level')}</Text>
              <Text style={styles.riskTitle}>
                {(!healthData || healthData.status === 'normal') 
                  ? t('status_normal') 
                  : healthData.status === 'warning' 
                  ? t('status_warning') 
                  : t('status_critical')} ✓
              </Text>
              <Text style={styles.riskDesc}>
                {(!healthData || healthData.status === 'normal') 
                  ? 'All vitals within healthy range' 
                  : healthData.status === 'warning' 
                  ? 'Warning: Low or high vitals detected' 
                  : '🚨 High Risk: Emergency call recommended!'}
              </Text>
            </View>
            <View style={styles.riskValueBox}>
              <Text style={styles.riskValueBig}>{healthData ? healthData.heart_rate : '86'}</Text>
              <Text style={styles.riskValueSmall}>{t('bpm_now')}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Vitals Grid starts right below banner */}

        {/* 2x2 Vitals Grid */}
        <View style={styles.gridRow}>
          {/* Heart Rate */}
          <View style={styles.gridCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: '#ffebeb' }]}>
                <Ionicons name="heart" size={20} color="#ff4b4b" />
              </View>
              <View style={[styles.trendBadge, { backgroundColor: '#e5f8ed' }]}>
                <Text style={[styles.trendText, { color: '#28c46c' }]}>+2%</Text>
              </View>
            </View>
            <Text style={styles.cardValue}>{healthData ? healthData.heart_rate : '86'} <Text style={styles.cardUnit}>{t('bpm')}</Text></Text>
            <Text style={styles.cardLabel}>{t('heart_history')}</Text>
          </View>

          {/* Blood Pressure */}
          <View style={styles.gridCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: '#e6f0ff' }]}>
                <Ionicons name="water" size={20} color="#3282f6" />
              </View>
              <View style={[styles.trendBadge, { backgroundColor: '#fff0f0' }]}>
                <Text style={[styles.trendText, { color: '#ff4b4b' }]}>-1%</Text>
              </View>
            </View>
            <Text style={styles.cardValue}>{healthData ? `${healthData.blood_pressure_sys}/${healthData.blood_pressure_dia}` : '120/80'}</Text>
            <Text style={styles.cardLabel}>Blood Pressure</Text>
          </View>
        </View>

        <View style={styles.gridRow}>
          {/* SpO2 */}
          <View style={styles.gridCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: '#ebfbee' }]}>
                <Ionicons name="leaf" size={20} color="#28c46c" />
              </View>
              <View style={[styles.trendBadge, { backgroundColor: '#e5f8ed' }]}>
                <Text style={[styles.trendText, { color: '#28c46c' }]}>+5%</Text>
              </View>
            </View>
            <Text style={styles.cardValue}>{healthData ? healthData.sp02 : '98'} <Text style={styles.cardUnit}>%</Text></Text>
            <Text style={styles.cardLabel}>SpO2</Text>
          </View>

          {/* Temp */}
          <View style={styles.gridCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: '#fef3c7' }]}>
                <Ionicons name="thermometer" size={20} color="#d97706" />
              </View>
              <View style={[styles.trendBadge, { backgroundColor: '#e5f8ed' }]}>
                <Text style={[styles.trendText, { color: '#28c46c' }]}>Norm</Text>
              </View>
            </View>
            <Text style={styles.cardValue}>{healthData ? healthData.temperature : '36.6'} <Text style={styles.cardUnit}>°C</Text></Text>
            <Text style={styles.cardLabel}>Temp</Text>
          </View>
        </View>

        {/* Smart AI Analytics Section */}
        <View style={styles.analyticsTitleCard}>
          <Ionicons name="analytics" size={20} color="#3282f6" />
          <Text style={styles.analyticsTitleText}>Smart Health Analytics</Text>
        </View>

        <LinearGradient
          colors={['#fff', '#f8fbff']}
          style={styles.analyticsCard}
        >
          <View style={styles.scoreRow}>
            <View style={styles.scoreLeft}>
              <Text style={styles.scoreSubTitle}>{t('pulse_score')}</Text>
              <Text style={[styles.scoreValueBig, { color: pulseScore > 80 ? '#28c46c' : (pulseScore > 50 ? '#f59f00' : '#ff4b4b') }]}>
                {pulseScore}
              </Text>
              <Text style={styles.scoreOutOf}>/100 points</Text>
            </View>
            <View style={styles.scoreRight}>
              <View style={[styles.pulseCircle, { borderColor: pulseScore > 80 ? '#e5f8ed' : (pulseScore > 50 ? '#fff9db' : '#ffebeb') }]}>
                <Ionicons name="shield-checkmark" size={32} color={pulseScore > 80 ? '#28c46c' : (pulseScore > 50 ? '#f59f00' : '#ff4b4b')} />
              </View>
            </View>
          </View>

          <View style={styles.insightBox}>
            <View style={styles.insightHeader}>
              <Ionicons name="sparkles" size={16} color="#3282f6" />
              <Text style={styles.insightHeaderText}>AI INSIGHT</Text>
            </View>
            <Text style={styles.insightText}>{aiInsight}</Text>
          </View>
        </LinearGradient>

        {/* Emergency Call Doctor Card (Replacing Weekly Trend Chart mockup) */}
        <TouchableOpacity 
          style={styles.chartCard} 
          onPress={() => {
            Alert.alert(
              "Call Doctor",
              "Are you sure you want to place a real phone call to your doctor?",
              [
                { text: "Cancel", style: "cancel" },
                { 
                  text: "Call Now", 
                  style: "destructive",
                  onPress: () => {
                    Linking.openURL(EMERGENCY_PHONE).catch(() => {
                      Alert.alert("Error", "Direct calling is not supported on this device's simulator.");
                    });
                  }
                }
              ]
            );
          }}
          activeOpacity={0.95}
        >
          <LinearGradient
            colors={['#ff4d4d', '#cc0000']}
            style={styles.emergencyCardGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.emergencyCardRow}>
              <View style={styles.emergencyCardIconCircle}>
                <Ionicons name="call" size={28} color="#ff4b4b" />
              </View>
              <View style={styles.emergencyCardInfo}>
                <Text style={styles.emergencyCardTitle}>EMERGENCY HOTLINE</Text>
                <Text style={styles.emergencyCardDesc}>Call your doctor immediately for urgent care</Text>
              </View>
              <Ionicons name="chevron-forward-circle" size={32} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Bottom Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => setEntryModalVisible(true)}>
            <View style={[styles.iconWrap, { backgroundColor: '#fff7e6' }]}>
              <Ionicons name="document-text" size={24} color="#ffa94d" />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Fill Records</Text>
              <Text style={styles.actionSub}>Update info</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => setHistoryModalVisible(true)}>
            <View style={[styles.iconWrap, { backgroundColor: '#ebfbee' }]}>
              <Ionicons name="time" size={24} color="#40c057" />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>History</Text>
              <Text style={styles.actionSub}>All data</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* History Modal */}
        <Modal visible={historyModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.historyBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Risk History</Text>
                <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                  <Ionicons name="close-circle" size={28} color="#ccc" />
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                {riskHistory.length > 0 ? riskHistory.map((item, idx) => (
                  <View key={idx} style={styles.historyItem}>
                    <View style={[styles.historyIcon, { backgroundColor: item.status === 'critical' ? '#ffebeb' : '#fff9db' }]}>
                      <Ionicons name="warning" size={20} color={item.status === 'critical' ? '#ff4b4b' : '#f59f00'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTitleText}>{item.status.toUpperCase()} ALERT</Text>
                      <Text style={styles.historySubText}>{new Date(item.timestamp).toLocaleString()}</Text>
                      <Text style={styles.historyDetail}>Heat Rate: {item.heart_rate} bpm | SpO2: {item.sp02}%</Text>
                    </View>
                  </View>
                )) : (
                  <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Ionicons name="shield-checkmark" size={60} color="#e5f8ed" />
                    <Text style={{ color: '#888', marginTop: 10 }}>No high risk records found.</Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Data Entry Modal */}
        <Modal visible={entryModalVisible} animationType="slide" transparent={true}>
          <View style={styles.modalOverlay}>
            <View style={styles.entryBox}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Health Record</Text>
                <TouchableOpacity onPress={() => setEntryModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView>
                <View style={styles.formItem}>
                  <Text style={styles.inputLabel}>Heart Rate (bpm)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.heart_rate}
                    onChangeText={t => setFormData({ ...formData, heart_rate: t })}
                  />
                </View>
                <View style={styles.formRow}>
                  <View style={[styles.formItem, { width: '48%' }]}>
                    <Text style={styles.inputLabel}>BP Systolic</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={formData.blood_pressure_sys}
                      onChangeText={t => setFormData({ ...formData, blood_pressure_sys: t })}
                    />
                  </View>
                  <View style={[styles.formItem, { width: '48%' }]}>
                    <Text style={styles.inputLabel}>BP Diastolic</Text>
                    <TextInput
                      style={styles.input}
                      keyboardType="numeric"
                      value={formData.blood_pressure_dia}
                      onChangeText={t => setFormData({ ...formData, blood_pressure_dia: t })}
                    />
                  </View>
                </View>
                <View style={styles.formItem}>
                  <Text style={styles.inputLabel}>SpO2 (%)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.sp02}
                    onChangeText={t => setFormData({ ...formData, sp02: t })}
                  />
                </View>
                <View style={styles.formItem}>
                  <Text style={styles.inputLabel}>Temperature (°C)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={formData.temperature}
                    onChangeText={t => setFormData({ ...formData, temperature: t })}
                  />
                </View>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleManualEntry}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Records</Text>}
                </TouchableOpacity>
              </ScrollView>
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
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000'
  },
  dateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15
  },
  dateText: {
    color: '#3282f6',
    fontWeight: 'bold',
    fontSize: 14
  },
  headerSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40
  },
  riskBanner: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#ff4b4b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8
  },
  riskRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  riskIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  riskInfo: {
    flex: 1
  },
  riskLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1
  },
  riskTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 2
  },
  riskDesc: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12
  },
  riskValueBox: {
    alignItems: 'flex-end'
  },
  riskValueBig: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold'
  },
  riskValueSmall: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12
  },
  analyticsTitleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 5
  },
  analyticsTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333'
  },
  analyticsCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eef3f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  scoreLeft: {
    flex: 1
  },
  scoreSubTitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 5,
    fontWeight: '600'
  },
  scoreValueBig: {
    fontSize: 42,
    fontWeight: '900'
  },
  scoreOutOf: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2
  },
  scoreRight: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pulseCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  insightBox: {
    backgroundColor: '#f0f7ff',
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#d0e5ff'
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5
  },
  insightHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#3282f6',
    marginLeft: 5,
    letterSpacing: 1
  },
  insightText: {
    fontSize: 13,
    color: '#444',
    lineHeight: 18
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  gridCard: {
    width: '47.5%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  trendBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  trendText: {
    fontSize: 10,
    fontWeight: 'bold'
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#222',
  },
  cardUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: '#888'
  },
  cardLabel: {
    fontSize: 14,
    color: '#888',
    marginTop: 5
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginTop: 5,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120
  },
  barWrap: {
    alignItems: 'center'
  },
  bar: {
    width: 25,
    borderRadius: 6,
    marginBottom: 10
  },
  barLabel: {
    fontSize: 11,
    color: '#aaa'
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  actionCard: {
    width: '47.5%',
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2
  },
  actionTextWrap: {
    marginLeft: 10
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333'
  },
  actionSub: {
    fontSize: 11,
    color: '#888'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end'
  },
  historyBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: '70%',
    padding: 25
  },
  entryBox: {
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222'
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  historyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  historyTitleText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#666'
  },
  historySubText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 2
  },
  historyDetail: {
    fontSize: 12,
    color: '#888'
  },
  formItem: {
    marginBottom: 15
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    fontSize: 16
  },
  saveBtn: {
    backgroundColor: '#3282f6',
    paddingVertical: 18,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#3282f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  emergencyBar: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#ff4d4d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  emergencyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  emergencyIcon: {
    marginRight: 8,
  },
  emergencyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  emergencyCardGradient: {
    padding: 20,
    borderRadius: 16,
  },
  emergencyCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emergencyCardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  emergencyCardInfo: {
    flex: 1,
  },
  emergencyCardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  emergencyCardDesc: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    fontWeight: '500',
  },
  headerAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  headerAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e6f0ff',
  }
});

export default DashboardScreen;
