import 'expo-sqlite/localStorage/install';

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { textoSync } from '@/components/IndicadorSync';
import { cores, espaco, fonte } from '@/components/tema';
import { Botao, Cartao, Icone, Opcoes, Tela, Texto, Vazio } from '@/components/ui';
import { diasEntre, formatarData, formatarDiaSemana, hoje } from '@/model/datas';
import { NOME_SERVICO, StatusVisita } from '@/model/tipos';
import type { Visita } from '@/model/Visita';
import { useDados } from '@/state/Dados';

// Os bairros recolhidos ficam guardados no celular e continuam escondidos quando o app abre de novo.
const CHAVE_RECOLHIDOS = 'agenda:bairros-recolhidos';

function lerRecolhidos(): string[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_RECOLHIDOS) ?? '[]');
  } catch {
    return [];
  }
}

/** Tela inicial: visitas previstas e atrasadas, agrupadas por bairro (RF05). */
export default function AgendaTela() {
  const { agenda, clientes, carregado, sync } = useDados();
  const [dias, setDias] = useState(7);
  const [recolhidos, setRecolhidos] = useState(lerRecolhidos);
  const dataHoje = hoje();
  const grupos = agenda.agruparPorBairro(agenda.visitasPrevistas(dataHoje, dias));

  function alternar(chave: string) {
    const novos = recolhidos.includes(chave) ? recolhidos.filter((b) => b !== chave) : [...recolhidos, chave];
    setRecolhidos(novos);
    localStorage.setItem(CHAVE_RECOLHIDOS, JSON.stringify(novos));
  }

  return (
    <Tela>
      <Texto negrito tamanho={fonte.grande}>
        Hoje: {formatarDiaSemana(dataHoje)}
      </Texto>
      <Opcoes
        rotulo="Mostrar"
        valor={dias}
        onChange={setDias}
        opcoes={[
          { valor: 7, titulo: '7 dias' },
          { valor: 14, titulo: '14 dias' },
          { valor: 31, titulo: '1 mês' },
        ]}
      />
      {sync.situacao === 'sem-internet' || sync.situacao === 'erro' ? (
        <Texto suave tamanho={fonte.pequena}>
          {textoSync(sync)}
        </Texto>
      ) : null}

      {carregado && clientes.length === 0 ? (
        <Cartao>
          <Texto>Nenhum cliente cadastrado ainda.</Texto>
          <Botao titulo="Cadastrar cliente" icone="account-plus" onPress={() => router.push('/cliente/editar')} />
        </Cartao>
      ) : null}
      {carregado && clientes.length > 0 && grupos.size === 0 ? <Vazio>Nenhuma visita prevista nesse período.</Vazio> : null}

      {grupos.size > 0 ? (
        <Texto suave tamanho={fonte.pequena}>
          Toque no nome do bairro para esconder ou mostrar as visitas dele.
        </Texto>
      ) : null}

      {[...grupos].map(([bairro, visitas]) => {
        const chave = bairro.toLocaleLowerCase('pt-BR');
        const aberto = !recolhidos.includes(chave);
        const atrasadas = visitas.filter((v) => agenda.atrasada(v, dataHoje)).length;
        return (
          <View key={bairro} style={{ gap: espaco.p }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: aberto }}
              onPress={() => alternar(chave)}
              style={({ pressed }) => [estilosAgenda.bairro, pressed && { opacity: 0.7 }]}>
              <Icone nome="map-marker" cor={cores.primariaEscura} />
              <View style={{ flex: 1 }}>
                <Texto negrito tamanho={fonte.grande}>
                  {bairro} ({visitas.length})
                </Texto>
                {!aberto && atrasadas > 0 ? (
                  <Texto cor={cores.atraso} negrito>
                    {atrasadas} atrasada(s)
                  </Texto>
                ) : null}
              </View>
              <Icone nome={aberto ? 'chevron-up' : 'chevron-down'} cor={cores.primariaEscura} tamanho={32} />
            </Pressable>
            {aberto ? visitas.map((v) => <CartaoVisita key={v.id} visita={v} hoje={dataHoje} />) : null}
          </View>
        );
      })}
    </Tela>
  );
}

function CartaoVisita({ visita, hoje: dataHoje }: { visita: Visita; hoje: string }) {
  const { agenda } = useDados();
  const cliente = agenda.cliente(visita.clienteId);
  if (!cliente) return null;
  const atrasada = agenda.atrasada(visita, dataHoje);
  const quando = atrasada
    ? `Atrasada ${diasEntre(visita.dataPrevista, dataHoje)} dia(s) — era ${formatarData(visita.dataPrevista)}`
    : visita.dataPrevista === dataHoje
      ? 'Hoje'
      : formatarDiaSemana(visita.dataPrevista);
  const agendada = visita.status === StatusVisita.AGENDADA && !visita.id.startsWith('prevista:');

  return (
    <Cartao destaque={atrasada ? 'atraso' : undefined} onPress={() => router.push(`/cliente/${cliente.id}`)}>
      <Texto negrito tamanho={fonte.grande}>
        {cliente.nome}
      </Texto>
      <Texto cor={atrasada ? cores.atraso : cores.texto} negrito={atrasada}>
        {quando}
      </Texto>
      <Texto suave>
        {cliente.fixo ? `Fixo, a cada ${cliente.frequenciaSemanas} semanas` : 'Avulso'}
        {agendada ? ` · ${NOME_SERVICO[visita.servico]}` : ''}
      </Texto>
      {cliente.endereco ? <Texto suave>{cliente.endereco}</Texto> : null}
      <Botao
        titulo="Registrar visita"
        icone="check-circle"
        estilo={{ marginTop: espaco.p }}
        onPress={() =>
          router.push({
            pathname: '/visita',
            params: { clienteId: cliente.id, visitaId: visita.id, dataPrevista: visita.dataPrevista },
          })
        }
      />
    </Cartao>
  );
}

const estilosAgenda = StyleSheet.create({
  bairro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaco.p,
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: cores.primariaClara,
    borderWidth: 1,
    borderColor: cores.primariaMedia,
  },
});
