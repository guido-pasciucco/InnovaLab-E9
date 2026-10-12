import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { AlertListItem, AlertData } from '../../components';

const MOCK_ALERTS: AlertData[] = [
  { id: '1', message: 'Intento de acceso a sitio bloqueado detectado.', timestamp: 'Hoy, 18:42', severity: 'warning' },
  { id: '2', message: 'La protección en el dispositivo de Juan se encuentra inactiva.', timestamp: 'Ayer, 21:10', severity: 'critical' },
];

export function AlertsHistoryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alertas e historial</Text>
      <FlatList
        data={MOCK_ALERTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <AlertListItem {...item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
});
