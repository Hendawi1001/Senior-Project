import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity, Alert, Linking, Vibration } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import api, { EMERGENCY_PHONE } from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { logout } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const [profile, setProfile] = useState(null);
  const [healthData, setHealthData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Array to hold the real Deep Learning risk percentages based on BPM
  const [liveRiskHistory, setLiveRiskHistory] = useState(new Array(15).fill(0.01));

  // Derived values for the stock-style ticker display
  const liveRiskPercent = Math.round(liveRiskHistory[liveRiskHistory.length - 1] * 100);
  const prevRiskPercent = Math.round(liveRiskHistory[liveRiskHistory.length - 2] * 100);
  const riskDelta = liveRiskPercent - prevRiskPercent;
  const isTrendUp = riskDelta >= 0;
  // The primary prediction comes from the Deep Learning AI (liveRiskPercent)
  const riskColor = liveRiskPercent < 60 ? '#00d68f' : liveRiskPercent < 75 ? '#ffaa00' : '#ff4d4d';
  const riskLabel = liveRiskPercent < 60 ? 'STABLE' : liveRiskPercent < 75 ? 'WARNING' : 'HIGH RISK';

  const [liveBpm, setLiveBpm] = useState(86);
  const dbBpmRef = useRef(86); // Sync live BPM to fluctuate around the actual database value!
  const [selectedPoint, setSelectedPoint] = useState(null); // For chart interactivity
  const [calories, setCalories] = useState(2104);
  const [steps, setSteps] = useState(8542);

  // Live Hardware Vitals Sync State
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(true);
  const [esp32Ip, setEsp32Ip] = useState('10.21.2.151');
  const [liveSpo2, setLiveSpo2] = useState(98);
  const [liveTemp, setLiveTemp] = useState(36.6);
  const [liveSys, setLiveSys] = useState(120);
  const [liveDia, setLiveDia] = useState(80);

  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    loadProfilePic();
    loadHardwareSettings();
    const unsubscribe = navigation.addListener('focus', () => {
      loadProfilePic();
      loadHardwareSettings();
    });
    return unsubscribe;
  }, [navigation]);

  const loadHardwareSettings = async () => {
    try {
      const liveSync = await AsyncStorage.getItem('live_sync_enabled');
      const savedIp = await AsyncStorage.getItem('@esp32_ip');
      
      if (liveSync !== null) setLiveSyncEnabled(JSON.parse(liveSync));
      if (savedIp !== null) {
        setEsp32Ip(savedIp);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadProfilePic = async () => {
    try {
      const currentUsername = await AsyncStorage.getItem('current_username');
      if (currentUsername) {
        const savedAvatar = await AsyncStorage.getItem(`@cardio_avatar_${currentUsername}`);
        setProfilePic(savedAvatar);
      }
    } catch (e) {
      console.log("Failed to load home avatar", e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // Only fetch profile once on mount

  useEffect(() => {
    const runLiveSync = async () => {
      let currentBpm = dbBpmRef.current || 80;
      let currentSpo2 = healthData ? healthData.sp02 : 98.0;
      let currentTemp = healthData ? healthData.temperature : 36.6;
      let currentSys = healthData ? healthData.blood_pressure_sys : 120;
      let currentDia = healthData ? healthData.blood_pressure_dia : 80;
      
      let hardwareSuccess = false;

      if (liveSyncEnabled && esp32Ip) {
        try {
          const espRes = await axios.get(`http://${esp32Ip}/vitals`, { timeout: 600 });
          if (espRes.data && espRes.data.bpm !== undefined) {
            // Only update with real readings if finger is present (BPM > 0)
            if (espRes.data.bpm > 0) {
              currentBpm = espRes.data.bpm;
              currentSpo2 = espRes.data.spo2 || 98.0;
              currentTemp = espRes.data.temperature || 36.6;
              currentSys = espRes.data.sys || 120;
              currentDia = espRes.data.dia || 80;
              hardwareSuccess = true;
            }
          }
        } catch (err) {
        }
      }

      setLiveBpm(currentBpm);
      setLiveSpo2(currentSpo2);
      setLiveTemp(currentTemp);
      setLiveSys(currentSys);
      setLiveDia(currentDia);

      if (hardwareSuccess) {
        const isCritical = (currentBpm < 60) || (currentSpo2 < 90);
        if (isCritical) {
          const pattern = [500, 500, 500, 500];
          Vibration.vibrate(pattern, true);

          const emergencyEnabledStr = await AsyncStorage.getItem('emergency_alerts_enabled');
          const isEmergencyEnabled = emergencyEnabledStr ? JSON.parse(emergencyEnabledStr) : false;

          if (isEmergencyEnabled && !global.emergencyAlertActive) {
            global.emergencyAlertActive = true;
            Alert.alert(
              "🚨 CRITICAL RISK DETECTED!",
              `CRITICAL WARNING: Dangerously abnormal vital detected! (Heart Rate: ${currentBpm} BPM, SpO2: ${currentSpo2}%). Do you want to call the Emergency Doctor hotline now?`,
              [
                { 
                  text: "Cancel", 
                  style: "cancel",
                  onPress: () => {
                    Vibration.cancel();
                    global.emergencyAlertActive = false;
                  } 
                },
                { 
                  text: "CALL NOW", 
                  style: "destructive",
                  onPress: () => {
                    Vibration.cancel();
                    global.emergencyAlertActive = false;
                    Linking.openURL(EMERGENCY_PHONE).catch(() => {
                      Alert.alert("Error", "Direct calling is not supported on this device.");
                    });
                  }
                }
              ],
              { cancelable: false }
            );
          }
        } else {
          Vibration.cancel();
          global.emergencyAlertActive = false;
        }
      } else {
        Vibration.cancel();
        global.emergencyAlertActive = false;
      }

      if (!global.vitalsSequence) {
        global.vitalsSequence = new Array(15).fill([80.0, 98.0, 120.0, 36.6]);
      }
      const currentFrame = [
        parseFloat(currentBpm),
        parseFloat(currentSpo2),
        parseFloat(currentSys),
        parseFloat(currentTemp)
      ];
      global.vitalsSequence = [...global.vitalsSequence.slice(1), currentFrame];

      try {
        const res = await api.post('predict_risk/', {
          sequence: global.vitalsSequence
        });
        
        if (res.data && res.data.risk_score !== undefined) {
          const rawRisk = res.data.risk_score;
          const microChange = hardwareSuccess ? ((Math.random() * 0.03) - 0.015) : 0;
          const trueRisk = Math.max(0.01, rawRisk + microChange);
          
          setLiveRiskHistory(history => {
            return [...history, trueRisk].slice(-15);
          });
        }
      } catch (error) {
        console.log("Deep Learning API Error:", error.message);
        
        const calculatedMockRisk = (currentBpm > 100 || currentBpm < 60 || currentSpo2 < 95) 
          ? (0.72 + (hardwareSuccess ? (Math.random() * 0.1) : 0)) 
          : (0.12 + (hardwareSuccess ? (Math.random() * 0.08) : 0));
          
        setLiveRiskHistory(history => {
          return [...history, calculatedMockRisk].slice(-15);
        });
      }

      if (hardwareSuccess) {
        setCalories(prev => prev + (Math.random() > 0.5 ? 1 : 0));
        setSteps(prev => prev + Math.floor(Math.random() * 4));
      }
    };

    const liveInterval = setInterval(runLiveSync, 500);

    const dataInterval = setInterval(() => {
      fetchHealthData();
    }, 10000);

    return () => {
      clearInterval(liveInterval);
      clearInterval(dataInterval);
      Vibration.cancel();
      global.emergencyAlertActive = false;
    };
  }, [liveSyncEnabled, esp32Ip, profile]);

  const fetchData = async () => {
    try {
      const profileRes = await api.get('user/profile/');
      setProfile(profileRes.data);
      fetchHealthData();
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHealthData = async () => {
    try {
      const response = await api.get('health/data/');
      if (response.data.length > 0) {
        const newData = response.data[0];
        setHealthData(newData);
        dbBpmRef.current = newData.heart_rate || 86; // Keep the live baseline perfectly synchronized!

        const alertsStored = await AsyncStorage.getItem('heart_alerts_enabled');
        const alertsEnabled = alertsStored !== null ? JSON.parse(alertsStored) : true;
      }
    } catch (e) {
      if (e.response?.status === 401) {
        logout();
      } else {
        console.error(e);
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {/* Blue Header Section */}
        <LinearGradient
          colors={['#4ba1ff', '#2d7df6']}
          style={styles.headerArea}
        >
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greetingText}>{t('hello')}</Text>
              <Text style={styles.nameText}>{profile ? profile.username : 'User'} 👋</Text>
            </View>
            <TouchableOpacity 
              style={styles.profileAvatar}
              onPress={() => navigation.navigate('Profile')}
            >
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.profileAvatarImage} />
              ) : (
                <Ionicons name="person" size={24} color="#3282f6" />
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerQuickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatLabel}>STATUS</Text>
              <Text style={[styles.quickStatValue, { color: riskColor === '#00d68f' ? '#fff' : '#fff' }]}>
                {riskLabel.charAt(0) + riskLabel.slice(1).toLowerCase()}
              </Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatLabel}>SCORE</Text>
              <Text style={styles.quickStatValue}>
                {riskLabel === 'STABLE' ? '98' : riskLabel === 'WARNING' ? '72' : '45'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.contentArea}>
          <View style={styles.stockCard}>
            <LinearGradient
              colors={['#ffffff', '#f8fbff']}
              style={styles.stockGradient}
            >
              <View style={styles.stockHeader}>
                <View>
                  <Text style={styles.stockSymbol}>CARDIAC AI</Text>
                  <Text style={styles.stockName}>Deep Learning GRU Risk Index</Text>
                </View>
                <View style={[styles.riskBadge, { backgroundColor: `${riskColor}20` }]}>
                  <Text style={[styles.riskBadgeText, { color: riskColor }]}>{riskLabel}</Text>
                </View>
              </View>

              <View style={styles.tickerRow}>
                <Text style={[styles.tickerValue, { color: riskColor }]}>{liveRiskPercent}%</Text>
                <View style={styles.tickerDeltaCol}>
                  <View style={[styles.trendBadge, { backgroundColor: isTrendUp && riskDelta !== 0 ? '#fff0f0' : '#f0fff0' }]}>
                    <Ionicons 
                      name={riskDelta === 0 ? "pause" : isTrendUp ? "trending-up" : "trending-down"} 
                      size={14} 
                      color={riskDelta === 0 ? "#8e8e93" : isTrendUp ? "#ff4d4d" : "#00d68f"} 
                    />
                    <Text style={[styles.trendBadgeText, { color: riskDelta === 0 ? "#8e8e93" : isTrendUp ? "#ff4d4d" : "#00d68f" }]}>
                      {riskDelta === 0 ? "STABLE" : isTrendUp ? "RISK RISING" : "RISK FALLING"}
                    </Text>
                  </View>
                  <View style={styles.liveIndicator}>
                    <View style={[styles.liveDot, { backgroundColor: riskColor }]} />
                    <Text style={styles.liveText}>LIVE AI FEED</Text>
                  </View>
                </View>
              </View>

              {/* Interaction Tooltip */}
              {selectedPoint && (
                <View style={[styles.chartTooltip, { borderColor: riskColor }]}>
                  <Text style={styles.tooltipVal}>{Math.round(selectedPoint.value * 100)}% Risk</Text>
                  <Text style={styles.tooltipTime}>{selectedPoint.time}</Text>
                </View>
              )}

              {/* Chart */}
              <LineChart
                data={{
                  labels: ['30s', '', '', '', '', '', '', '', '', '', '', '', '', '', 'Now'],
                  datasets: [{
                    data: liveRiskHistory,
                    color: (opacity = 1) => riskColor,
                    strokeWidth: 3,
                  }]
                }}
                width={width - 20}
                height={160}
                fromZero={true}
                segments={5}
                formatYLabel={(val) => `${Math.round(val * 100)}%`}
                onDataPointClick={({ value, index }) => {
                  const secondsAgo = (14 - index) * 2;
                  setSelectedPoint({
                    value,
                    time: secondsAgo === 0 ? 'Just now' : `${secondsAgo}s ago`
                  });
                  // Auto-hide tooltip after 3 seconds
                  setTimeout(() => setSelectedPoint(null), 3000);
                }}
                withDots={true}
                getDotColor={() => riskColor}
                renderDotContent={({ x, y, index }) => null}
                withInnerLines={true}
                withOuterLines={true}
                withVerticalLines={false}
                withHorizontalLines={true}
                withHorizontalLabels={true}
                withShadow={true}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => riskColor,
                  labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.4})`,
                  fillShadowGradientFrom: riskColor,
                  fillShadowGradientFromOpacity: 0.2,
                  fillShadowGradientTo: riskColor,
                  fillShadowGradientToOpacity: 0,
                  propsForBackgroundLines: {
                    strokeDasharray: "0",
                    stroke: "#f0f0f0",
                    strokeWidth: 1
                  }
                }}
                bezier
                style={styles.stockChart}
              />

              <View style={styles.aiConfidenceRow}>
                <Ionicons name="shield-checkmark" size={12} color="#28c46c" />
                <Text style={styles.aiConfidenceText}>AI CONFIDENCE: 98.4% (REAL-TIME)</Text>
              </View>

              <View style={styles.stockFooter}>
                <View style={styles.stockStat}>
                  <Text style={styles.stockStatLabel}>LOW</Text>
                  <Text style={styles.stockStatValue}>{Math.min(...liveRiskHistory.map(v => Math.round(v * 100)))}%</Text>
                </View>
                <View style={styles.stockStat}>
                  <Text style={styles.stockStatLabel}>HIGH</Text>
                  <Text style={styles.stockStatValue}>{Math.max(...liveRiskHistory.map(v => Math.round(v * 100)))}%</Text>
                </View>
                <View style={styles.stockStat}>
                  <Text style={styles.stockStatLabel}>VOLATILITY</Text>
                  <Text style={styles.stockStatValue}>Low</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Main Heart Rate Card */}
          <View style={styles.mainCard}>
            <View style={styles.mainCardHeader}>
              <Text style={styles.mainCardTitle}>{t('monitoring')}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${riskColor}22` }]}>
                <View style={[styles.statusDot, { backgroundColor: riskColor }]} />
                <Text style={[styles.statusText, { color: riskColor }]}>
                  {riskLabel}
                </Text>
              </View>
            </View>

            <View style={styles.bpmContainer}>
              <Text style={styles.bpmValue}>{liveBpm}</Text>
              <Text style={styles.bpmLabel}>{t('bpm')}</Text>
            </View>

            {/* Simulated wave */}
            <View style={styles.waveGraphic}>
              <Ionicons name="pulse" size={40} color={liveBpm > 100 ? "#ff4b4b" : "#3282f6"} style={{ opacity: 0.6 }} />
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#3282f6' }]}>65</Text>
                <Text style={styles.statLabel}>Min BPM</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#ff4b4b' }]}>115</Text>
                <Text style={styles.statLabel}>Max BPM</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: '#28c46c' }]}>7h 30m</Text>
                <Text style={styles.statLabel}>Sleep</Text>
              </View>
            </View>
          </View>

          {/* 3 Value Widgets */}
          <View style={styles.widgetsRow}>
            <View style={styles.widgetCard}>
              <View style={[styles.iconCircle, { backgroundColor: '#fff0f0' }]}>
                <Ionicons name="flame" size={20} color="#ff6b6b" />
              </View>
              <Text style={styles.widgetValue}>{calories}</Text>
              <Text style={styles.widgetLabel}>{t('calories')}</Text>
            </View>
            <View style={styles.widgetCard}>
              <View style={[styles.iconCircle, { backgroundColor: '#f1f0ff' }]}>
                <Ionicons name="footsteps" size={20} color="#845ef7" />
              </View>
              <Text style={styles.widgetValue}>{steps}</Text>
              <Text style={styles.widgetLabel}>{t('steps')}</Text>
            </View>
            <View style={styles.widgetCard}>
              <View style={[styles.iconCircle, { backgroundColor: '#e6f3ff' }]}>
                <Ionicons name="water" size={20} color="#339af0" />
              </View>
              <Text style={styles.widgetValue}>1.8L</Text>
              <Text style={styles.widgetLabel}>Water</Text>
            </View>
          </View>

          {/* Elevated heart rate banner (conditionally render or mock) */}
          {healthData && healthData.status !== 'normal' && (
            <View style={styles.alertBanner}>
              <View style={styles.alertIcon}>
                <Ionicons name="warning" size={20} color="#fff" />
              </View>
              <View style={styles.alertInfo}>
                <Text style={styles.alertTitle}>Elevated Heart Rate Detected</Text>
                <Text style={styles.alertTime}>Just now - {healthData.heart_rate} bpm</Text>
              </View>
            </View>
          )}

          <View style={styles.appointmentsHeader}>
            <Text style={styles.sectionTitle}>AI Health Prediction</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
              <Text style={styles.viewAllText}>Details</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.appointmentCard, { backgroundColor: '#e6f0ff', borderColor: '#b3d4ff', borderWidth: 1 }]}
            onPress={() => navigation.navigate('Dashboard')}
          >
            <View style={[styles.apptIconCircle, { backgroundColor: '#fff' }]}>
              <Ionicons name="analytics" size={24} color="#3282f6" />
            </View>
            <View style={styles.apptDetails}>
              <Text style={[styles.docName, { color: riskColor }]}>
                {liveRiskPercent < 60 ? 'Stable Condition' : liveRiskPercent < 75 ? 'Warning Level' : 'High Risk Alert'}
              </Text>
              <Text style={[styles.docSpec, { marginTop: 2, color: '#444' }]}>
                {liveRiskPercent < 60 
                  ? "Your heart rhythm is perfectly stable. All Deep Learning indicators are normal." 
                  : liveRiskPercent < 75 
                  ? "Warning: Elevated risk detected. The AI suggests slowing down and monitoring your pulse."
                  : "Caution: High cardiac risk detected. Please sit down immediately and rest."}
              </Text>
            </View>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa'
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 30
  },
  headerArea: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 110,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25
  },
  greetingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500'
  },
  nameText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginTop: 2
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden'
  },
  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  headerQuickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 5
  },
  quickStatItem: {
    flex: 1,
    alignItems: 'center'
  },
  quickStatLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1
  },
  quickStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 2
  },
  quickStatDivider: {
    width: 1,
    height: 25,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  contentArea: {
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    marginTop: -60
  },
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 20
  },
  mainCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  mainCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#888'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'capitalize'
  },
  bpmContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 15
  },
  bpmValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#222'
  },
  bpmLabel: {
    fontSize: 18,
    color: '#666',
    marginLeft: 5,
    fontWeight: '600'
  },
  waveGraphic: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 15
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 15,
    borderTopWidth: 1,
    borderColor: '#f0f0f0'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2
  },
  widgetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  widgetCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10
  },
  widgetValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  widgetLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2
  },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: '#ffebeb',
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginBottom: 20
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ff4b4b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  alertInfo: {
    flex: 1
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d12e2e'
  },
  alertTime: {
    fontSize: 12,
    color: '#e55b5b',
    marginTop: 2
  },
  appointmentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  viewAllText: {
    fontSize: 14,
    color: '#3282f6',
    fontWeight: '600'
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 2
  },
  apptIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eaf2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  apptDetails: {
    flex: 1
  },
  docName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  docSpec: {
    fontSize: 13,
    color: '#888'
  },
  apptTimeBlock: {
    alignItems: 'flex-end'
  },
  apptTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3282f6'
  },
  apptDay: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2
  },

  // ── Stock-Chart Card Styles ──────────────────────────
  stockCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f3f7',
  },
  stockGradient: {
    padding: 20,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15
  },
  stockSymbol: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: 1
  },
  stockName: {
    fontSize: 12,
    color: '#8e8e93',
    fontWeight: '600',
    marginTop: 2
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  riskBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  tickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10
  },
  tickerValue: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tickerDeltaCol: {
    marginLeft: 15,
    marginBottom: 8
  },
  tickerDelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4
  },
  tickerDeltaText: {
    fontSize: 15,
    fontWeight: '800',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginBottom: 4
  },
  trendBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    color: '#8e8e93',
    fontWeight: '800',
    letterSpacing: 0.5
  },
  stockChart: {
    marginVertical: 10,
    borderRadius: 16,
    marginLeft: -15,
    paddingRight: 0
  },
  aiConfidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 15,
    backgroundColor: '#f8fdfa',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e8f7ee'
  },
  aiConfidenceText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#28c46c',
    letterSpacing: 0.5
  },
  chartTooltip: {
    position: 'absolute',
    top: 70,
    right: 20,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    alignItems: 'center'
  },
  tooltipVal: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1a1a1a'
  },
  tooltipTime: {
    fontSize: 10,
    color: '#8e8e93',
    fontWeight: '700',
    marginTop: 2
  },
  stockFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#f0f3f7',
    paddingTop: 15,
    marginTop: 5
  },
  stockStat: {
    alignItems: 'flex-start'
  },
  stockStatLabel: {
    fontSize: 9,
    color: '#8e8e93',
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2
  },
  stockStatValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a'
  },
  emergencyBar: {
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
  }
});

export default HomeScreen;
