import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface AlertData {
  id: string;
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

const SEVERITY_COLOR: Record<AlertData['severity'], string> = {
  info: '#1A4B8C',
  warning: '#F57C00',
  critical: '#D32F2F',
};

export function AlertListItem({ message, timestamp, severity }: AlertData) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: SEVERITY_COLOR[severity] }]} />
      <View style={styles.textContainer}>
        <Text style={styles.message}>{message}</Text>
        <Text style={styles.timestamp}>{timestamp}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: '#222222',
  },
  timestamp: {
    fontSize: 12,
    color: '#888888',
    marginTop: 2,
  },
});
