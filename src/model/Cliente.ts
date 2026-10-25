import { mesDe, somarAnos, somarDias } from './datas';
import type { Pagamento } from './Pagamento';
import { StatusVisita, TipoCliente, type DataISO, type MesISO } from './tipos';
import type { Visita } from './Visita';

export type DadosCliente = Pick<Cliente, 'id' | 'nome' | 'tipo'> & Partial<Cliente>;

export class Cliente {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  bairro: string;
  tipo: TipoCliente;
  /** Só para fixos: a cada quantas semanas é a visita. */
  frequenciaSemanas?: number;
  /** Só para fixos: a mensalidade. */
  valorMensal?: number;
  dataUltimoReajuste?: DataISO;
  tamanhoJardim: string;
  arvores: string;
  plantas: string;
  acessoCasa: string;
  animais: string;
  ativo: boolean;
  visitas: Visita[];
  pagamentos: Pagamento[];

  constructor(dados: DadosCliente) {
    this.id = dados.id;
    this.nome = dados.nome;
    this.telefone = dados.telefone ?? '';
    this.endereco = dados.endereco ?? '';
    this.bairro = dados.bairro ?? '';
    this.tipo = dados.tipo;
    this.frequenciaSemanas = dados.frequenciaSemanas;
    this.valorMensal = dados.valorMensal;
    this.dataUltimoReajuste = dados.dataUltimoReajuste;
    this.tamanhoJardim = dados.tamanhoJardim ?? '';
    this.arvores = dados.arvores ?? '';
    this.plantas = dados.plantas ?? '';
    this.acessoCasa = dados.acessoCasa ?? '';
    this.animais = dados.animais ?? '';
    this.ativo = dados.ativo ?? true;
    this.visitas = dados.visitas ?? [];
    this.pagamentos = dados.pagamentos ?? [];
  }

  get fixo(): boolean {
    return this.tipo === TipoCliente.FIXO;
  }

  proximaVisitaPrevista(ultima: DataISO): DataISO | null {
    if (!this.fixo || !this.frequenciaSemanas) return null;
    return somarDias(ultima, this.frequenciaSemanas * 7);
  }

  ultimaVisitaRealizada(): Visita | null {
    return this.visitasRealizadas().reduce<Visita | null>(
      (ultima, v) => (!ultima || v.dataRealizada! > ultima.dataRealizada! ? v : ultima),
      null,
    );
  }

  /** Meses com visita realizada até hoje cuja mensalidade não foi paga por inteiro (fixos). */
  mesesEmAberto(hoje: DataISO): MesISO[] {
    if (!this.fixo) return [];
    const meses = new Set(
      this.visitasRealizadas()
        .filter((v) => v.dataRealizada! <= hoje)
        .map((v) => mesDe(v.dataRealizada!)),
    );
    return [...meses].filter((mes) => this.devidoNoMes(mes) > 0).sort();
  }

  saldoPendente(hoje: DataISO): number {
    if (this.fixo) {
      return this.mesesEmAberto(hoje).reduce((soma, mes) => soma + this.devidoNoMes(mes), 0);
    }
    const devido = this.visitasRealizadas()
      .filter((v) => v.dataRealizada! <= hoje)
      .reduce((soma, v) => soma + (v.valor ?? 0), 0);
    const pago = this.pagamentos.reduce((soma, p) => soma + p.valor, 0);
    return Math.max(0, devido - pago);
  }

  precisaReajuste(hoje: DataISO): boolean {
    if (!this.fixo || !this.dataUltimoReajuste) return false;
    return somarAnos(this.dataUltimoReajuste, 1) <= hoje;
  }

  private visitasRealizadas(): Visita[] {
    return this.visitas.filter((v) => v.status === StatusVisita.REALIZADA && v.dataRealizada);
  }

  private devidoNoMes(mes: MesISO): number {
    const pago = this.pagamentos.filter((p) => p.referencia === mes).reduce((soma, p) => soma + p.valor, 0);
    return Math.max(0, (this.valorMensal ?? 0) - pago);
  }
}
