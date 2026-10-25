/** Lê um valor em reais digitado como 300, 300,50 ou R$ 1.250,00; devolve null se não for válido. */
export function lerValor(texto: string): number | null {
  let limpo = texto.replace(/R\$|\s/g, '');
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(limpo)) return null;
  return Number(limpo);
}

export function formatarDinheiro(valor: number): string {
  const [inteiro, centavos] = valor.toFixed(2).split('.');
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${centavos}`;
}

/** Valor para preencher um campo de edição: 300 vira "300", 300.5 vira "300,50". */
export function valorParaCampo(valor: number | undefined): string {
  if (valor == null) return '';
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(2).replace('.', ',');
}
