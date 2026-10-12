import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function DeviceDetailScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detalle del dispositivo</Text>
      <Text style={styles.placeholder}>
        [ Placeholder — acá va: estado de protección, lista de bloqueo
        sincronizada, actividad reciente y acción de desvincular ]
      </Text>
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
  placeholder: {
    color: '#999999',
    fontStyle: 'italic',
    lineHeight: 22,
  },
});
