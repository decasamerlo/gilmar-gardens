import { Cliente } from '../Cliente';
import { Pagamento } from '../Pagamento';
import { FormaPagamento, StatusVisita, TipoCliente, TipoServico } from '../tipos';
import { Visita } from '../Visita';

function fixo(dados: Partial<Cliente> = {}) {
  return new Cliente({
    id: 'c1',
    nome: 'Dona Maria',
    bairro: 'Centro',
    tipo: TipoCliente.FIXO,
    frequenciaSemanas: 2,
    valorMensal: 300,
    dataUltimoReajuste: '2026-03-01',
    ...dados,
  });
}

function avulso(dados: Partial<Cliente> = {}) {
  return new Cliente({ id: 'c2', nome: 'Seu João', bairro: 'Trindade', tipo: TipoCliente.AVULSO, ...dados });
}

function realizada(data: string, valor?: number, clienteId = 'c1') {
  return new Visita({
    id: `v-${data}`,
    clienteId,
    dataPrevista: data,
    dataRealizada: data,
    servico: TipoServico.MANUTENCAO,
    valor,
    status: StatusVisita.REALIZADA,
  });
}

function pagamento(data: string, valor: number, referencia?: string, clienteId = 'c1') {
  return new Pagamento({ id: `p-${data}`, clienteId, data, valor, referencia, forma: FormaPagamento.PIX });
}

describe('Cliente.proximaVisitaPrevista', () => {
  it('soma a frequência em semanas à última visita', () => {
    expect(fixo({ frequenciaSemanas: 2 }).proximaVisitaPrevista('2026-10-20')).toBe('2026-11-03');
    expect(fixo({ frequenciaSemanas: 4 }).proximaVisitaPrevista('2026-10-20')).toBe('2026-11-17');
  });

  it('atravessa a virada do ano', () => {
    expect(fixo({ frequenciaSemanas: 2 }).proximaVisitaPrevista('2026-12-24')).toBe('2027-01-07');
  });

  it('não prevê visita para cliente avulso', () => {
    expect(avulso().proximaVisitaPrevista('2026-10-20')).toBeNull();
  });
});

describe('Cliente.ultimaVisitaRealizada', () => {
  it('ignora visitas agendadas e canceladas', () => {
    const agendada = new Visita({ id: 'v9', clienteId: 'c1', dataPrevista: '2026-10-30', status: StatusVisita.AGENDADA });
    const cancelada = new Visita({ id: 'v8', clienteId: 'c1', dataPrevista: '2026-10-25', status: StatusVisita.CANCELADA });
    const cliente = fixo({ visitas: [realizada('2026-10-01'), agendada, realizada('2026-10-15'), cancelada] });

    expect(cliente.ultimaVisitaRealizada()?.dataRealizada).toBe('2026-10-15');
  });

  it('é nula quando não há visita realizada', () => {
    expect(fixo().ultimaVisitaRealizada()).toBeNull();
  });
});

describe('Cliente.saldoPendente de um cliente fixo', () => {
  it('cobra a mensalidade de cada mês com visita e sem pagamento', () => {
    const cliente = fixo({
      valorMensal: 300,
      visitas: [realizada('2026-08-10'), realizada('2026-09-07'), realizada('2026-09-21'), realizada('2026-10-05')],
      pagamentos: [pagamento('2026-08-30', 300, '2026-08')],
    });

    expect(cliente.mesesEmAberto('2026-10-25')).toEqual(['2026-09', '2026-10']);
    expect(cliente.saldoPendente('2026-10-25')).toBe(600);
  });

  it('desconta o pagamento parcial de um mês', () => {
    const cliente = fixo({
      valorMensal: 300,
      visitas: [realizada('2026-10-05')],
      pagamentos: [pagamento('2026-10-06', 100, '2026-10')],
    });

    expect(cliente.saldoPendente('2026-10-25')).toBe(200);
  });

  it('não cobra meses de visitas futuras', () => {
    const cliente = fixo({ visitas: [realizada('2026-11-02')] });

    expect(cliente.saldoPendente('2026-10-25')).toBe(0);
  });

  it('é zero sem visitas', () => {
    expect(fixo().saldoPendente('2026-10-25')).toBe(0);
  });
});

describe('Cliente.saldoPendente de um cliente avulso', () => {
  it('é o valor das visitas realizadas menos os pagamentos', () => {
    const cliente = avulso({
      visitas: [realizada('2026-10-01', 150, 'c2'), realizada('2026-10-15', 200, 'c2')],
      pagamentos: [pagamento('2026-10-02', 150, undefined, 'c2')],
    });

    expect(cliente.saldoPendente('2026-10-25')).toBe(200);
  });

  it('não fica negativo quando o cliente pagou adiantado', () => {
    const cliente = avulso({
      visitas: [realizada('2026-10-01', 150, 'c2')],
      pagamentos: [pagamento('2026-10-01', 300, undefined, 'c2')],
    });

    expect(cliente.saldoPendente('2026-10-25')).toBe(0);
  });
});

describe('Cliente.precisaReajuste', () => {
  it('avisa quando a mensalidade completa um ano sem atualização', () => {
    const cliente = fixo({ dataUltimoReajuste: '2025-10-25' });

    expect(cliente.precisaReajuste('2026-10-24')).toBe(false);
    expect(cliente.precisaReajuste('2026-10-25')).toBe(true);
  });

  it('não avisa para avulsos nem sem data de reajuste', () => {
    expect(avulso({ dataUltimoReajuste: '2020-01-01' }).precisaReajuste('2026-10-25')).toBe(false);
    expect(fixo({ dataUltimoReajuste: undefined }).precisaReajuste('2026-10-25')).toBe(false);
  });
});
