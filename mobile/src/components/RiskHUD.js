import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// Get screen dimensions for the overlay vignette
const { width, height } = Dimensions.get('window');

/**
 * RiskHUD Component
 * Designed to overlay seamlessly on top of an AR camera view.
 * Displays a color-coded circular gauge, textual warnings, and a pulsating screen edge when in danger.
 */
const RiskHUD = ({ riskScore = 0.0, distanceToEdge = 1.5 }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  
  // Determine risk category and dynamic UI styling
  let riskColor = '#4CAF50'; // Green (Safe)
  let riskText = 'SAFE ZONE';
  let isDanger = false;
  
  if (riskScore >= 0.7) {
    riskColor = '#FF3B30'; // Red (Danger)
    riskText = 'DANGER: TOO CLOSE';
    isDanger = true;
  } else if (riskScore >= 0.3) {
    riskColor = '#FFCC00'; // Yellow (Warning)
    riskText = 'APPROACHING BOUNDARY';
  }

  // Handle pulse animation for the red vignette when in the Danger zone
  useEffect(() => {
    if (isDanger) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      // Reset if user steps back into a safe zone
      pulseAnim.stopAnimation();
      pulseAnim.setValue(0);
    }
  }, [isDanger]);

  // --- SVG Gauge Calculations ---
  const radius = 35;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  // riskScore is 0 to 1. Maps to the stroke offset.
  const strokeDashoffset = circumference - (riskScore * circumference);

  return (
    // pointerEvents="none" allows the user to still tap the AR view beneath the HUD
    <View style={styles.container} pointerEvents="none">
      
      {/* Danger Vignette Overlay (Pulsating red border around the whole screen) */}
      {isDanger && (
        <Animated.View 
          style={[
            styles.vignette, 
            { opacity: pulseAnim }
          ]} 
        />
      )}

      {/* Main HUD Panel (Top Center) */}
      <View style={styles.hudPanel}>
        
        {/* Circular SVG Gauge */}
        <View style={styles.gaugeContainer}>
          <Svg height="80" width="80" viewBox="0 0 80 80">
            {/* Background Track Circle */}
            <Circle
              cx="40"
              cy="40"
              r={radius}
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Animated Progress Circle */}
            <Circle
              cx="40"
              cy="40"
              r={radius}
              stroke={riskColor}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 40 40)" // Start the ring from the top instead of right
            />
          </Svg>
          
          {/* Risk Percentage Text centered inside the SVG Circle */}
          <View style={styles.percentageContainer}>
            <Text style={[styles.percentageText, { color: riskColor }]}>
              {Math.round(riskScore * 100)}%
            </Text>
          </View>
        </View>

        {/* Text Information Panel */}
        <View style={styles.infoContainer}>
          <Text style={[styles.statusText, { color: riskColor }]}>
            {riskText}
          </Text>
          <Text style={styles.distanceText}>
            Distance to Edge: {distanceToEdge.toFixed(2)}m
          </Text>
        </View>
        
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject, // Cover entire screen
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 50, // Push down from the safe area notch
    zIndex: 999, // Ensure it sits on top of the camera
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 12,
    borderColor: '#FF3B30',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 30,
    elevation: 24, // Drop shadow for Android
  },
  hudPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 15, 0.85)', // Premium dark glassmorphism feel
    paddingRight: 25,
    paddingLeft: 10,
    paddingVertical: 10,
    borderRadius: 50, // Pill shape
    // Drop shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  gaugeContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoContainer: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 4,
  },
  distanceText: {
    color: '#B0B0B0',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default RiskHUD;
