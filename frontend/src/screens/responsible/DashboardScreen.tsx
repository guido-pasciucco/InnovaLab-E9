import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppHeader, EventRow } from '../../components';
import { api, friendlyMessage } from '../../api';
import type { Alert, Device, DeviceEvent, EstadoDispositivo } from '../../api';
import { formatWhen } from '../../services/eventCatalog';
import type { HomeStackParamList } from '../../navigation/ResponsibleTabs';
import { colors, cardStyle } from '../../theme';

type Props = NativeStackScreenProps<HomeStackParamList, 'Dashboard'>;

const ESTADO_UI: Record<EstadoDispositivo, { label: string; color: string; icon: string }> = {
  activo: { label: 'Protección Activa', color: colors.primary, icon: '✓' },
  advertencia: { label: 'Con advertencias', color: colors.warning, icon: '!' },
  caido: { label: 'Protección caída', color: colors.danger, icon: '✕' },
  sin_configurar: { label: 'Sin configurar', color: colors.textSoft, icon: '…' },
};

const displayName = (d: Device) => d.perfil?.nombre ?? d.nombre;

/**
 * "Inicio" del Tutor, según el Figma: saludo, fotos de los protegidos, estado de
 * la protección del seleccionado, bloqueos exitosos y actividad reciente.
 */
