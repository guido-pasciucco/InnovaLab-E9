import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { ProtectionStatusBadge } from '../../components';
import { ProtectionModule } from '../../native/ProtectionModule.mock';
import type { ProtectionStatus } from '../../native/ProtectionModule';
import type { BlockEntry } from './BlocksScreen';

const MOCK_RECENT_BLOCKS: BlockEntry[] = [
  { id: '1', siteName: 'BetMaster', domain: 'betmaster.com', statusLabel: 'Acceso bloqueado hoy a las 10:19' },
  { id: '2', siteName: 'Apuestas Mario', domain: 'betmario.bet', statusLabel: 'No se bloqueó, en revisión. Ayer 22:00' },
];

/**
 * Pantalla "Inicio" (tab inferior, diseño UX): saludo, estado de
 * protección del dispositivo seleccionado y resumen de bloqueos recientes.
 */
export function DashboardScreen() {
  const [status, setStatus] = useState<ProtectionStatus>('unconfigured');

  useEffect(() => {
    ProtectionModule.getProtectionStatus().then(setStatus);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>¡Hola! Mariana</Text>
      <Text style={styles.deviceName}>Mateo</Text>

      <View style={styles.statusCard}>
        <ProtectionStatusBadge status={status} />
        <Text style={styles.statusMeta}>Bloqueos esta semana: 2 · Filtro de sitios web: Actualizado</Text>
      </View>

      <Text style={styles.sectionTitle}>Bloqueos exitosos</Text>
      <FlatList
        data={MOCK_RECENT_BLOCKS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.blockRow}>
            <Text style={styles.siteName}>{item.siteName}</Text>
            <Text style={styles.domain}>{item.domain}</Text>
            <Text style={styles.status}>{item.statusLabel}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  greeting: { fontSize: 22, fontWeight: '700' },
  deviceName: { fontSize: 16, color: '#555555', marginBottom: 16 },
  statusCard: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 16, marginBottom: 20 },
  statusMeta: { fontSize: 12, color: '#777777', marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  blockRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  siteName: { fontSize: 14, fontWeight: '600' },
  domain: { fontSize: 12, color: '#888888' },
  status: { fontSize: 12, color: '#333333', marginTop: 4 },
});
