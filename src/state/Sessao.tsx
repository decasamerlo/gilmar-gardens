import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

interface EstadoSessao {
  carregando: boolean;
  logado: boolean;
  email: string | null;
}

const SessaoContext = createContext<EstadoSessao>({ carregando: true, logado: false, email: null });

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setCarregando(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => setSessao(nova));
    return () => data.subscription.unsubscribe();
  }, []);

  const estado: EstadoSessao = supabase
    ? { carregando, logado: Boolean(sessao), email: sessao?.user.email ?? null }
    : { carregando: false, logado: true, email: null };

  return <SessaoContext.Provider value={estado}>{children}</SessaoContext.Provider>;
}

export function useSessao(): EstadoSessao {
  return useContext(SessaoContext);
}
