import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Logo } from '../../components';
import { colors, cardStyle } from '../../theme';
import type { ProtectionStatus } from '../../native';
import { ProtectionModule, isNativeProtectionAvailable } from '../../native';
import { useProtection } from '../../hooks/useProtection';
import { useCriticalAction } from '../../hooks/useCriticalAction';
import { useAppMode } from '../../state/AppModeContext';
import { api } from '../../api';
import { syncProtectedDevice } from '../../services/deviceSync';
import type { ProtectedDeviceStackParamList } from '../../navigation/ProtectedDeviceStack';

type Props = NativeStackScreenProps<ProtectedDeviceStackParamList, 'ProtectionStatus'>;

/**
 * Pantalla principal del dispositivo protegido:
 * - estado y activación/desactivación (desactivar exige PIN y queda registrado),
 * - chequeos anti-evasión (Semana 6) con acciones para corregirlos,
 * - acceso al historial de actividad,
 * - sincronización con Backend (lista LOTBA, personalizada, eventos).
 */
export function ProtectionStatusScreen({ navigation }: Props) {
  const { details, checks, busy, error, activate, deactivate, syncNow, refresh } = useProtection();
  const { authorize, gate } = useCriticalAction();
  const { resetApp } = useAppMode();

  // Al abrir: sincronizar (respeta un intervalo mínimo; no consulta en cada apertura).
  useEffect(() => {
    syncProtectedDevice().catch(() => {}).finally(refresh);
  }, [refresh]);

  const protectionOn = !!details?.enabledByUser;

  const handleDeactivate = async () => {
    const ok = await authorize({
      title: 'Desactivar la protección',
      description: 'Es un cambio crítico: ingresá el PIN del adulto responsable para continuar.',
      audit: 'desactivar_proteccion',
    });
    if (ok) await deactivate();
  };

  const handleChangeMode = async () => {
    const ok = await authorize({
      title: 'Quitar la protección de este celular',
      description: 'Se apaga la protección y hay que volver a vincular. Ingresá el PIN del adulto responsable.',
      audit: 'desvincular_dispositivo',
    });
    if (!ok) return;
    // Orden importante: primero apagar (así quitar el admin no cuenta como intento de evasión),
    // después quitar el administrador (si no, la app queda imposible de desinstalar).
    await ProtectionModule.stopProtection();
    await ProtectionModule.removeDeviceAdmin().catch(() => {});
    await ProtectionModule.flushEvents().catch(() => {});
    await ProtectionModule.clearBackendConfig();
    await api.logout();
    await resetApp();
  };

  if (!details || !checks) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FF9933" />
      </View>
    );
  }

  const headline =
    details.status === 'active' ? 'Este dispositivo está protegido'
      : details.status === 'warning' ? 'Protección activa, con advertencias'
      : details.status === 'unconfigured' ? 'La protección todavía no está configurada'
      : protectionOn ? 'La protección se cayó'
      : 'La protección está desactivada';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!isNativeProtectionAvailable && (
        <Text style={styles.simBanner}>Modo simulado: el módulo nativo (Kotlin) no está instalado en esta compilación.</Text>
      )}

      <Logo size={56} />
      <View style={[cardStyle, styles.heroCard]}>
        <Text style={styles.heroLabel}>Estado de la protección</Text>
        <Text style={[styles.hero, { color: STATUS_COLOR[details.status] }]}>{STATUS_LABEL[details.status]}</Text>
        <Text style={styles.heroSub}>{headline}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Protección</Text>
        <Row label="Filtro de sitios" value={details.vpnRunning ? 'Funcionando' : 'Detenido'} ok={details.vpnRunning} />
        <Row
          label="Lista oficial LOTBA"
          value={details.blocklistCount > 0 ? `${details.blocklistCount} sitios` : 'Sin sincronizar'}
          ok={details.blocklistCount > 0}
        />
        <Row label="Sitios personalizados" value={`${details.customDomainsCount}`} ok />
        {details.pendingEvents > 0 && <Row label="Actividad sin enviar" value={`${details.pendingEvents}`} ok={details.pendingEvents < 50} />}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Para que no se pueda evadir</Text>
        <Check
          label="Administrador del dispositivo"
          ok={checks.deviceAdminActive}
          action="Activar"
          onPress={() => ProtectionModule.requestDeviceAdmin()}
        />
        <Check label="Accesibilidad" ok={checks.accessibilityEnabled} action="Activar" onPress={() => ProtectionModule.openAccessibilitySettings()} />
        <Check
          label="Sin ahorro de batería"
          ok={checks.batteryOptimizationIgnored}
          action="Corregir"
          onPress={() => ProtectionModule.requestIgnoreBatteryOptimizations()}
        />
        <Check
          label={checks.privateDnsRisk ? 'DNS privado activado (puede saltear el filtro)' : 'DNS privado'}
          ok={!checks.privateDnsRisk}
          action=""
          onPress={() => {}}
          hint={checks.privateDnsRisk ? 'Ajustes > Redes > DNS privado > “Desactivado” o “Automático”.' : undefined}
        />
        {checks.alwaysOnVpn !== true && (
          <Check
            label="VPN siempre activa (recomendado)"
            ok={false}
            optional
            action="Configurar"
            onPress={() => ProtectionModule.openVpnSettings()}
            hint="Tocá el engranaje de “BA Protege+” y activá “VPN siempre activa”. NO actives “Bloquear conexiones sin VPN”."
          />
        )}
        {!checks.notificationsEnabled && <Check label="Notificaciones" ok={false} action="" onPress={() => {}} hint="Activá las notificaciones de BA Protege+ en Ajustes > Apps." />}
      </View>

      {error === 'vpn_denied' && (
        <Text style={styles.errorText}>Sin el permiso de VPN no podemos filtrar los sitios. Volvé a tocar “Activar” y aceptá el aviso.</Text>
      )}
      {error === 'unknown' && <Text style={styles.errorText}>No pudimos activar la protección. Probá de nuevo.</Text>}
      {error === 'sync_failed' && <Text style={styles.errorText}>No pudimos sincronizar. Se sigue usando la última lista guardada.</Text>}

      {busy ? (
        <ActivityIndicator color="#FF9933" style={{ marginVertical: 16 }} />
      ) : protectionOn && details.vpnRunning ? (
        <TouchableOpacity style={styles.dangerButton} onPress={handleDeactivate}>
          <Text style={styles.dangerButtonText}>Desactivar protección</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.primaryButton} onPress={activate}>
          <Text style={styles.primaryButtonText}>{protectionOn ? 'Reactivar protección' : 'Activar protección'}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => navigation.navigate('ActivityHistory')}>
        <Text style={styles.link}>Ver actividad</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={syncNow} disabled={busy}>
        <Text style={styles.link}>Actualizar listas de sitios</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handleChangeMode}>
        <Text style={styles.linkMuted}>Quitar la protección de este celular</Text>
      </TouchableOpacity>

      {gate}
    </ScrollView>
  );
}

