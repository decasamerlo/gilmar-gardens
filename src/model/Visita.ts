import { StatusVisita, TipoServico, type DataISO } from './tipos';

export type DadosVisita = Pick<Visita, 'id' | 'clienteId' | 'dataPrevista'> & Partial<Visita>;

export class Visita {
  id: string;
  clienteId: string;
  dataPrevista: DataISO;
  dataRealizada?: DataISO;
  servico: TipoServico;
  /** Só para clientes avulsos, que pagam por visita. */
  valor?: number;
  observacoes: string;
  status: StatusVisita;

  constructor(dados: DadosVisita) {
    this.id = dados.id;
    this.clienteId = dados.clienteId;
    this.dataPrevista = dados.dataPrevista;
    this.dataRealizada = dados.dataRealizada;
    this.servico = dados.servico ?? TipoServico.MANUTENCAO;
    this.valor = dados.valor;
    this.observacoes = dados.observacoes ?? '';
    this.status = dados.status ?? StatusVisita.AGENDADA;
  }

  registrarRealizacao(data: DataISO, valor?: number): void {
    this.dataRealizada = data;
    this.valor = valor;
    this.status = StatusVisita.REALIZADA;
  }

  cancelar(): void {
    this.status = StatusVisita.CANCELADA;
  }
}
