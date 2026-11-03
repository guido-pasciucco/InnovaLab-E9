import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { ProtectionStatusBadge, EventRow, ErrorText } from '../../components';
import { useCriticalAction } from '../../hooks/useCriticalAction';
import { useAsyncData } from '../../hooks/useAsyncData';
import { api, friendlyMessage } from '../../api';
import { estadoToStatus, formatWhen } from '../../services/eventCatalog';

type Route = RouteProp<{ DeviceDetail: { deviceId: string } }, 'DeviceDetail'>;

/**
 * Detalle del dispositivo (Semana 7): estado, último reporte y actividad.
 * Desvincular es un cambio crítico: exige el PIN (Desafío 5 de UX).
 */
export function DeviceDetailScreen() {
  const { deviceId } = useRoute<Route>().params;
  const navigation = useNavigation();
  const { authorize, gate } = useCriticalAction();
  const [unlinkError, setUnlinkError] = useState<string | null>(null);

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [devices, events] = await Promise.all([api.listMyDevices(), api.getDeviceEvents(deviceId)]);
    return { device: devices.find((d) => d.id === deviceId) ?? null, events };
  }, [deviceId]);

  const device = data?.device;

  const handleUnlink = async () => {
    const ok = await authorize({
      title: 'Desvincular dispositivo',
      description: 'Desvincular un dispositivo es un cambio crítico y requiere tu PIN de responsable.',
    });
    if (!ok) return;
    try {
      await api.unlinkDevice(deviceId);
      navigation.goBack();
    } catch (e) {
      setUnlinkError(friendlyMessage(e));
    }
  };

  const header = (
    <View>
      {error && <Text style={styles.error}>{error}</Text>}
      {device && (
        <View style={styles.card}>
          <Text style={styles.title}>{device.perfil ? `${device.perfil.nombre} ${device.perfil.apellido}` : device.nombre}</Text>
          <ProtectionStatusBadge status={estadoToStatus(device.estado)} />
          <Text style={styles.meta}>Último reporte: {formatWhen(device.ultimoReporte)}</Text>
          <Text style={styles.meta}>{device.nombre} · {device.plataforma} · app v{device.versionApp}</Text>
        </View>
      )}
      {!device && !loading && !error && <Text style={styles.error}>No encontramos este dispositivo.</Text>}
      <Text style={styles.sectionTitle}>Actividad</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data?.events ?? []}
        keyExtractor={(e) => e.eventoId}
        renderItem={({ item }) => <EventRow event={item} />}
        ListHeaderComponent={header}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Sin actividad registrada.</Text> : undefined}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListFooterComponent={
          device ? (
            <View style={styles.dangerZone}>
              <ErrorText>{unlinkError}</ErrorText>
              <TouchableOpacity style={styles.unlinkButton} onPress={handleUnlink}>
                <Text style={styles.unlinkButtonText}>Desvincular dispositivo</Text>
              </TouchableOpacity>
            </View>
          ) : undefined
        }
      />
      {gate}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginTop: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  meta: { fontSize: 12, color: '#888888', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 4 },
  empty: { color: '#888888', marginTop: 12 },
  error: { color: '#D32F2F', marginTop: 12 },
  dangerZone: { marginTop: 32, paddingTop: 20, marginBottom: 32, borderTopWidth: 1, borderTopColor: '#EEEEEE' },
  unlinkButton: { borderWidth: 1.5, borderColor: '#D32F2F', borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  unlinkButtonText: { color: '#D32F2F', fontWeight: '700' },
});
