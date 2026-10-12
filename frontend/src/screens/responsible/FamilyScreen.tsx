import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { FamilyStackParamList } from '../../navigation/ResponsibleTabs';

type Props = NativeStackScreenProps<FamilyStackParamList, 'FamilyHome'>;

// Datos simulados, hasta que exista el backend real.
const MOCK_DEVICES = [
  { id: '1', name: 'Mateo Ruiz', lastSeen: 'Ultima vez en línea: 22:13' },
];

/**
 * Pantalla "Familia" (tab inferior, diseño UX): lista de dispositivos
 * vinculados y acceso para agregar un nuevo familiar/dispositivo.
 */
export function FamilyScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dispositivos vinculados</Text>

      <FlatList
        data={MOCK_DEVICES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.deviceRow}
            onPress={() => navigation.navigate('DeviceDetail', { deviceId: item.id })}
          >
            <Text style={styles.deviceName}>{item.name}</Text>
            <Text style={styles.deviceMeta}>{item.lastSeen}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Agregá un dispositivo para empezar.</Text>}
      />

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddDevice')}
      >
        <Text style={styles.addButtonText}>+ Agregar un familiar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  deviceRow: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  deviceName: { fontSize: 16, fontWeight: '600' },
  deviceMeta: { fontSize: 13, color: '#888888', marginTop: 4 },
  empty: { color: '#888888', marginTop: 24, textAlign: 'center' },
  addButton: { backgroundColor: '#1A4B8C', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  addButtonText: { color: '#FFFFFF', fontWeight: '700' },
});
