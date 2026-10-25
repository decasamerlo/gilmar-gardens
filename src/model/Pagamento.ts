import { FormaPagamento, type DataISO, type MesISO } from './tipos';

export type DadosPagamento = Pick<Pagamento, 'id' | 'clienteId' | 'data' | 'valor'> & Partial<Pagamento>;

export class Pagamento {
  id: string;
  clienteId: string;
  data: DataISO;
  /** Mês que a mensalidade paga, só para clientes fixos. */
  referencia?: MesISO;
  valor: number;
  forma: FormaPagamento;
  observacoes: string;

  constructor(dados: DadosPagamento) {
    this.id = dados.id;
    this.clienteId = dados.clienteId;
    this.data = dados.data;
    this.referencia = dados.referencia;
    this.valor = dados.valor;
    this.forma = dados.forma ?? FormaPagamento.PIX;
    this.observacoes = dados.observacoes ?? '';
  }
}
