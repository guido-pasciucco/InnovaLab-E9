import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { FormField, PrimaryButton, ErrorText } from '../../components';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useCriticalAction } from '../../hooks/useCriticalAction';
import { api, friendlyMessage } from '../../api';
import { normalizeDomain } from '../../utils/domains';

/**
 * Sitios personalizados (Semana 8): el Tutor agrega sitios a bloquear además de
 * la lista oficial LOTBA (que no puede modificar).
 *  - Agregar: sin PIN (hace la protección más estricta).
 *  - Quitar: con PIN (la afloja; es la configuración protegida "editar_lista_personalizada").
 * Los celulares protegidos la bajan al sincronizar y la aplican junto con LOTBA.
 */
export function CustomSitesScreen() {
  const { data, loading, error, reload, setData } = useAsyncData(() => api.getCustomList());
  const { authorize, gate } = useCriticalAction();
  const [input, setInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    const domain = normalizeDomain(input);
    if (!domain) {
      setFormError('Escribí un sitio válido, por ejemplo: casino-ejemplo.com');
      return;
    }
    if (data?.includes(domain)) {
      setFormError('Ese sitio ya está en tu lista.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await api.addCustomDomain(domain);
      setData((prev) => [...(prev ?? []), domain].sort());
      setInput('');
    } catch (e) {
      setFormError(friendlyMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (domain: string) => {
    const ok = await authorize({
      title: `Quitar ${domain}`,
      description: 'Quitar un sitio de la lista vuelve a permitir el acceso. Ingresá tu PIN para confirmar.',
    });
    if (!ok) return;
    try {
      await api.removeCustomDomain(domain);
      setData((prev) => prev?.filter((d) => d !== domain) ?? prev);
    } catch (e) {
      setFormError(friendlyMessage(e));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>
        Se bloquean en todos tus dispositivos, junto con la lista oficial de LOTBA. También se bloquean sus subdominios.
      </Text>
      <FormField
        placeholder="Sitio a bloquear (ej. casino-ejemplo.com)"
        value={input}
        onChangeText={setInput}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        onSubmitEditing={handleAdd}
      />
      {saving ? <ActivityIndicator color="#FF9933" /> : <PrimaryButton title="Agregar sitio" onPress={handleAdd} />}
      <ErrorText>{formError ?? error}</ErrorText>

      <FlatList
        style={{ marginTop: 16 }}
        data={data ?? []}
        keyExtractor={(d) => d}
        onRefresh={reload}
        refreshing={loading}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.domain}>{item}</Text>
            <TouchableOpacity onPress={() => handleRemove(item)}>
              <Text style={styles.remove}>Quitar</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No agregaste sitios todavía.</Text> : undefined}
      />
      {gate}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  subtitle: { fontSize: 13, color: '#666666', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EEEEEE' },
  domain: { fontSize: 15 },
  remove: { color: '#D32F2F', fontWeight: '700' },
  empty: { color: '#888888', textAlign: 'center', marginTop: 24 },
});
