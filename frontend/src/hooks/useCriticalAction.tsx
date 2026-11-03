import React, { useCallback, useRef, useState } from 'react';
import { PinGateModal } from '../components/PinGateModal';
import { ProtectionModule } from '../native';
import type { Configuracion } from '../api/types';

interface AuthorizeOptions {
  title: string;
  description: string;
  /**
   * Solo en el dispositivo protegido: qué configuración se intenta cambiar.
   * Si se indica, cada intento (fallido o exitoso) se registra como evento
   * `intento_modificacion_config` (catálogo acordado con Backend).
   */
  audit?: Configuracion;
}

/**
 * Protege "cambios críticos" con el PIN del adulto responsable.
 *
 *   const { authorize, gate } = useCriticalAction();
 *   if (await authorize({ title, description, audit: 'desactivar_proteccion' })) { ... }
 *   return (<View> ... {gate} </View>);
 */
export function useCriticalAction() {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<AuthorizeOptions>({ title: '', description: '' });
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const authorize = useCallback((options: AuthorizeOptions) => {
    return new Promise<boolean>((resolve) => {
      resolver.current?.(false); // si había una pendiente, se cancela
      resolver.current = resolve;
      setCurrent(options);
      setVisible(true);
    });
  }, []);

  const record = (resultado: 'exitoso' | 'fallido') => {
    if (!current.audit) return;
    ProtectionModule.recordEvent({
      tipoEvento: 'intento_modificacion_config',
      resultado,
      configuracion: current.audit,
    }).catch(() => {});
  };

  const finish = (ok: boolean) => {
    if (ok) record('exitoso');
    setVisible(false);
    resolver.current?.(ok);
    resolver.current = null;
  };

  const gate = (
    <PinGateModal
      visible={visible}
      title={current.title}
      description={current.description}
      onVerified={() => finish(true)}
      onCancel={() => finish(false)}
      onFailedAttempt={() => record('fallido')}
    />
  );

  return { authorize, gate };
}
