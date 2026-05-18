import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { SafetyContext } from '../context/SafetyContext';

const { width } = Dimensions.get('window');

/**
 * StatisticsScreen
 * A sleek, dark-mode dashboard showing historical AR Safety Risk data.
 * Displays summary metrics, a trend line chart, and a pie chart breakdown.
 */
const StatisticsScreen = () => {
  const { riskHistory, zoneTime, alertsTriggered } = useContext(SafetyContext);

  // Format historical risk for the Line Chart
  const lineChartData = {
    labels: riskHistory.length > 0 ? riskHistory.map((_, i) => `S${i+1}`) : ['N/A'],
    datasets: [
      {
        data: riskHistory.length > 0 ? riskHistory : [0], // Fallback if no history yet
        color: (opacity = 1) => `rgba(255, 59, 48, ${opacity})`, // Red line
        strokeWidth: 3
      }
    ]
  };

  // Format zone times for the Pie Chart
  const pieChartData = [
    {
      name: 'Safe',
      population: zoneTime.safe > 0 ? zoneTime.safe : 1, // Avoid empty charts initially
      color: '#4CAF50',
      legendFontColor: '#E0E0E0',
      legendFontSize: 14,
    },
    {
      name: 'Warning',
      population: zoneTime.warning,
      color: '#FFCC00',
      legendFontColor: '#E0E0E0',
      legendFontSize: 14,
    },
    {
      name: 'Danger',
      population: zoneTime.danger,
      color: '#FF3B30',
      legendFontColor: '#E0E0E0',
      legendFontSize: 14,
    },
  ];

  // Helper to format total safe time nicely
  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    return `${mins}m ${seconds % 60}s`;
  };

  // Calculate Average Risk across all historical sessions
  const avgRisk = riskHistory.length > 0 
    ? Math.round((riskHistory.reduce((a, b) => a + b, 0) / riskHistory.length) * 100)
    : 0;

  // Global styling configuration for the charts
  const chartConfig = {
    backgroundGradientFrom: '#1c1c1e',
    backgroundGradientTo: '#1c1c1e',
    color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(180, 180, 180, ${opacity})`,
    strokeWidth: 2,
    useShadowColorFromDataset: false,
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: '#FF3B30'
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <Text style={styles.headerTitle}>Safety Analytics</Text>

      {/* Top Summary Cards */}
      <View style={styles.cardsContainer}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Avg Risk</Text>
          <Text style={styles.cardValue}>{avgRisk}%</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Alerts</Text>
          <Text style={[styles.cardValue, { color: '#FF3B30' }]}>{alertsTriggered}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Safe Time</Text>
          <Text style={[styles.cardValue, { color: '#4CAF50' }]}>{formatTime(zoneTime.safe)}</Text>
        </View>
      </View>

      {/* Line Chart: Peak Risk Trend */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Peak Risk Trend</Text>
        <LineChart
          data={lineChartData}
          width={width - 40} // Screen width minus padding
          height={220}
          chartConfig={chartConfig}
          bezier // Smooth curved lines
          style={styles.chartStyle}
          yAxisSuffix="%"
          formatYLabel={(y) => (parseFloat(y) * 100).toFixed(0)} // Convert 0.5 to 50
        />
      </View>

      {/* Pie Chart: Time Spent in Zones */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Time Spent in Zones</Text>
        <PieChart
          data={pieChartData}
          width={width - 40}
          height={200}
          chartConfig={chartConfig}
          accessor={"population"}
          backgroundColor={"transparent"}
          paddingLeft={"10"}
          center={[10, 0]}
          absolute // Show absolute numbers instead of percentages
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Deep dark background
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 25,
    letterSpacing: 0.5,
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  card: {
    backgroundColor: '#1c1c1e', // Lighter dark gray
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 10,
    width: (width - 60) / 3, // 3 evenly spaced cards
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  cardTitle: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  cardValue: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: '#1c1c1e',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 0,
    marginBottom: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  chartTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
    alignSelf: 'flex-start',
    marginLeft: 20,
  },
  chartStyle: {
    borderRadius: 16,
    paddingRight: 20,
  }
});

export default StatisticsScreen;
