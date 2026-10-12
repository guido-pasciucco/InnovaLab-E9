import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  blockedUrl?: string;
  category?: string;
}

/**
 * Pantalla institucional de bloqueo, según Desafío 4 del informe de UX
 * y el diseño final recibido: evita el error técnico genérico del
 * navegador y ofrece acciones claras ("Volver a sitio seguro" y
 * "Solicitar acceso a un adulto"), sin tono punitivo.
 */
export function BlockedSitePageScreen({
  blockedUrl = 'betsson.bet.ar',
  category = 'Sitios de apuestas',
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.badge}>PROTECCIÓN ACTIVA</Text>
      <Text style={styles.title}>Sitio web bloqueado</Text>
      <Text style={styles.url}>{blockedUrl}</Text>

      <Text style={styles.message}>
        BA+ bloqueó este sitio porque pertenece a una categoría restringida en
        este dispositivo.
      </Text>
      <Text style={styles.category}>{category}</Text>
      <Text style={styles.ruleOwner}>Regla administrada por BA+ Protege</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Volver atrás</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Solicitar acceso a un adulto</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#D32F2F', padding: 32, justifyContent: 'center', alignItems: 'center' },
  badge: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 16, opacity: 0.85 },
  title: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', marginBottom: 4, textAlign: 'center' },
  url: { fontSize: 14, color: '#FFE5E5', marginBottom: 20 },
  message: { fontSize: 14, color: '#FFFFFF', textAlign: 'center', marginBottom: 8, lineHeight: 20 },
  category: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  ruleOwner: { fontSize: 12, color: '#FFD9D9', marginBottom: 32 },
  actions: { width: '100%' },
  primaryButton: { backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: '#D32F2F', fontWeight: '700', fontSize: 14 },
  secondaryButton: { borderWidth: 1.5, borderColor: '#FFFFFF', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
