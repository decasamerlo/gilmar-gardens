import { Cliente } from '@/model/Cliente';
import { Pagamento } from '@/model/Pagamento';
import type { FormaPagamento, StatusVisita, TipoCliente, TipoServico } from '@/model/tipos';
import { Visita } from '@/model/Visita';

import type { Linha, Mapeador } from './Repositorio';

function texto(v: unknown): string {
  return v == null ? '' : String(v);
}

function opcional<T>(v: unknown, conv: (v: unknown) => T): T | undefined {
  return v == null ? undefined : conv(v);
}

export const mapeadorCliente: Mapeador<Cliente> = {
  colunas: [
    'id', 'nome', 'telefone', 'endereco', 'bairro', 'tipo', 'frequencia_semanas', 'valor_mensal',
    'data_ultimo_reajuste', 'tamanho_jardim', 'arvores', 'plantas', 'acesso_casa', 'animais', 'ativo',
  ],
  booleanas: ['ativo'],
  paraLinha: (c) => ({
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    endereco: c.endereco,
    bairro: c.bairro,
    tipo: c.tipo,
    frequencia_semanas: c.frequenciaSemanas ?? null,
    valor_mensal: c.valorMensal ?? null,
    data_ultimo_reajuste: c.dataUltimoReajuste ?? null,
    tamanho_jardim: c.tamanhoJardim,
    arvores: c.arvores,
    plantas: c.plantas,
    acesso_casa: c.acessoCasa,
    animais: c.animais,
    ativo: c.ativo ? 1 : 0,
  }),
  deLinha: (l: Linha) =>
    new Cliente({
      id: texto(l.id),
      nome: texto(l.nome),
      telefone: texto(l.telefone),
      endereco: texto(l.endereco),
      bairro: texto(l.bairro),
      tipo: l.tipo as TipoCliente,
      frequenciaSemanas: opcional(l.frequencia_semanas, Number),
      valorMensal: opcional(l.valor_mensal, Number),
      dataUltimoReajuste: opcional(l.data_ultimo_reajuste, String),
      tamanhoJardim: texto(l.tamanho_jardim),
      arvores: texto(l.arvores),
      plantas: texto(l.plantas),
      acessoCasa: texto(l.acesso_casa),
      animais: texto(l.animais),
      ativo: Boolean(l.ativo),
    }),
};

export const mapeadorVisita: Mapeador<Visita> = {
  colunas: ['id', 'cliente_id', 'data_prevista', 'data_realizada', 'servico', 'valor', 'observacoes', 'status'],
  booleanas: [],
  paraLinha: (v) => ({
    id: v.id,
    cliente_id: v.clienteId,
    data_prevista: v.dataPrevista,
    data_realizada: v.dataRealizada ?? null,
    servico: v.servico,
    valor: v.valor ?? null,
    observacoes: v.observacoes,
    status: v.status,
  }),
  deLinha: (l: Linha) =>
    new Visita({
      id: texto(l.id),
      clienteId: texto(l.cliente_id),
      dataPrevista: texto(l.data_prevista),
      dataRealizada: opcional(l.data_realizada, String),
      servico: l.servico as TipoServico,
      valor: opcional(l.valor, Number),
      observacoes: texto(l.observacoes),
      status: l.status as StatusVisita,
    }),
};

export const mapeadorPagamento: Mapeador<Pagamento> = {
  colunas: ['id', 'cliente_id', 'data', 'referencia', 'valor', 'forma', 'observacoes'],
  booleanas: [],
  paraLinha: (p) => ({
    id: p.id,
    cliente_id: p.clienteId,
    data: p.data,
    referencia: p.referencia ?? null,
    valor: p.valor,
    forma: p.forma,
    observacoes: p.observacoes,
  }),
  deLinha: (l: Linha) =>
    new Pagamento({
      id: texto(l.id),
      clienteId: texto(l.cliente_id),
      data: texto(l.data),
      referencia: opcional(l.referencia, String),
      valor: Number(l.valor),
      forma: l.forma as FormaPagamento,
      observacoes: texto(l.observacoes),
    }),
};
