import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { ProtectionStatusBadge, PinInput } from '../../components';
import { verifyResponsiblePin } from '../../native/PinVerification.mock';
import type { ProtectionStatus } from '../../native/ProtectionModule';

// Datos simulados del dispositivo, hasta que exista el backend real.
const MOCK_DEVICE = {
  name: 'Mateo Ruiz',
  status: 'active' as ProtectionStatus,
  lastReport: 'Hoy, 18:45',
};

type UnlinkFlowState = 'idle' | 'confirming' | 'checkingPin' | 'pinError' | 'done';

/**
 * Detalle del dispositivo vinculado. La acción de desvincular es un
 * "cambio crítico" (Desafío 5 del informe de UX): exige el PIN del
 * responsable antes de ejecutarse, validado contra Backend (ver
 * PinVerification.mock.ts — nunca se compara el PIN localmente).
 */
export function DeviceDetailScreen() {
  const [flowState, setFlowState] = useState<UnlinkFlowState>('idle');

  const handleStartUnlink = () => setFlowState('confirming');
  const handleCancel = () => setFlowState('idle');

  const handlePinComplete = async (pin: string) => {
    setFlowState('checkingPin');
    const isValid = await verifyResponsiblePin(pin);

    if (isValid) {
      // TODO: llamar al endpoint real que desvincula el dispositivo en Backend.
      setFlowState('done');
    } else {
      setFlowState('pinError');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{MOCK_DEVICE.name}</Text>
      <ProtectionStatusBadge status={MOCK_DEVICE.status} />
      <Text style={styles.meta}>Último reporte: {MOCK_DEVICE.lastReport}</Text>

      <Text style={styles.sectionPlaceholder}>
        [ Placeholder — acá van la lista de bloqueo sincronizada y la
        actividad reciente del dispositivo ]
      </Text>

      <View style={styles.dangerZone}>
        {flowState === 'idle' && (
          <TouchableOpacity style={styles.unlinkButton} onPress={handleStartUnlink}>
            <Text style={styles.unlinkButtonText}>Desvincular dispositivo</Text>
          </TouchableOpacity>
        )}

        {(flowState === 'confirming' || flowState === 'checkingPin' || flowState === 'pinError') && (
          <View style={styles.pinSection}>
            <Text style={styles.pinTitle}>Ingresá tu PIN para confirmar</Text>
            <Text style={styles.pinSubtitle}>
              Desvincular un dispositivo es un cambio crítico y requiere tu PIN de responsable.
            </Text>

            {flowState === 'checkingPin' ? (
              <ActivityIndicator color="#1A4B8C" style={{ marginVertical: 16 }} />
            ) : (
              <PinInput onComplete={handlePinComplete} />
            )}

            {flowState === 'pinError' && (
              <Text style={styles.pinErrorText}>PIN incorrecto. Probá de nuevo.</Text>
            )}

            <TouchableOpacity onPress={handleCancel} style={styles.cancelLink}>
              <Text style={styles.cancelLinkText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}

        {flowState === 'done' && (
          <Text style={styles.doneText}>Dispositivo desvinculado correctamente.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  meta: { fontSize: 13, color: '#888888', marginTop: 10 },
  sectionPlaceholder: {
    color: '#999999',
    fontStyle: 'italic',
    lineHeight: 22,
    marginTop: 24,
  },
  dangerZone: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  unlinkButton: {
    borderWidth: 1.5,
    borderColor: '#D32F2F',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  unlinkButtonText: { color: '#D32F2F', fontWeight: '700' },
  pinSection: { alignItems: 'center' },
  pinTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  pinSubtitle: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  pinErrorText: { color: '#D32F2F', marginTop: 12, fontSize: 13 },
  cancelLink: { marginTop: 20 },
  cancelLinkText: { color: '#1A4B8C', fontSize: 14 },
  doneText: { color: '#2E7D32', fontWeight: '600', textAlign: 'center' },
});
