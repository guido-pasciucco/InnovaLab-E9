import { cardListStyle } from '../../theme';
import React from 'react';
import { View, Text, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { EventRow } from '../../components';
import { useDeviceHistory } from '../../hooks/useDeviceHistory';

/**
 * Historial de actividad del dispositivo protegido (Semana 6). Se lee del
 * registro local que guarda Kotlin, así funciona aunque no haya conexión.
 * Lo mismo se envía a Backend para que el Tutor lo vea desde su app.
 */
export function ActivityHistoryScreen() {
  const { events, loading, reload } = useDeviceHistory(150);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        Lo que BA Protege+ registró en este celular. El adulto responsable también lo ve en su app.
      </Text>
      <FlatList
        contentContainerStyle={events.length ? cardListStyle : undefined}
        data={events}
        keyExtractor={(e) => e.eventoId}
        renderItem={({ item }) => <EventRow event={item} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Todavía no hay actividad.</Text> : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  subtitle: { fontSize: 13, color: '#666666', marginBottom: 8 },
  empty: { color: '#888888', textAlign: 'center', marginTop: 32 },
});
