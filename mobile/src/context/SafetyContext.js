import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const SafetyContext = createContext();

/**
 * SafetyContext
 * Manages the global state for the AR Safety system, including the real-time
 * risk score for the HUD and the historical data for the Statistics chart.
 */
export const SafetyProvider = ({ children }) => {
  // Real-time HUD State
  const [currentRisk, setCurrentRisk] = useState(0.0);
  const [distanceToEdge, setDistanceToEdge] = useState(1.5);

  // Historical Analytics State (for StatisticsScreen)
  const [riskHistory, setRiskHistory] = useState([]); // Array of peak risks per session/day
  const [zoneTime, setZoneTime] = useState({ safe: 0, warning: 0, danger: 0 }); // In seconds
  const [alertsTriggered, setAlertsTriggered] = useState(0);

  // Load saved historical data when the app starts
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedHistory = await AsyncStorage.getItem('@safety_history');
        const savedZones = await AsyncStorage.getItem('@safety_zones');
        const savedAlerts = await AsyncStorage.getItem('@safety_alerts');

        if (savedHistory) setRiskHistory(JSON.parse(savedHistory));
        if (savedZones) setZoneTime(JSON.parse(savedZones));
        if (savedAlerts) setAlertsTriggered(parseInt(savedAlerts));
      } catch (e) {
        console.error('Failed to load safety data', e);
      }
    };
    loadData();
  }, []);

  // Update the real-time HUD and accumulate statistics
  const updateRealTimeSafety = (riskScore, distance) => {
    setCurrentRisk(riskScore);
    setDistanceToEdge(distance);

    // Push the new score to the history array for the real-time chart (keep last 10 points)
    setRiskHistory(prev => {
      const newHistory = [...prev, riskScore].slice(-10);
      return newHistory;
    });

    // Accumulate time spent in zones (assuming this is called ~1 time per second for analytics)
    setZoneTime(prev => {
      const newZones = { ...prev };
      if (riskScore >= 0.7) {
        newZones.danger += 1;
        // If we just crossed into danger, log an alert
        if (currentRisk < 0.7) triggerAlert();
      } else if (riskScore >= 0.3) {
        newZones.warning += 1;
      } else {
        newZones.safe += 1;
      }
      AsyncStorage.setItem('@safety_zones', JSON.stringify(newZones));
      return newZones;
    });
  };

  const triggerAlert = () => {
    setAlertsTriggered(prev => {
      const newCount = prev + 1;
      AsyncStorage.setItem('@safety_alerts', newCount.toString());
      return newCount;
    });
  };

  // Called when a walking session ends to save the peak risk to the line chart
  const endSession = (peakRiskForSession) => {
    setRiskHistory(prev => {
      // Keep only the last 7 sessions for the chart
      const newHistory = [...prev, peakRiskForSession].slice(-7);
      AsyncStorage.setItem('@safety_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  return (
    <SafetyContext.Provider 
      value={{
        currentRisk,
        distanceToEdge,
        riskHistory,
        zoneTime,
        alertsTriggered,
        updateRealTimeSafety,
        endSession,
      }}
    >
      {children}
    </SafetyContext.Provider>
  );
};
