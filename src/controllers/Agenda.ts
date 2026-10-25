import type { Cliente } from '@/model/Cliente';
import { diasEntre, somarDias } from '@/model/datas';
import { novoId } from '@/model/id';
import { StatusVisita, type DataISO } from '@/model/tipos';
import { Visita } from '@/model/Visita';

/** Prefixo do id de uma visita calculada pela frequência, que ainda não está gravada. */
export const PREFIXO_PREVISTA = 'prevista:';

/** Há quanto tempo um cliente está sem visita, para ver quem precisa ser agendado. */
export interface SemVisita {
  cliente: Cliente;
  /** A data da última visita realizada; nula quando o cliente nunca foi visitado. */
  ultima: DataISO | null;
  dias: number | null;
  /** A próxima visita já agendada, se houver. */
  agendada: Visita | null;
}

export class Agenda {
  private porId: Map<string, Cliente>;

  constructor(private clientes: Cliente[]) {
    this.porId = new Map(clientes.map((c) => [c.id, c]));
  }

  /**
   * As visitas atrasadas e as previstas até `dias` dias depois de hoje, em ordem de data.
   * Um fixo com visita agendada usa essa visita; sem ela, a próxima é calculada pela frequência.
   */
  visitasPrevistas(hoje: DataISO, dias = 7): Visita[] {
    const limite = somarDias(hoje, dias);
    const previstas: Visita[] = [];
    for (const cliente of this.clientes) {
      if (!cliente.ativo) continue;
      const agendadas = cliente.visitas.filter((v) => v.status === StatusVisita.AGENDADA);
      previstas.push(...agendadas);
      if (cliente.fixo && agendadas.length === 0) {
        const ultima = cliente.ultimaVisitaRealizada();
        const data = ultima ? cliente.proximaVisitaPrevista(ultima.dataRealizada!) : hoje;
        if (data) {
          previstas.push(new Visita({ id: PREFIXO_PREVISTA + cliente.id, clienteId: cliente.id, dataPrevista: data }));
        }
      }
    }
    return previstas
      .filter((v) => v.dataPrevista <= limite)
      .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
  }

  /** Agrupa por bairro; o bairro da visita mais urgente vem primeiro. */
  agruparPorBairro(visitas: Visita[]): Map<string, Visita[]> {
    const grupos = new Map<string, Visita[]>();
    const nomes = new Map<string, string>();
    for (const visita of visitas) {
      const bairro = this.porId.get(visita.clienteId)?.bairro.trim() || 'Sem bairro';
      const chave = bairro.toLocaleLowerCase('pt-BR');
      if (!nomes.has(chave)) {
        nomes.set(chave, bairro);
        grupos.set(bairro, []);
      }
      grupos.get(nomes.get(chave)!)!.push(visita);
    }
    return grupos;
  }

  /** Os clientes ativos, do que está há mais tempo sem visita ao mais recente; os nunca visitados vêm primeiro. */
  tempoSemVisita(hoje: DataISO): SemVisita[] {
    return this.clientes
      .filter((c) => c.ativo)
      .map((cliente) => {
        const ultima = cliente.ultimaVisitaRealizada()?.dataRealizada ?? null;
        const agendada =
          cliente.visitas
            .filter((v) => v.status === StatusVisita.AGENDADA)
            .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista))[0] ?? null;
        return { cliente, ultima, dias: ultima ? diasEntre(ultima, hoje) : null, agendada };
      })
      .sort((a, b) => (a.ultima ?? '').localeCompare(b.ultima ?? ''));
  }

  agendarAvulso(cliente: Cliente, data: DataISO): Visita {
    return new Visita({ id: novoId(), clienteId: cliente.id, dataPrevista: data, status: StatusVisita.AGENDADA });
  }

  atrasada(visita: Visita, hoje: DataISO): boolean {
    return visita.dataPrevista < hoje;
  }

  cliente(id: string): Cliente | undefined {
    return this.porId.get(id);
  }
}
