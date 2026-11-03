import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { DeviceEvent } from '../api/types';
import { describeEvent, formatWhen } from '../services/eventCatalog';

const COLOR = { info: '#7C3AED', warning: '#F57C00', critical: '#D32F2F' };

/** Una fila de actividad (historial del dispositivo o detalle en la app del Tutor). */
export function EventRow({ event }: { event: DeviceEvent }) {
  const { title, severity } = describeEvent(event);
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: COLOR[severity] }]} />
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.when}>{formatWhen(event.timestampDispositivo)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 4, marginRight: 12 },
  text: { flex: 1 },
  title: { fontSize: 14, color: '#222222' },
  when: { fontSize: 12, color: '#888888', marginTop: 2 },
});
