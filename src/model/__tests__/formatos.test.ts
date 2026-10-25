import { formatarDinheiro, lerValor } from '../formatos';

describe('lerValor', () => {
  it.each([
    ['300', 300],
    ['300,50', 300.5],
    ['R$ 1.250,00', 1250],
    [' 80 ', 80],
    ['1250.5', 1250.5],
  ])('lê %s como %d', (texto, valor) => {
    expect(lerValor(texto)).toBe(valor);
  });

  it.each(['', 'abc', '-10'])('recusa %p', (texto) => {
    expect(lerValor(texto)).toBeNull();
  });
});

describe('formatarDinheiro', () => {
  it('usa vírgula nos centavos e ponto nos milhares', () => {
    expect(formatarDinheiro(1250.5)).toBe('R$ 1.250,50');
    expect(formatarDinheiro(80)).toBe('R$ 80,00');
  });
});
