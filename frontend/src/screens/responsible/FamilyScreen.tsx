import { cardListStyle } from '../../theme';
import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FamilyStackParamList } from '../../navigation/ResponsibleTabs';
import { ProtectionStatusBadge } from '../../components';
import { useAsyncData } from '../../hooks/useAsyncData';
import { api } from '../../api';
import { estadoToStatus, formatWhen } from '../../services/eventCatalog';

type Props = NativeStackScreenProps<FamilyStackParamList, 'FamilyHome'>;

/** "Familia": dispositivos vinculados y alta de un familiar nuevo. */
export function FamilyScreen({ navigation }: Props) {
  const { data, loading, error, reload } = useAsyncData(() => api.listMyDevices());

  useFocusEffect(
    React.useCallback(() => {
      reload();
    }, [reload])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dispositivos vinculados</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        contentContainerStyle={data?.length ? cardListStyle : undefined}
        data={data ?? []}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={reload}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.deviceRow} onPress={() => navigation.navigate('DeviceDetail', { deviceId: item.id })}>
            <Text style={styles.deviceName}>{item.perfil ? `${item.perfil.nombre} ${item.perfil.apellido}` : item.nombre}</Text>
            <View style={{ marginTop: 6 }}>
              <ProtectionStatusBadge status={estadoToStatus(item.estado)} />
            </View>
            <Text style={styles.deviceMeta}>Último reporte: {formatWhen(item.ultimoReporte)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Agregá un dispositivo para empezar.</Text> : undefined}
      />

      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddDevice', { role: 'responsable' })}>
        <Text style={styles.addButtonText}>+ Agregar un familiar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  error: { color: '#D32F2F', marginBottom: 8 },
  deviceRow: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  deviceName: { fontSize: 16, fontWeight: '600' },
  deviceMeta: { fontSize: 13, color: '#888888', marginTop: 6 },
  empty: { color: '#888888', marginTop: 24, textAlign: 'center' },
  addButton: { backgroundColor: '#7C3AED', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  addButtonText: { color: '#FFFFFF', fontWeight: '700' },
});
