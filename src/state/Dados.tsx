import { useSQLiteContext } from 'expo-sqlite';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { Agenda } from '@/controllers/Agenda';
import { SincronizacaoServico } from '@/controllers/SincronizacaoServico';
import { mapeadorCliente, mapeadorPagamento, mapeadorVisita } from '@/data/mapeadores';
import { Repositorio } from '@/data/Repositorio';
import { supabase } from '@/lib/supabase';
import type { Cliente } from '@/model/Cliente';
import type { Pagamento } from '@/model/Pagamento';
import type { Visita } from '@/model/Visita';

import { useSessao } from './Sessao';

export type SituacaoSync = 'desligada' | 'sincronizando' | 'ok' | 'sem-internet' | 'erro';

interface EstadoDados {
  carregado: boolean;
  clientes: Cliente[];
  agenda: Agenda;
  cliente(id: string): Cliente | undefined;
  salvarCliente(cliente: Cliente): Promise<void>;
  salvarVisita(visita: Visita): Promise<void>;
  excluirVisita(visita: Visita): Promise<void>;
  salvarPagamento(pagamento: Pagamento): Promise<void>;
  excluirPagamento(pagamento: Pagamento): Promise<void>;
  sync: { situacao: SituacaoSync; pendentes: number; ultima: Date | null; erro: string | null };
  sincronizar(): Promise<void>;
}

const DadosContext = createContext<EstadoDados | null>(null);

const INTERVALO_SYNC_MS = 60_000;
const ESPERA_APOS_GRAVAR_MS = 1_500;

export function DadosProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { logado } = useSessao();

  const repos = useMemo(
    () => ({
      clientes: new Repositorio(db, 'clientes', mapeadorCliente),
      visitas: new Repositorio(db, 'visitas', mapeadorVisita),
      pagamentos: new Repositorio(db, 'pagamentos', mapeadorPagamento),
    }),
    [db],
  );
  const servico = useMemo(
    () =>
      supabase
        ? new SincronizacaoServico(supabase, db, [repos.clientes, repos.visitas, repos.pagamentos] as Repositorio<{
            id: string;
          }>[])
        : null,
    [db, repos],
  );

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [sync, setSync] = useState<EstadoDados['sync']>({
    situacao: servico ? 'ok' : 'desligada',
    pendentes: 0,
    ultima: null,
    erro: null,
  });

  const recarregar = useCallback(async () => {
    const [cs, vs, ps] = await Promise.all([repos.clientes.listar(), repos.visitas.listar(), repos.pagamentos.listar()]);
    const porId = new Map(cs.map((c) => [c.id, c]));
    for (const v of vs) porId.get(v.clienteId)?.visitas.push(v);
    for (const p of ps) porId.get(p.clienteId)?.pagamentos.push(p);
    cs.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    setClientes(cs);
    setCarregado(true);
    const pendentes = (
      await Promise.all([repos.clientes.contarPendentes(), repos.visitas.contarPendentes(), repos.pagamentos.contarPendentes()])
    ).reduce((a, b) => a + b, 0);
    setSync((s) => ({ ...s, pendentes }));
  }, [repos]);

  const emAndamento = useRef(false);
  const sincronizar = useCallback(async () => {
    if (!servico || !logado || emAndamento.current) return;
    emAndamento.current = true;
    setSync((s) => ({ ...s, situacao: 'sincronizando' }));
    try {
      await servico.sincronizar();
      setSync((s) => ({ ...s, situacao: 'ok', ultima: new Date(), erro: null }));
    } catch (e) {
      const mensagem = e instanceof Error ? e.message : String(e);
      const semInternet = /network|fetch|internet|timeout/i.test(mensagem);
      setSync((s) => ({ ...s, situacao: semInternet ? 'sem-internet' : 'erro', erro: mensagem }));
    } finally {
      emAndamento.current = false;
      await recarregar();
    }
  }, [servico, logado, recarregar]);

  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  const depoisDeGravar = useCallback(async () => {
    await recarregar();
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(sincronizar, ESPERA_APOS_GRAVAR_MS);
  }, [recarregar, sincronizar]);

  // Os dois efeitos leem o SQLite e o Supabase, sistemas externos; o estado só muda depois da leitura.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recarregar();
  }, [recarregar]);

  useEffect(() => {
    if (!logado) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    sincronizar();
    const intervalo = setInterval(sincronizar, INTERVALO_SYNC_MS);
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') sincronizar();
    });
    return () => {
      clearInterval(intervalo);
      assinatura.remove();
    };
  }, [logado, sincronizar]);

  const estado = useMemo<EstadoDados>(() => {
    const agenda = new Agenda(clientes);
    return {
      carregado,
      clientes,
      agenda,
      cliente: (id) => agenda.cliente(id),
      salvarCliente: async (c) => {
        await repos.clientes.salvar(c);
        await depoisDeGravar();
      },
      salvarVisita: async (v) => {
        await repos.visitas.salvar(v);
        await depoisDeGravar();
      },
      excluirVisita: async (v) => {
        await repos.visitas.excluir(v);
        await depoisDeGravar();
      },
      salvarPagamento: async (p) => {
        await repos.pagamentos.salvar(p);
        await depoisDeGravar();
      },
      excluirPagamento: async (p) => {
        await repos.pagamentos.excluir(p);
        await depoisDeGravar();
      },
      sync,
      sincronizar,
    };
  }, [carregado, clientes, repos, depoisDeGravar, sync, sincronizar]);

  return <DadosContext.Provider value={estado}>{children}</DadosContext.Provider>;
}

export function useDados(): EstadoDados {
  const estado = useContext(DadosContext);
  if (!estado) throw new Error('useDados fora do DadosProvider');
  return estado;
}
