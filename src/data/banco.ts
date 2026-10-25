import type { SQLiteDatabase } from 'expo-sqlite';

export const NOME_BANCO = 'gilmargardens.db';

// As tabelas espelham as do Supabase (supabase/schema.sql), mais a coluna `pendente`:
// 1 enquanto a alteração não foi enviada ao servidor.
const VERSAO = 1;

export async function migrarBanco(db: SQLiteDatabase): Promise<void> {
  const linha = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  if ((linha?.user_version ?? 0) >= VERSAO) return;

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS clientes (
      id TEXT PRIMARY KEY NOT NULL,
      nome TEXT NOT NULL,
      telefone TEXT NOT NULL DEFAULT '',
      endereco TEXT NOT NULL DEFAULT '',
      bairro TEXT NOT NULL DEFAULT '',
      tipo TEXT NOT NULL,
      frequencia_semanas INTEGER,
      valor_mensal REAL,
      data_ultimo_reajuste TEXT,
      tamanho_jardim TEXT NOT NULL DEFAULT '',
      arvores TEXT NOT NULL DEFAULT '',
      plantas TEXT NOT NULL DEFAULT '',
      acesso_casa TEXT NOT NULL DEFAULT '',
      animais TEXT NOT NULL DEFAULT '',
      ativo INTEGER NOT NULL DEFAULT 1,
      atualizado_em TEXT NOT NULL,
      excluido INTEGER NOT NULL DEFAULT 0,
      pendente INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS visitas (
      id TEXT PRIMARY KEY NOT NULL,
      cliente_id TEXT NOT NULL,
      data_prevista TEXT NOT NULL,
      data_realizada TEXT,
      servico TEXT NOT NULL,
      valor REAL,
      observacoes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      excluido INTEGER NOT NULL DEFAULT 0,
      pendente INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS visitas_cliente ON visitas (cliente_id);

    CREATE TABLE IF NOT EXISTS pagamentos (
      id TEXT PRIMARY KEY NOT NULL,
      cliente_id TEXT NOT NULL,
      data TEXT NOT NULL,
      referencia TEXT,
      valor REAL NOT NULL,
      forma TEXT NOT NULL,
      observacoes TEXT NOT NULL DEFAULT '',
      atualizado_em TEXT NOT NULL,
      excluido INTEGER NOT NULL DEFAULT 0,
      pendente INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS pagamentos_cliente ON pagamentos (cliente_id);

    -- Quando cada tabela foi baixada do servidor pela última vez.
    CREATE TABLE IF NOT EXISTS meta (
      chave TEXT PRIMARY KEY NOT NULL,
      valor TEXT
    );
  `);
  await db.execAsync(`PRAGMA user_version = ${VERSAO}`);
}
