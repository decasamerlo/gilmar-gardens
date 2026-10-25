import type { DataISO, MesISO } from './tipos';

// Datas sem hora são tratadas em UTC para que fuso e horário de verão não mudem o dia.
function paraUTC(data: DataISO): Date {
  return new Date(`${data}T00:00:00Z`);
}

function deUTC(data: Date): DataISO {
  return data.toISOString().slice(0, 10);
}

/** A data de hoje no fuso do celular. */
export function hoje(agora: Date = new Date()): DataISO {
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export function somarDias(data: DataISO, dias: number): DataISO {
  const d = paraUTC(data);
  d.setUTCDate(d.getUTCDate() + dias);
  return deUTC(d);
}

export function somarAnos(data: DataISO, anos: number): DataISO {
  const d = paraUTC(data);
  d.setUTCFullYear(d.getUTCFullYear() + anos);
  return deUTC(d);
}

export function diasEntre(de: DataISO, ate: DataISO): number {
  return Math.round((paraUTC(ate).getTime() - paraUTC(de).getTime()) / 86_400_000);
}

export function mesDe(data: DataISO): MesISO {
  return data.slice(0, 7);
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

/** 25/10/2026 */
export function formatarData(data: DataISO): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** sábado, 25/10 */
export function formatarDiaSemana(data: DataISO): string {
  const [, mes, dia] = data.split('-');
  return `${DIAS_SEMANA[paraUTC(data).getUTCDay()]}, ${dia}/${mes}`;
}

/** out/2026 */
export function formatarMes(mes: MesISO): string {
  const [ano, m] = mes.split('-');
  return `${MESES[Number(m) - 1]}/${ano}`;
}

/** Converte 25/10/2026 para 2026-10-25; devolve null se a data não existir. */
export function lerData(texto: string): DataISO | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const data = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return deUTC(paraUTC(data)) === data ? data : null;
}