export function DashboardScreen({ navigation }: Props) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');

  const loadEvents = React.useCallback(async (deviceId: string) => {
    try {
      setEvents(await api.getDeviceEvents(deviceId));
    } catch (e) {
      setError(friendlyMessage(e));
    }
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [devs, als, session] = await Promise.all([api.listMyDevices(), api.listAlerts(), api.getSession()]);
      setDevices(devs);
      setAlerts(als);
      const alias = session?.email?.split('@')[0] ?? '';
      setName(alias ? alias.charAt(0).toUpperCase() + alias.slice(1) : '');
      const current = devs.find((d) => d.id === selectedId) ?? devs[0];
      setSelectedId(current?.id ?? null);
      if (current) await loadEvents(current.id);
      else setEvents([]);
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setLoading(false);
    }
  }, [selectedId, loadEvents]);

  // Semana 9: mientras el Inicio está en pantalla, se actualiza solo cada 60 s para que
  // las alertas nuevas aparezcan sin tener que deslizar (todavía no hay notificaciones push).
  const loadRef = React.useRef(load);
  loadRef.current = load;
  useFocusEffect(
    React.useCallback(() => {
      loadRef.current();
      const id = setInterval(() => loadRef.current(), 60_000);
      return () => clearInterval(id);
    }, [])
  );

  const selected = devices.find((d) => d.id === selectedId) ?? null;
  const unread = alerts.filter((a) => !a.leida).length;
  const weekAgo = Date.now() - 7 * 24 * 3600e3;
  const blocks = events.filter((e) => e.tipoEvento === 'acceso_bloqueado');
  const blocksThisWeek = blocks.filter((e) => new Date(e.timestampDispositivo).getTime() > weekAgo).length;
  const otherActivity = events.filter((e) => e.tipoEvento !== 'acceso_bloqueado').slice(0, 4);
  const ui = selected ? ESTADO_UI[selected.estado] ?? ESTADO_UI.sin_configurar : null;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <AppHeader
        title={`¡Hola!${name ? ` ${name}` : ''}`}
        onRightPress={() => navigation.getParent()?.navigate('Ajustes' as never)}
      />

      {api.isDemoMode ? (
        <Text style={styles.demo}>Modo demo: datos simulados.</Text>
      ) : (
        !api.devicesAreReal && <Text style={styles.demo}>Datos de ejemplo: Backend todavía no publicó la consulta de dispositivos y alertas.</Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Fotos de los protegidos: el seleccionado va al centro y más grande. */}
      {devices.length > 0 && (
        <View style={styles.avatars}>
          {devices.map((d) => {
            const active = d.id === selectedId;
            return (
              <TouchableOpacity
                key={d.id}
                style={styles.avatarItem}
                onPress={() => {
                  setSelectedId(d.id);
                  loadEvents(d.id);
                }}
              >
                <View style={[styles.avatar, active && styles.avatarActive]}>
                  <Text style={[styles.avatarInitial, active && { fontSize: 40 }]}>{displayName(d).charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={[styles.avatarName, active && styles.avatarNameActive]}>{displayName(d)}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.avatarItem} onPress={() => navigation.getParent()?.navigate('Familia' as never)}>
            <View style={styles.avatar}><Text style={styles.avatarAdd}>+</Text></View>
            <Text style={styles.avatarName}>Agregar</Text>
          </TouchableOpacity>
        </View>
      )}
      {!loading && devices.length === 0 && (
        <Text style={styles.empty}>Todavía no vinculaste dispositivos. Hacelo desde la pestaña “Familia”.</Text>
      )}

      {unread > 0 && (
        <TouchableOpacity style={styles.alertBanner} onPress={() => navigation.navigate('AlertsHistory')}>
          <Text style={styles.alertBannerText}>🔔  {unread === 1 ? 'Tenés 1 alerta sin leer' : `Tenés ${unread} alertas sin leer`}</Text>
          <Text style={styles.alertBannerText}>›</Text>
        </TouchableOpacity>
      )}

      {selected && ui && (
        <TouchableOpacity style={[cardStyle, styles.section]} onPress={() => navigation.navigate('DeviceDetail', { deviceId: selected.id })}>
          <Text style={styles.cardLabel}>Estado de la protección</Text>
          <View style={styles.heroRow}>
            <Text style={[styles.hero, { color: ui.color }]}>{ui.label}</Text>
            <View style={[styles.heroIcon, { backgroundColor: ui.color }]}><Text style={styles.heroIconText}>{ui.icon}</Text></View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>Bloqueos esta semana: {blocksThisWeek}</Text>
            <Text style={styles.meta}>Último reporte: {formatWhen(selected.ultimoReporte)}</Text>
          </View>
        </TouchableOpacity>
      )}

      {selected && (
        <View style={[cardStyle, styles.section]}>
          <Text style={styles.cardTitle}>Bloqueos exitosos</Text>
          {blocks.slice(0, 4).map((e) => (
            <View key={e.eventoId} style={styles.blockRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.blockSite}>{e.dominio}</Text>
                <Text style={styles.blockSub}>Acceso bloqueado · {formatWhen(e.timestampDispositivo)}</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: colors.success }]}><Text style={styles.statusDotText}>✓</Text></View>
            </View>
          ))}
          {blocks.length === 0 && !loading && <Text style={styles.empty}>Sin bloqueos todavía.</Text>}
        </View>
      )}

      {selected && otherActivity.length > 0 && (
        <View style={[cardStyle, styles.section]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.cardTitle}>Actividad reciente</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DeviceDetail', { deviceId: selected.id })}>
              <Text style={styles.link}>Ver todo</Text>
            </TouchableOpacity>
          </View>
          {otherActivity.map((e) => <EventRow key={e.eventoId} event={e} />)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 24 },
  demo: { backgroundColor: '#FFF3CD', color: '#7A5B00', padding: 8, borderRadius: 10, fontSize: 12, marginBottom: 12, textAlign: 'center' },
  error: { color: colors.danger, marginBottom: 12 },
  avatars: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 14, marginBottom: 16 },
  avatarItem: { alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  avatarActive: { width: 92, height: 92, borderRadius: 46, borderWidth: 3, borderColor: colors.primaryLight },
  avatarInitial: { fontSize: 26, fontWeight: '700', color: colors.primary },
  avatarAdd: { fontSize: 30, color: colors.textSoft },
  avatarName: { fontSize: 12, color: colors.textSoft, marginTop: 6 },
  avatarNameActive: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  alertBanner: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFE8EC', borderRadius: 16, padding: 14, marginBottom: 12 },
  alertBannerText: { color: '#B3261E', fontWeight: '700' },
  section: { marginBottom: 14 },
  cardLabel: { fontSize: 15, color: colors.text },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 14 },
  hero: { fontSize: 28, fontWeight: '800' },
  heroIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  heroIconText: { color: colors.white, fontWeight: '900' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 12, color: colors.textMuted },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { color: colors.primary, fontWeight: '600' },
  blockRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E4E4EA' },
  blockSite: { fontSize: 15, color: colors.text },
  blockSub: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  statusDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  statusDotText: { color: colors.white, fontWeight: '900', fontSize: 13 },
  empty: { color: colors.textSoft, marginTop: 8 },
});
