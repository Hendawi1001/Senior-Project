import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

const HelpScreen = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>How to use Health Monitor</Text>

      <View style={styles.section}>
        <Text style={styles.heading}>1. Dashboard</Text>
        <Text style={styles.text}>The dashboard displays your real-time simulated health data. Alerts are automatically triggered if your readings reach warning or critical levels.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>2. AI Assistant (Chat)</Text>
        <Text style={styles.text}>Use the chat feature to ask general medical questions. The AI will respond with information, but remember it is not a substitute for professional medical advice.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>3. Profile & Alerts</Text>
        <Text style={styles.text}>View your personal information and a history of all health alerts triggered by the system.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>4. Settings</Text>
        <Text style={styles.text}>Manage your privacy settings, change your password, or log out securely.</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20
  },
  section: {
    marginBottom: 20
  },
  heading: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#007AFF'
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444'
  }
});

export default HelpScreen;
