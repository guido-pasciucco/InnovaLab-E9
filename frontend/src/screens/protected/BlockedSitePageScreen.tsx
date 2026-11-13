import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProtectedDeviceStackParamList } from '../../navigation/ProtectedDeviceStack';
import { normalizeDomain } from '../../utils/domains';

type Props = NativeStackScreenProps<ProtectedDeviceStackParamList, 'BlockedSitePage'>;

/**
 * Pantalla institucional de sitio bloqueado (diseño UX, Desafío 4).
 *
 * Cómo se llega (Semana 5): el filtro DNS no puede dibujar dentro del navegador
 * (el menor ve "no se puede acceder al sitio"), así que al bloquear, Kotlin
 * muestra una notificación "BA Protege+ bloqueó <sitio>" que abre esta pantalla
 * con el dominio (deep link baprotege://blocked/<dominio>).
 */
export function BlockedSitePageScreen({ route, navigation }: Props) {
  // Semana 10 (seguridad): cualquier app puede abrir baprotege://blocked/<texto>.
  // Solo se muestra si es un dominio válido, para que no se pueda usar la pantalla
  // con mensajes inventados.
  const domain = normalizeDomain(route.params?.domain ?? '') ?? 'un sitio de apuestas';
  const [askedAdult, setAskedAdult] = useState(false);

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('ProtectionStatus');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.badge}>PROTECCIÓN ACTIVA</Text>
      <Text style={styles.title}>Sitio web bloqueado</Text>
      <Text style={styles.url}>{domain}</Text>

      <Text style={styles.message}>
        BA Protege+ bloqueó este sitio porque figura en la lista de sitios de apuestas no autorizados por LOTBA.
      </Text>
      <Text style={styles.ruleOwner}>Regla administrada por BA Protege+</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.primaryButton} onPress={goBack}>
          <Text style={styles.primaryButtonText}>Volver</Text>
        </TouchableOpacity>

        {/* "Solicitar acceso": todavía no hay un tipo de evento aprobado para esto (lo decide
            Data Analytics). Por ahora no prometemos un aviso automático que no existe. */}
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setAskedAdult(true)}>
          <Text style={styles.secondaryButtonText}>¿Creés que es un error?</Text>
        </TouchableOpacity>
        {askedAdult && (
          <Text style={styles.askedText}>
            Contale a tu adulto responsable: él puede revisar este sitio desde su app de BA Protege+.
          </Text>
        )}
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
  ruleOwner: { fontSize: 12, color: '#FFD9D9', marginBottom: 32 },
  actions: { width: '100%' },
  primaryButton: { backgroundColor: '#FFFFFF', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: '#D32F2F', fontWeight: '700', fontSize: 14 },
  secondaryButton: { borderWidth: 1.5, borderColor: '#FFFFFF', borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  secondaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  askedText: { color: '#FFFFFF', fontSize: 13, textAlign: 'center', marginTop: 12 },
});
