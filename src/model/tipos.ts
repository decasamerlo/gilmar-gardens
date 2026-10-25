/** Uma data sem hora, no formato AAAA-MM-DD. */
export type DataISO = string;

/** Um mês de referência, no formato AAAA-MM. */
export type MesISO = string;

export enum TipoCliente {
  FIXO = 'FIXO',
  AVULSO = 'AVULSO',
}

export enum TipoServico {
  MANUTENCAO = 'MANUTENCAO',
  LIMPEZA_TERRENO = 'LIMPEZA_TERRENO',
}

export enum StatusVisita {
  AGENDADA = 'AGENDADA',
  REALIZADA = 'REALIZADA',
  CANCELADA = 'CANCELADA',
}

export enum FormaPagamento {
  PIX = 'PIX',
  DINHEIRO = 'DINHEIRO',
  TRANSFERENCIA = 'TRANSFERENCIA',
}

export const NOME_SERVICO: Record<TipoServico, string> = {
  [TipoServico.MANUTENCAO]: 'Manutenção',
  [TipoServico.LIMPEZA_TERRENO]: 'Limpeza de terreno',
};

export const NOME_FORMA_PAGAMENTO: Record<FormaPagamento, string> = {
  [FormaPagamento.PIX]: 'Pix',
  [FormaPagamento.DINHEIRO]: 'Dinheiro',
  [FormaPagamento.TRANSFERENCIA]: 'Transferência',
};
