import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { textoSync } from '@/components/IndicadorSync';
import { cores, espaco, fonte } from '@/components/tema';
import { Botao, Campo, Cartao, Opcoes, Tela, Texto, Vazio } from '@/components/ui';
import type { SemVisita } from '@/controllers/Agenda';
import type { Cliente } from '@/model/Cliente';
import { formatarData, formatarDiaSemana, hoje } from '@/model/datas';
import { formatarDinheiro } from '@/model/formatos';
import { Usuario } from '@/model/Usuario';
import { useDados } from '@/state/Dados';
import { useSessao } from '@/state/Sessao';

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('pt-BR');
}

/**
 * Lista de clientes com busca por nome ou bairro (RF03). Os ativos também podem ser vistos do que
 * está há mais tempo sem visita ao mais recente, para saber quem precisa ser agendado.
 */
export default function ClientesTela() {
  const { clientes, agenda, sync } = useDados();
  const { email } = useSessao();
  const [busca, setBusca] = useState('');
  const [ativos, setAtivos] = useState(true);
  const [ordem, setOrdem] = useState<'nome' | 'tempo'>('nome');
  const dataHoje = hoje();

  const termo = normalizar(busca.trim());
  const mostrar = (c: Cliente) => c.ativo === ativos && (!termo || normalizar(`${c.nome} ${c.bairro}`).includes(termo));
  const porTempo = ativos && ordem === 'tempo';
  const lista: (Partial<SemVisita> & { cliente: Cliente })[] = porTempo
    ? agenda.tempoSemVisita(dataHoje).filter((s) => mostrar(s.cliente))
    : clientes.filter(mostrar).map((cliente) => ({ cliente }));

  return (
    <Tela>
      <Botao titulo="Novo cliente" icone="account-plus" onPress={() => router.push('/cliente/editar')} />
      <Campo rotulo="Buscar por nome ou bairro" value={busca} onChangeText={setBusca} placeholder="Ex.: Maria ou Trindade" />
      <Opcoes
        rotulo="Mostrar"
        valor={ativos ? 'ativos' : 'inativos'}
        onChange={(v) => setAtivos(v === 'ativos')}
        opcoes={[
          { valor: 'ativos', titulo: 'Ativos' },
          { valor: 'inativos', titulo: 'Inativos' },
        ]}
      />
      {ativos ? (
        <Opcoes
          rotulo="Ordem"
          valor={ordem}
          onChange={setOrdem}
          opcoes={[
            { valor: 'nome', titulo: 'A a Z' },
            { valor: 'tempo', titulo: 'Mais tempo sem visita' },
          ]}
        />
      ) : null}
      <Texto suave>{lista.length} cliente(s)</Texto>
      {lista.length === 0 ? <Vazio>Nenhum cliente encontrado.</Vazio> : null}
      {lista.map(({ cliente: c, ...semVisita }) => {
        const saldo = c.saldoPendente(dataHoje);
        return (
          <Cartao key={c.id} onPress={() => router.push(`/cliente/${c.id}`)}>
            <Texto negrito tamanho={fonte.grande}>
              {c.nome}
            </Texto>
            <Texto suave>
              {c.bairro || 'Sem bairro'} · {c.fixo ? 'Fixo' : 'Avulso'}
            </Texto>
            {porTempo ? <TempoSemVisita cliente={c} {...semVisita} /> : null}
            {saldo > 0 ? (
              <Texto cor={cores.atraso} negrito>
                Deve {formatarDinheiro(saldo)}
              </Texto>
            ) : null}
          </Cartao>
        );
      })}

      <View style={{ marginTop: espaco.g, gap: espaco.p }}>
        <Texto suave tamanho={fonte.pequena}>
          {textoSync(sync)}
        </Texto>
        {email ? (
          <>
            <Texto suave tamanho={fonte.pequena}>
              Conectado como {email}
            </Texto>
            <Botao titulo="Sair da conta" variante="secundario" onPress={() => Usuario.sair()} />
          </>
        ) : null}
      </View>
    </Tela>
  );
}

function TempoSemVisita({ cliente, ultima, dias, agendada }: Partial<SemVisita> & { cliente: Cliente }) {
  // Um fixo passou da frequência dele; um avulso não tem frequência, então nunca fica vermelho.
  const passou = cliente.fixo && dias != null && dias > (cliente.frequenciaSemanas ?? 0) * 7;
  return (
    <>
      {ultima ? (
        <Texto cor={passou ? cores.atraso : cores.texto} negrito={passou}>
          {dias === 0
            ? 'Última visita hoje'
            : `Última visita ${dias === 1 ? 'ontem' : `há ${dias} dias`}, em ${formatarData(ultima)}`}
        </Texto>
      ) : (
        <Texto negrito>Nenhuma visita registrada</Texto>
      )}
      {agendada ? (
        <Texto cor={cores.primariaEscura} negrito>
          Agendada para {formatarDiaSemana(agendada.dataPrevista)}
        </Texto>
      ) : null}
    </>
  );
}
