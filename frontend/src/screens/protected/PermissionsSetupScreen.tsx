import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PermissionPrimerScreen } from '../../components';
import { ProtectionModule } from '../../native';
import { useAppMode } from '../../state/AppModeContext';
import { useProtection } from '../../hooks/useProtection';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { ProtectedDeviceStackParamList } from '../../navigation/ProtectedDeviceStack';

type Props = NativeStackScreenProps<ProtectedDeviceStackParamList, 'PermissionsSetup'>;

const STEPS = ['vpn', 'admin', 'accessibility', 'battery'] as const;
type Step = (typeof STEPS)[number];

/**
 * Flujo de las 3 pantallas puente (priming screens) acordadas con UX,
 * en lenguaje cercano y sin jerga técnica (Desafío 1 del informe de UX).
 *
 * Semana 4:
 * - Paso VPN: si el usuario rechaza el diálogo del sistema NO se avanza
 *   (sin VPN no hay filtro; ver doc de restricciones técnicas, sección 2).
 * - Pasos Device Admin / Accesibilidad / Batería: no bloquean; quedan reflejados
 *   como advertencia en la pantalla de estado si faltan (con botón para corregir).
 * - Al terminar se activa la protección (persistida) y se recuerda que los
 *   permisos ya se hicieron, para no repetir el flujo al reabrir la app.
 */
export function PermissionsSetupScreen({ navigation }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const { markPermissionsDone } = useAppMode();
  const { activate } = useProtection();
  const step: Step = STEPS[stepIndex];

  const finish = async () => {
    // activate() vuelve a pedir el permiso de VPN (si ya está concedido no muestra nada),
    // sincroniza la lista LOTBA y arranca el servicio.
    const ok = await activate();
    if (!ok) {
      setMessage('No pudimos activar la protección. Volvé a intentarlo.');
      setStepIndex(0);
      return;
    }
    await markPermissionsDone();
    navigation.replace('ProtectionStatus');
  };

  const handleConfirm = async () => {
    if (working) return;
    setWorking(true);
    setMessage(null);
    try {
      if (step === 'vpn') {
        const granted = await ProtectionModule.requestVpnPermission();
        if (!granted) {
          setMessage('Necesitamos este permiso para poder filtrar los sitios de apuestas. Volvé a intentarlo.');
          return;
        }
      }
      if (step === 'admin') {
        const granted = await ProtectionModule.requestDeviceAdmin();
        if (!granted) setMessage('Podés seguir, pero sin el administrador la app se podría desinstalar sin autorización.');
      }
      if (step === 'accessibility') {
        ProtectionModule.openAccessibilitySettings();
      }
      if (step === 'battery') {
        ProtectionModule.requestIgnoreBatteryOptimizations();
      }

      if (stepIndex < STEPS.length - 1) {
        setStepIndex(stepIndex + 1);
      } else {
        await finish();
      }
    } finally {
      setWorking(false);
    }
  };

  const content: Record<Step, { title: string; explanation: string; confirmLabel: string }> = {
    vpn: {
      title: 'Vamos a activar el escudo protector',
      explanation:
        'En el siguiente paso vas a ver un aviso de tu teléfono sobre una conexión VPN. Es normal: la usamos para filtrar sitios de apuestas sin tocar tus fotos, chats ni datos bancarios.',
      confirmLabel: 'Activar protección',
    },
    admin: {
      title: 'Evitemos que se pueda desinstalar sin permiso',
      explanation:
        'Ahora vas a ver un aviso para activar un administrador de dispositivo. Esto evita que la protección se desactive por accidente o sin que el adulto responsable lo autorice.',
      confirmLabel: 'Activar administrador',
    },
    accessibility: {
      title: 'Un paso más para que la protección sea efectiva',
      explanation:
        'Te vamos a llevar a Ajustes > Accesibilidad. Buscá "BA Protege+" en la lista y activalo. Esto nos permite detectar intentos de desactivar la protección.',
      confirmLabel: 'Ir a Ajustes',
    },
    battery: {
      title: 'Que la protección no se apague sola',
      explanation:
        'Algunos celulares cierran apps para ahorrar batería. Vas a ver un aviso para que BA Protege+ quede siempre encendida: tocá "Permitir". Casi no gasta batería.',
      confirmLabel: 'Continuar',
    },
  };

  return (
    <View style={{ flex: 1 }}>
      <PermissionPrimerScreen {...content[step]} onConfirm={handleConfirm} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  message: { position: 'absolute', left: 24, right: 24, bottom: 32, color: '#B26A00', fontSize: 13, textAlign: 'center' },
});