const STATUS_LABEL: Record<ProtectionStatus, string> = {
  active: 'Protección Activa',
  warning: 'Con advertencias',
  inactive: 'Protección inactiva',
  unconfigured: 'Sin configurar',
};
const STATUS_COLOR: Record<ProtectionStatus, string> = {
  active: colors.primary,
  warning: colors.warning,
  inactive: colors.danger,
  unconfigured: colors.textSoft,
};

function Row({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: ok ? '#2E7D32' : '#D32F2F' }]}>{value}</Text>
    </View>
  );
}

function Check({ label, ok, action, onPress, hint, optional }: {
  label: string; ok: boolean; action: string; onPress: () => void; hint?: string; optional?: boolean;
}) {
  return (
    <View style={styles.checkRow}>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>
          {ok ? '✓ ' : optional ? '○ ' : '⚠ '}
          {label}
        </Text>
        {!ok && action !== '' && (
          <TouchableOpacity onPress={onPress}>
            <Text style={styles.checkAction}>{action}</Text>
          </TouchableOpacity>
        )}
      </View>
      {!ok && hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, paddingTop: 40, alignItems: 'center', flexGrow: 1, backgroundColor: colors.background },
  simBanner: { backgroundColor: '#FFF3CD', color: '#7A5B00', padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 16, textAlign: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  card: { ...cardStyle, alignSelf: 'stretch', marginTop: 14 },
  heroCard: { alignSelf: 'stretch', marginTop: 18, alignItems: 'center' },
  heroLabel: { alignSelf: 'flex-start', fontSize: 15, color: colors.text },
  hero: { fontSize: 28, fontWeight: '800', marginVertical: 10 },
  heroSub: { fontSize: 12, color: colors.textMuted },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#333333', marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: '#555555', flexShrink: 1, paddingRight: 8 },
  rowValue: { fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  checkRow: { borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  checkAction: { color: '#7C3AED', fontWeight: '700', fontSize: 13 },
  hint: { fontSize: 12, color: '#888888', paddingBottom: 6 },
  errorText: { color: '#D32F2F', fontSize: 13, textAlign: 'center', marginTop: 12 },
  primaryButton: { alignSelf: 'stretch', backgroundColor: '#7C3AED', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  dangerButton: { alignSelf: 'stretch', borderWidth: 1.5, borderColor: '#D32F2F', borderRadius: 999, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  dangerButtonText: { color: '#D32F2F', fontWeight: '700', fontSize: 15 },
  link: { color: '#7C3AED', fontSize: 14, marginTop: 14 },
  linkMuted: { color: '#888888', fontSize: 13, marginTop: 22, marginBottom: 24 },
});
