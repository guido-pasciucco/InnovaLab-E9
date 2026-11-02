import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppModeStorage, AppMode } from '../storage/appModeStorage';

interface AppModeContextValue {
  /** true mientras se lee el disco al arrancar. */
  loading: boolean;
  mode: AppMode;
  /** true si el dispositivo protegido ya pasó las pantallas puente de permisos. */
  permissionsDone: boolean;
  /** Confirma el modo (fin del onboarding). RootNavigator cambia de stack solo. */
  chooseMode: (mode: Exclude<AppMode, null>) => Promise<void>;
  markPermissionsDone: () => Promise<void>;
  /** Vuelve al onboarding (cerrar sesión / cambiar de modo). */
  resetApp: () => Promise<void>;
}

const AppModeContext = createContext<AppModeContextValue | null>(null);

/**
 * Estado global mínimo de la app. Existe para resolver un bug de
 * navegación de las semanas 1-3: las pantallas de onboarding intentaban
 * hacer navigate('ResponsibleTabs') hacia pantallas que RootNavigator
 * todavía no tenía registradas (solo registra el stack del modo actual).
 * Ahora las pantallas cambian el modo acá y RootNavigator intercambia
 * el stack automáticamente.
 */
export function AppModeProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [mode, setModeState] = useState<AppMode>(null);
  const [permissionsDone, setPermissionsDoneState] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [savedMode, savedPermissions] = await Promise.all([
        AppModeStorage.getMode(),
        AppModeStorage.getPermissionsDone(),
      ]);
      if (cancelled) return;
      setModeState(savedMode);
      setPermissionsDoneState(savedPermissions);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chooseMode = useCallback(async (next: Exclude<AppMode, null>) => {
    await AppModeStorage.setMode(next);
    setModeState(next);
  }, []);

  const markPermissionsDone = useCallback(async () => {
    await AppModeStorage.setPermissionsDone(true);
    setPermissionsDoneState(true);
  }, []);

  const resetApp = useCallback(async () => {
    await AppModeStorage.clear();
    setPermissionsDoneState(false);
    setModeState(null);
  }, []);

  const value = useMemo(
    () => ({ loading, mode, permissionsDone, chooseMode, markPermissionsDone, resetApp }),
    [loading, mode, permissionsDone, chooseMode, markPermissionsDone, resetApp]
  );

  return <AppModeContext.Provider value={value}>{children}</AppModeContext.Provider>;
}

export function useAppMode(): AppModeContextValue {
  const ctx = useContext(AppModeContext);
  if (!ctx) throw new Error('useAppMode debe usarse dentro de <AppModeProvider>');
  return ctx;
}
