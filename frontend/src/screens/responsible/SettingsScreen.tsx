import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configuración</Text>
      <Text style={styles.placeholder}>
        [ Placeholder — lista personalizada de sitios, cambio de PIN, cerrar sesión ]
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
