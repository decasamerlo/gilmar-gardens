// Importa clientes de uma planilha CSV para o Supabase; os celulares recebem na próxima sincronização.
//
// Uso (na raiz do projeto, com o .env do Supabase):
//   GG_EMAIL=... GG_SENHA=... node scripts/importar-clientes.mjs clientes.csv            # só confere
//   GG_EMAIL=... GG_SENHA=... node scripts/importar-clientes.mjs clientes.csv --enviar   # envia
//
// Colunas: as de scripts/modelo-clientes.csv. Datas em DD/MM/AAAA, valores como 300 ou 300,50.
// Clientes com o mesmo nome de um já cadastrado são pulados, então dá para rodar de novo.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

const [arquivo, ...opcoes] = process.argv.slice(2);
const enviar = opcoes.includes('--enviar');
if (!arquivo) {
  console.error('Uso: node scripts/importar-clientes.mjs clientes.csv [--enviar]');
  process.exit(1);
}

/** Lê CSV separado por vírgula ou ponto e vírgula, com campos entre aspas. */
function lerCsv(texto) {
  const primeira = texto.split(/\r?\n/, 1)[0];
  const sep = (primeira.match(/;/g) ?? []).length > (primeira.match(/,/g) ?? []).length ? ';' : ',';
  const linhas = [];
  let campo = '';
  let linha = [];
  let aspas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') {
        aspas = false;
      } else {
        campo += c;
      }
    } else if (c === '"') {
      aspas = true;
    } else if (c === sep) {
      linha.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      linha.push(campo);
      linhas.push(linha);
      linha = [];
      campo = '';
    } else {
      campo += c;
    }
  }
  if (campo || linha.length) {
    linha.push(campo);
    linhas.push(linha);
  }
  return linhas.filter((l) => l.some((v) => v.trim()));
}

function lerData(texto) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(texto.trim());
  if (!m) return null;
  const data = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return new Date(`${data}T00:00:00Z`).toISOString().slice(0, 10) === data ? data : null;
}

function lerValor(texto) {
  let limpo = texto.replace(/R\$|\s/g, '');
  if (limpo.includes(',')) limpo = limpo.replace(/\./g, '').replace(',', '.');
  return /^\d+(\.\d+)?$/.test(limpo) ? Number(limpo) : null;
}

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase();
}

const hoje = new Date().toLocaleDateString('sv-SE');
const [cabecalho, ...dados] = lerCsv(readFileSync(arquivo, 'utf8'));
const col = Object.fromEntries(cabecalho.map((nome, i) => [normalizar(nome), i]));
const valorDe = (linha, nome) => (linha[col[nome]] ?? '').trim();

const clientes = [];
const visitas = [];
const erros = [];
dados.forEach((linha, i) => {
  const n = i + 2; // número da linha na planilha, contando o cabeçalho
  const nome = valorDe(linha, 'nome');
  if (!nome) return erros.push(`linha ${n}: sem nome`);
  const avulso = normalizar(valorDe(linha, 'tipo')).startsWith('avulso');
  const valor = lerValor(valorDe(linha, 'valor_mensal'));
  if (!avulso && valor == null) return erros.push(`linha ${n} (${nome}): fixo sem valor mensal válido`);
  const semanas = Number(valorDe(linha, 'visita_a_cada_semanas') || 2);
  if (!avulso && !(semanas > 0)) return erros.push(`linha ${n} (${nome}): visita_a_cada_semanas inválido`);
  const textoDesde = valorDe(linha, 'valor_desde');
  const desde = textoDesde ? lerData(textoDesde) : hoje;
  if (!avulso && !desde) return erros.push(`linha ${n} (${nome}): valor_desde inválido (use DD/MM/AAAA)`);
  const textoUltima = valorDe(linha, 'ultima_visita');
  const ultima = textoUltima ? lerData(textoUltima) : null;
  if (textoUltima && !ultima) return erros.push(`linha ${n} (${nome}): ultima_visita inválida (use DD/MM/AAAA)`);

  const agora = new Date().toISOString();
  const id = randomUUID();
  clientes.push({
    id,
    nome,
    telefone: valorDe(linha, 'telefone'),
    endereco: valorDe(linha, 'endereco'),
    bairro: valorDe(linha, 'bairro'),
    tipo: avulso ? 'AVULSO' : 'FIXO',
    frequencia_semanas: avulso ? null : semanas,
    valor_mensal: avulso ? null : valor,
    data_ultimo_reajuste: avulso ? null : desde,
    tamanho_jardim: valorDe(linha, 'tamanho_jardim'),
    arvores: valorDe(linha, 'arvores'),
    plantas: valorDe(linha, 'plantas'),
    acesso_casa: valorDe(linha, 'acesso_casa'),
    animais: valorDe(linha, 'animais'),
    ativo: true,
    atualizado_em: agora,
    excluido: false,
  });
  if (ultima) {
    visitas.push({
      id: randomUUID(),
      cliente_id: id,
      data_prevista: ultima,
      data_realizada: ultima,
      servico: 'MANUTENCAO',
      valor: null,
      observacoes: 'Última visita anotada no caderno',
      status: 'REALIZADA',
      atualizado_em: agora,
      excluido: false,
    });
  }
});

if (erros.length) {
  console.error(`Corrija ${erros.length} linha(s) e rode de novo; nada foi enviado:\n  ${erros.join('\n  ')}`);
  process.exit(1);
}

process.loadEnvFile('.env');
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
const { error: erroLogin } = await supabase.auth.signInWithPassword({
  email: process.env.GG_EMAIL ?? '',
  password: process.env.GG_SENHA ?? '',
});
if (erroLogin) {
  console.error(`Login recusado (${erroLogin.message}). Confira GG_EMAIL e GG_SENHA.`);
  process.exit(1);
}

const { data: existentes, error: erroLista } = await supabase.from('clientes').select('nome').eq('excluido', false);
if (erroLista) throw erroLista;
const jaCadastrados = new Set(existentes.map((c) => normalizar(c.nome)));
const novos = clientes.filter((c) => !jaCadastrados.has(normalizar(c.nome)));
const idsNovos = new Set(novos.map((c) => c.id));
const visitasNovas = visitas.filter((v) => idsNovos.has(v.cliente_id));

for (const c of clientes) {
  const marca = idsNovos.has(c.id) ? '+' : '= (já cadastrado, pulado)';
  const detalhe = c.tipo === 'FIXO' ? `fixo, a cada ${c.frequencia_semanas} sem., R$ ${c.valor_mensal}` : 'avulso';
  console.log(`${marca} ${c.nome} · ${c.bairro || 'sem bairro'} · ${detalhe}`);
}
console.log(`\n${novos.length} cliente(s) novo(s), ${visitasNovas.length} última(s) visita(s); ${clientes.length - novos.length} pulado(s).`);

if (!enviar) {
  console.log('Só conferência. Para enviar, rode de novo com --enviar.');
  process.exit(0);
}
if (novos.length) {
  const { error } = await supabase.from('clientes').insert(novos);
  if (error) throw new Error(`Falha ao enviar clientes: ${error.message}`);
}
if (visitasNovas.length) {
  const { error } = await supabase.from('visitas').insert(visitasNovas);
  if (error) throw new Error(`Falha ao enviar visitas: ${error.message}`);
}
console.log('Enviado. Nos celulares, toque na nuvem para receber agora.');
