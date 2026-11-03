import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ProtectionStatus } from '../native/ProtectionModule';

interface Props {
  status: ProtectionStatus;
}

const STATUS_CONFIG: Record<ProtectionStatus, { label: string; color: string }> = {
  active: { label: 'Protección activa', color: '#34A853' },
  warning: { label: 'Protección con advertencia', color: '#F57C00' },
  inactive: { label: 'Protección caída', color: '#D32F2F' },
  unconfigured: { label: 'Protección no configurada', color: '#9AA0A6' },
};

export function ProtectionStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status];

  return (
    <View style={[styles.container, { backgroundColor: config.color }]}>
      <Text style={styles.label}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});
