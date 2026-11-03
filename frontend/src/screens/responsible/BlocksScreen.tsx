import { cardListStyle } from '../../theme';
import React, { useLayoutEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAsyncData } from '../../hooks/useAsyncData';
import { api } from '../../api';
import type { DeviceEvent } from '../../api';
import { formatWhen } from '../../services/eventCatalog';
import type { BlocksStackParamList } from '../../navigation/ResponsibleTabs';

type Props = NativeStackScreenProps<BlocksStackParamList, 'BlocksHome'>;

type BlockRow = DeviceEvent & { deviceName: string };

/**
 * "Bloqueos" del Tutor: todos los accesos bloqueados (evento `acceso_bloqueado`)
 * de todos sus dispositivos, del más nuevo al más viejo.
 */
export function BlocksScreen({ navigation }: Props) {
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('CustomSites')}>
          <Text style={styles.headerLink}>Mis sitios</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const { data, loading, error, reload } = useAsyncData(async () => {
    const devices = await api.listMyDevices();
    const perDevice = await Promise.all(
      devices.map(async (d) =>
        (await api.getDeviceEvents(d.id))
          .filter((e) => e.tipoEvento === 'acceso_bloqueado')
          .map((e) => ({ ...e, deviceName: d.perfil?.nombre ?? d.nombre }))
      )
    );
    return perDevice.flat().sort((a, b) => b.timestampDispositivo.localeCompare(a.timestampDispositivo));
  });

  return (
    <View style={styles.container}>
      {error && <Text style={styles.error}>{error}</Text>}
      <FlatList<BlockRow>
        contentContainerStyle={data?.length ? cardListStyle : undefined}
        data={data ?? []}
        keyExtractor={(e) => e.eventoId}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.domain}>{item.dominio}</Text>
            <Text style={styles.status}>
              Bloqueado en el celular de {item.deviceName} · {formatWhen(item.timestampDispositivo)}
              {item.origenLista === 'personalizada' ? ' · tu lista' : ''}
            </Text>
          </View>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Todavía no se bloqueó ningún sitio.</Text> : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  headerLink: { color: '#7C3AED', fontWeight: '600' },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  domain: { fontSize: 15, fontWeight: '600' },
  status: { fontSize: 13, color: '#555555', marginTop: 4 },
  error: { color: '#D32F2F', marginTop: 12 },
  empty: { color: '#888888', textAlign: 'center', marginTop: 32 },
});
