import type { SQLiteBindValue, SQLiteDatabase } from 'expo-sqlite';

/** Uma linha como está no banco, com as colunas de sincronização. */
export type Linha = Record<string, SQLiteBindValue>;

export type NomeTabela = 'clientes' | 'visitas' | 'pagamentos';

export interface Mapeador<T> {
  /** As colunas de dados, sem as de sincronização. */
  colunas: string[];
  /** Colunas guardadas como 0/1 no SQLite e como boolean no Supabase. */
  booleanas: string[];
  paraLinha(item: T): Linha;
  deLinha(linha: Linha): T;
}

const COLUNAS_SYNC = ['atualizado_em', 'excluido'];

/**
 * Grava e lê um tipo do modelo no SQLite do celular.
 * Toda gravação marca o registro como pendente, para o SincronizacaoServico enviá-lo ao Supabase.
 */
export class Repositorio<T extends { id: string }> {
  constructor(
    private db: SQLiteDatabase,
    readonly tabela: NomeTabela,
    private mapeador: Mapeador<T>,
  ) {}

  async salvar(item: T): Promise<void> {
    await this.gravar({ ...this.mapeador.paraLinha(item), excluido: 0 });
  }

  async excluir(item: T): Promise<void> {
    await this.gravar({ ...this.mapeador.paraLinha(item), excluido: 1 });
  }

  async buscarPorId(id: string): Promise<T | null> {
    const linha = await this.db.getFirstAsync<Linha>(
      `SELECT * FROM ${this.tabela} WHERE id = ? AND excluido = 0`,
      id,
    );
    return linha ? this.mapeador.deLinha(linha) : null;
  }

  async listar(): Promise<T[]> {
    const linhas = await this.db.getAllAsync<Linha>(`SELECT * FROM ${this.tabela} WHERE excluido = 0`);
    return linhas.map((l) => this.mapeador.deLinha(l));
  }

  /** As linhas alteradas no celular e ainda não enviadas, no formato do Supabase. */
  async pendentesDeSincronizar(): Promise<Linha[]> {
    const linhas = await this.db.getAllAsync<Linha>(`SELECT * FROM ${this.tabela} WHERE pendente = 1`);
    return linhas.map((l) => this.paraRemoto(l));
  }

  async contarPendentes(): Promise<number> {
    const r = await this.db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM ${this.tabela} WHERE pendente = 1`);
    return r?.n ?? 0;
  }

  /** Marca como enviadas as linhas que não mudaram desde o envio. */
  async marcarEnviadas(linhas: Linha[]): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      for (const l of linhas) {
        await this.db.runAsync(
          `UPDATE ${this.tabela} SET pendente = 0 WHERE id = ? AND atualizado_em = ?`,
          l.id as string,
          l.atualizado_em as string,
        );
      }
    });
  }

  /**
   * Grava as linhas baixadas do Supabase. Vale a alteração mais recente: uma linha local ainda
   * pendente e mais nova que a remota é mantida, para ser enviada na próxima sincronização.
   */
  async aplicarRemotas(remotas: Record<string, unknown>[]): Promise<void> {
    const colunas = [...this.mapeador.colunas, ...COLUNAS_SYNC];
    const sql =
      `INSERT OR REPLACE INTO ${this.tabela} (${colunas.join(', ')}, pendente) ` +
      `VALUES (${colunas.map(() => '?').join(', ')}, 0)`;
    await this.db.withTransactionAsync(async () => {
      for (const remota of remotas) {
        const local = await this.db.getFirstAsync<{ atualizado_em: string; pendente: number }>(
          `SELECT atualizado_em, pendente FROM ${this.tabela} WHERE id = ?`,
          remota.id as string,
        );
        if (local?.pendente && Date.parse(local.atualizado_em) > Date.parse(remota.atualizado_em as string)) {
          continue;
        }
        const linha = this.deRemoto(remota);
        await this.db.runAsync(sql, colunas.map((c) => linha[c] ?? null));
      }
    });
  }

  private async gravar(linha: Linha): Promise<void> {
    const colunas = [...this.mapeador.colunas, ...COLUNAS_SYNC];
    const completa: Linha = { ...linha, atualizado_em: new Date().toISOString() };
    await this.db.runAsync(
      `INSERT OR REPLACE INTO ${this.tabela} (${colunas.join(', ')}, pendente) ` +
        `VALUES (${colunas.map(() => '?').join(', ')}, 1)`,
      colunas.map((c) => completa[c] ?? null),
    );
  }

  private paraRemoto(linha: Linha): Linha {
    const remota: Record<string, unknown> = {};
    for (const c of [...this.mapeador.colunas, ...COLUNAS_SYNC]) {
      remota[c] = this.mapeador.booleanas.includes(c) || c === 'excluido' ? Boolean(linha[c]) : linha[c];
    }
    return remota as Linha;
  }

  private deRemoto(remota: Record<string, unknown>): Linha {
    const linha: Linha = {};
    for (const c of [...this.mapeador.colunas, ...COLUNAS_SYNC]) {
      const valor = remota[c];
      linha[c] = typeof valor === 'boolean' ? (valor ? 1 : 0) : ((valor ?? null) as SQLiteBindValue);
    }
    return linha;
  }
}
