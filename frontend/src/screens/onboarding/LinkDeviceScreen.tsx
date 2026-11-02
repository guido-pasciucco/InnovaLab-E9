import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { QrCodeDisplay, FormField, PrimaryButton, ErrorText } from '../../components';
import { api, friendlyMessage } from '../../api';
import { useAppMode } from '../../state/AppModeContext';
import { configureNativeUploader } from '../../services/deviceSync';

type Role = 'responsable' | 'protegido';

// Se usa en Onboarding y en Familia > "Agregar un familiar": tipamos solo lo que usamos.
type LinkDeviceRoute = RouteProp<{ LinkDevice: { role?: Role } | undefined }, 'LinkDevice'>;
type LinkDeviceNav = NativeStackNavigationProp<{ ConfigureProtectedProfile: { deviceId: string } }>;

const POLL_MS = 4000;

export function LinkDeviceScreen() {
  const route = useRoute<LinkDeviceRoute>();
  return route.params?.role === 'protegido' ? <ProtectedSide /> : <ResponsibleSide />;
}

/**
 * Lado del adulto: pide el código a Backend (POST /api/link-codes) y espera a
 * que aparezca el dispositivo nuevo para pasar a cargar el perfil del menor.
 *
 * Cómo se entera de que el otro celular canjeó el código: Backend propuso un
 * listener de Firestore; como la app no usa el SDK de Firestore, pedimos
 * GET /api/devices y lo consultamos cada 4 s (pendiente en Backend: hasta
 * entonces se simula). Si se usa el backend real sin ese endpoint, se puede
 * pegar a mano el ID que muestra el celular protegido.
 */
function ResponsibleSide() {
  const navigation = useNavigation<LinkDeviceNav>();
  const [code, setCode] = useState<{ codigo: string; expiraEn: string } | null>(null);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const knownIds = useRef<Set<string> | null>(null);

  const requestCode = useCallback(async () => {
    setError(null);
    setExpired(false);
    try {
      setCode(await api.createLinkCode());
    } catch (e) {
      setError(friendlyMessage(e));
    }
  }, []);

  useEffect(() => {
    requestCode();
  }, [requestCode]);

  // Polling: detectar un dispositivo que no estaba antes de generar el código.
  useEffect(() => {
    if (!code || expired) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const devices = await api.listMyDevices();
        if (cancelled) return;
        if (knownIds.current === null) {
          knownIds.current = new Set(devices.map((d) => d.id));
          return;
        }
        const fresh = devices.find((d) => !knownIds.current!.has(d.id));
        if (fresh) navigation.replace('ConfigureProtectedProfile', { deviceId: fresh.id });
      } catch {
        // sin conexión: se reintenta en el próximo ciclo
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [code, expired, navigation]);

  const canUseManualId = !api.isDemoMode && !api.devicesAreReal;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ahora vinculemos el celular de tu familiar</Text>
      <Text style={styles.subtitle}>
        En el otro celular, abrí BA Protege+, elegí “Vincular dispositivo protegido” e ingresá este código.
      </Text>

      {code ? (
        <QrCodeDisplay code={code.codigo} expiresAt={code.expiraEn} onExpire={() => setExpired(true)} onRequestNewCode={requestCode} />
      ) : (
        !error && <ActivityIndicator color="#FF9933" style={{ marginVertical: 32 }} />
      )}
      <ErrorText>{error}</ErrorText>
      {error && <PrimaryButton title="Reintentar" onPress={requestCode} />}

      {code && !expired && (
        <Text style={styles.waiting}>Esperando que el otro celular ingrese el código…</Text>
      )}

      {canUseManualId && (
        <>
          <Text style={styles.manualHint}>
            (Integración) Si ya lo vinculaste, pegá el ID que aparece en el celular protegido:
          </Text>
          <FormField placeholder="ID del dispositivo" value={manualId} onChangeText={setManualId} autoCapitalize="none" />
          <PrimaryButton
            title="Continuar"
            variant="outline"
            disabled={manualId.trim().length < 10}
            onPress={() => navigation.replace('ConfigureProtectedProfile', { deviceId: manualId.trim() })}
          />
        </>
      )}
    </ScrollView>
  );
}

/**
 * Lado del celular protegido: sesión anónima de Firebase + canje del código
 * (POST /api/link-codes/redeem). El UID anónimo queda como ID del dispositivo.
 */
function ProtectedSide() {
  const { chooseMode } = useAppMode();
  const [codigo, setCodigo] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedId, setLinkedId] = useState<string | null>(null);

  const normalized = codigo.replace(/[\s-]/g, '').toUpperCase();

  const handleLink = async () => {
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      setError('El código tiene 6 letras o números.');
      return;
    }
    if (!deviceName.trim()) {
      setError('Poné un nombre para este celular (ej. “Celular de Mateo”).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await api.linkThisDevice(normalized, deviceName.trim());
      await configureNativeUploader();
      setLinkedId(result.dispositivoId);
    } catch (e) {
      setError(friendlyMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (linkedId) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>¡Listo! Este celular quedó vinculado</Text>
        <Text style={styles.subtitle}>Ahora vamos a activar la protección. Te vamos a pedir algunos permisos.</Text>
        {!api.isDemoMode && <Text style={styles.manualHint} selectable>ID del dispositivo: {linkedId}</Text>}
        <PrimaryButton title="Continuar" onPress={() => chooseMode('protegido')} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Vinculá este celular con el adulto responsable</Text>
      <Text style={styles.subtitle}>Pedile el código de 6 caracteres que aparece en su app.</Text>

      <FormField
        placeholder="Código (ej. G2T D8K)"
        value={codigo}
        onChangeText={setCodigo}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={8}
        style={styles.codeInput}
      />
      <FormField placeholder="Nombre de este celular (ej. Celular de Mateo)" value={deviceName} onChangeText={setDeviceName} maxLength={80} />

      <ErrorText>{error}</ErrorText>
      {loading ? <ActivityIndicator color="#FF9933" /> : <PrimaryButton title="Vincular" onPress={handleLink} />}
      {/* Escaneo de QR: pendiente (requiere librería de cámara). El QR contiene este mismo código. */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#666666', textAlign: 'center', marginBottom: 16, paddingHorizontal: 12 },
  waiting: { color: '#888888', fontSize: 13, marginTop: 8, textAlign: 'center' },
  manualHint: { color: '#888888', fontSize: 12, marginTop: 24, marginBottom: 8, textAlign: 'center' },
  codeInput: { fontSize: 22, letterSpacing: 4, textAlign: 'center', fontWeight: '700' },
});
