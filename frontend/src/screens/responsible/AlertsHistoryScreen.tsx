import { cardListStyle } from '../../theme';
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { AlertListItem } from '../../components';
import type { AlertData } from '../../components';
import { useAsyncData } from '../../hooks/useAsyncData';
import { api } from '../../api';
import type { Alert } from '../../api';
import { formatWhen } from '../../services/eventCatalog';

const CRITICAL = new Set(['proteccion_desactivada', 'cambio_permiso', 'intento_bypass', 'dispositivo_sin_reporte']);

function toAlertData(a: Alert): AlertData {
  return {
    id: a.alertaId,
    message: a.mensaje,
    timestamp: formatWhen(a.fecha),
    severity: CRITICAL.has(a.tipoEvento) ? 'critical' : 'warning',
  };
}

/**
 * Alertas del Tutor (Semana 7). Las arma Backend a partir de los eventos del
 * dispositivo (reglas en su propuesta #9). Tocar una alerta la marca como leída.
 */
export function AlertsHistoryScreen() {
  const { data, loading, error, reload, setData } = useAsyncData(() => api.listAlerts());

  const markRead = async (a: Alert) => {
    if (a.leida) return;
    setData((prev) => prev?.map((x) => (x.alertaId === a.alertaId ? { ...x, leida: true } : x)) ?? prev);
    await api.markAlertRead(a.alertaId).catch(() => reload());
  };

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList
        contentContainerStyle={data?.length ? cardListStyle : undefined}
        data={data ?? []}
        keyExtractor={(a) => a.alertaId}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => markRead(item)} style={!item.leida ? styles.unread : undefined}>
            <AlertListItem {...toAlertData(item)} />
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No hay alertas. ¡Todo en orden!</Text> : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  unread: { backgroundColor: '#F5F0FF' },
  error: { color: '#D32F2F', marginTop: 12 },
  empty: { color: '#888888', textAlign: 'center', marginTop: 32 },
});
