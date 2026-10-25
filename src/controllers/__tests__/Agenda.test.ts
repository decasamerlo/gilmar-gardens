import { Cliente } from '@/model/Cliente';
import { StatusVisita, TipoCliente, TipoServico } from '@/model/tipos';
import { Visita } from '@/model/Visita';

import { Agenda } from '../Agenda';

const HOJE = '2026-10-25';

function realizada(clienteId: string, data: string) {
  return new Visita({
    id: `v-${clienteId}-${data}`,
    clienteId,
    dataPrevista: data,
    dataRealizada: data,
    servico: TipoServico.MANUTENCAO,
    status: StatusVisita.REALIZADA,
  });
}

function agendada(clienteId: string, data: string) {
  return new Visita({ id: `a-${clienteId}-${data}`, clienteId, dataPrevista: data, status: StatusVisita.AGENDADA });
}

function fixo(id: string, bairro: string, frequenciaSemanas: number, visitas: Visita[] = [], ativo = true) {
  return new Cliente({ id, nome: id, bairro, tipo: TipoCliente.FIXO, frequenciaSemanas, valorMensal: 300, visitas, ativo });
}

function avulso(id: string, bairro: string, visitas: Visita[] = []) {
  return new Cliente({ id, nome: id, bairro, tipo: TipoCliente.AVULSO, visitas });
}

describe('Agenda.visitasPrevistas', () => {
  it('prevê a próxima visita dos fixos pela frequência', () => {
    const agenda = new Agenda([fixo('ana', 'Centro', 2, [realizada('ana', '2026-10-15')])]);

    const [visita] = agenda.visitasPrevistas(HOJE);

    expect(visita.clienteId).toBe('ana');
    expect(visita.dataPrevista).toBe('2026-10-29');
    expect(visita.status).toBe(StatusVisita.AGENDADA);
  });

  it('inclui as atrasadas e deixa de fora as que passam do horizonte', () => {
    const agenda = new Agenda([
      fixo('atrasada', 'Centro', 2, [realizada('atrasada', '2026-10-01')]),
      fixo('longe', 'Centro', 4, [realizada('longe', '2026-10-20')]),
    ]);

    const previstas = agenda.visitasPrevistas(HOJE, 7);

    expect(previstas.map((v) => [v.clienteId, v.dataPrevista])).toEqual([['atrasada', '2026-10-15']]);
    expect(agenda.atrasada(previstas[0], HOJE)).toBe(true);
  });

  it('põe para hoje o fixo que ainda não tem visita registrada', () => {
    const agenda = new Agenda([fixo('novo', 'Centro', 2)]);

    expect(agenda.visitasPrevistas(HOJE)[0].dataPrevista).toBe(HOJE);
  });

  it('usa a visita agendada no lugar da prevista pela frequência', () => {
    const agenda = new Agenda([
      fixo('ana', 'Centro', 2, [realizada('ana', '2026-10-15'), agendada('ana', '2026-10-27')]),
    ]);

    const previstas = agenda.visitasPrevistas(HOJE);

    expect(previstas).toHaveLength(1);
    expect(previstas[0].id).toBe('a-ana-2026-10-27');
  });

  it('mostra as visitas agendadas dos avulsos e ignora as realizadas', () => {
    const agenda = new Agenda([
      avulso('beto', 'Trindade', [realizada('beto', '2026-10-10'), agendada('beto', '2026-10-28')]),
    ]);

    expect(agenda.visitasPrevistas(HOJE).map((v) => v.id)).toEqual(['a-beto-2026-10-28']);
  });

  it('ignora clientes inativos', () => {
    const agenda = new Agenda([fixo('saiu', 'Centro', 2, [realizada('saiu', '2026-10-15')], false)]);

    expect(agenda.visitasPrevistas(HOJE)).toEqual([]);
  });

  it('ordena por data', () => {
    const agenda = new Agenda([
      fixo('b', 'Centro', 2, [realizada('b', '2026-10-17')]),
      fixo('a', 'Centro', 2, [realizada('a', '2026-10-12')]),
    ]);

    expect(agenda.visitasPrevistas(HOJE).map((v) => v.clienteId)).toEqual(['a', 'b']);
  });
});

describe('Agenda.agruparPorBairro', () => {
  it('agrupa as visitas pelo bairro do cliente, na ordem da visita mais urgente', () => {
    const agenda = new Agenda([
      fixo('ana', 'Trindade', 2, [realizada('ana', '2026-10-12')]),
      fixo('bia', 'Centro', 2, [realizada('bia', '2026-10-14')]),
      fixo('caio', 'Trindade', 2, [realizada('caio', '2026-10-16')]),
    ]);

    const grupos = agenda.agruparPorBairro(agenda.visitasPrevistas(HOJE));

    expect([...grupos.keys()]).toEqual(['Trindade', 'Centro']);
    expect(grupos.get('Trindade')!.map((v) => v.clienteId)).toEqual(['ana', 'caio']);
    expect(grupos.get('Centro')!.map((v) => v.clienteId)).toEqual(['bia']);
  });

  it('junta bairros escritos com maiúsculas ou espaços diferentes', () => {
    const agenda = new Agenda([
      fixo('ana', 'Trindade', 2, [realizada('ana', '2026-10-12')]),
      fixo('bia', ' trindade ', 2, [realizada('bia', '2026-10-14')]),
    ]);

    const grupos = agenda.agruparPorBairro(agenda.visitasPrevistas(HOJE));

    expect([...grupos.keys()]).toEqual(['Trindade']);
    expect(grupos.get('Trindade')).toHaveLength(2);
  });
});

describe('Agenda.agendarAvulso', () => {
  it('cria uma visita agendada para a data escolhida', () => {
    const cliente = avulso('beto', 'Trindade');

    const visita = new Agenda([cliente]).agendarAvulso(cliente, '2026-11-03');

    expect(visita).toMatchObject({ clienteId: 'beto', dataPrevista: '2026-11-03', status: StatusVisita.AGENDADA });
    expect(visita.id).toBeTruthy();
  });
});

describe('Agenda.tempoSemVisita', () => {
  it('ordena do cliente há mais tempo sem visita ao mais recente, com os nunca visitados primeiro', () => {
    const agenda = new Agenda([
      fixo('recente', 'Centro', 2, [realizada('recente', '2026-10-20')]),
      avulso('nunca', 'Trindade'),
      fixo('antigo', 'Centro', 2, [realizada('antigo', '2026-08-01'), realizada('antigo', '2026-09-10')]),
    ]);

    const lista = agenda.tempoSemVisita(HOJE);

    expect(lista.map((s) => [s.cliente.id, s.ultima, s.dias])).toEqual([
      ['nunca', null, null],
      ['antigo', '2026-09-10', 45],
      ['recente', '2026-10-20', 5],
    ]);
  });

  it('mostra a visita já agendada, a mais próxima', () => {
    const agenda = new Agenda([
      avulso('beto', 'Trindade', [
        realizada('beto', '2026-09-01'),
        agendada('beto', '2026-11-20'),
        agendada('beto', '2026-11-03'),
      ]),
    ]);

    expect(agenda.tempoSemVisita(HOJE)[0].agendada?.dataPrevista).toBe('2026-11-03');
  });

  it('ignora clientes inativos', () => {
    const agenda = new Agenda([fixo('saiu', 'Centro', 2, [realizada('saiu', '2026-08-01')], false)]);

    expect(agenda.tempoSemVisita(HOJE)).toEqual([]);
  });
});
