import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

export interface BlockEntry {
  id: string;
  siteName: string;
  domain: string;
  statusLabel: string; // ej: "Acceso bloqueado hoy a las 10:19" / "No se bloqueó, en revisión."
}

// Datos simulados, tal como aparecen en el diseño de UX.
const MOCK_BLOCKS: BlockEntry[] = [
  { id: '1', siteName: 'BetMaster', domain: 'betmaster.com', statusLabel: 'Acceso bloqueado hoy a las 10:19' },
  { id: '2', siteName: 'Apuestas Mario', domain: 'betmario.bet', statusLabel: 'No se bloqueó, en revisión. Ayer 22:00' },
  { id: '3', siteName: 'Apuestas Sonic', domain: 'betsonic.bet', statusLabel: 'No se identificó amenaza. 1 de mayo 09:00' },
  { id: '4', siteName: 'Apuestas Sonic', domain: 'betsonic.bet', statusLabel: 'Acceso bloqueado ayer a las 14:40' },
];

/**
 * Pantalla "Bloqueos" (tab inferior, diseño UX): historial de intentos
 * de acceso a sitios restringidos, con su estado.
 */
export function BlocksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bloqueos exitosos</Text>

      <FlatList
        data={MOCK_BLOCKS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
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
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  siteName: { fontSize: 15, fontWeight: '600' },
  domain: { fontSize: 13, color: '#888888', marginTop: 2 },
  status: { fontSize: 13, color: '#333333', marginTop: 6 },
});
