import type { SupabaseClient } from '@supabase/supabase-js';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Repositorio } from '@/data/Repositorio';

const LOTE = 500;
// Baixa de novo os últimos minutos antes da última sincronização, para não perder um registro
// gravado no servidor fora de ordem. Aplicar a mesma linha duas vezes não muda nada.
const MARGEM_MS = 2 * 60 * 1000;

/**
 * Envia ao Supabase o que foi gravado no celular e baixa o que o outro celular gravou.
 * Primeiro envia: o servidor ignora um envio mais antigo que a versão dele (gatilho
 * manter_mais_recente), e o download em seguida traz a versão que prevaleceu.
 */
export class SincronizacaoServico {
  constructor(
    private supabase: SupabaseClient,
    private db: SQLiteDatabase,
    // Clientes primeiro, para que as visitas e os pagamentos cheguem depois dos seus clientes.
    private repositorios: Repositorio<{ id: string }>[],
  ) {}

  async sincronizar(): Promise<void> {
    for (const repo of this.repositorios) {
      await this.enviarPendentes(repo);
    }
    for (const repo of this.repositorios) {
      await this.baixarAlteracoes(repo);
    }
  }

  private async enviarPendentes(repo: Repositorio<{ id: string }>): Promise<void> {
    const pendentes = await repo.pendentesDeSincronizar();
    for (let i = 0; i < pendentes.length; i += LOTE) {
      const lote = pendentes.slice(i, i + LOTE);
      const { error } = await this.supabase.from(repo.tabela).upsert(lote, { onConflict: 'id' });
      if (error) throw new Error(`Falha ao enviar ${repo.tabela}: ${error.message}`);
      await repo.marcarEnviadas(lote);
    }
  }

  private async baixarAlteracoes(repo: Repositorio<{ id: string }>): Promise<void> {
    const chave = `baixado_ate:${repo.tabela}`;
    const desde = (await this.db.getFirstAsync<{ valor: string }>('SELECT valor FROM meta WHERE chave = ?', chave))
      ?.valor;
    let maisRecente = desde;
    for (let inicio = 0; ; inicio += LOTE) {
      let consulta = this.supabase.from(repo.tabela).select('*');
      if (desde) {
        consulta = consulta.gt('sincronizado_em', new Date(Date.parse(desde) - MARGEM_MS).toISOString());
      }
      const { data, error } = await consulta
        .order('sincronizado_em')
        .order('id')
        .range(inicio, inicio + LOTE - 1);
      if (error) throw new Error(`Falha ao baixar ${repo.tabela}: ${error.message}`);
      await repo.aplicarRemotas(data);
      for (const linha of data) {
        if (!maisRecente || Date.parse(linha.sincronizado_em) > Date.parse(maisRecente)) {
          maisRecente = linha.sincronizado_em;
        }
      }
      if (data.length < LOTE) break;
    }
    if (maisRecente && maisRecente !== desde) {
      await this.db.runAsync('INSERT OR REPLACE INTO meta (chave, valor) VALUES (?, ?)', chave, maisRecente);
    }
  }
}
