import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Alert, Linking, Platform, View } from 'react-native';

import { linkMapa, linkTelefone, linkWhatsApp } from '@/controllers/atalhos';
import { cores, espaco, fonte } from '@/components/tema';
import { Botao, Cartao, estilos, Tela, Texto, Titulo, Vazio } from '@/components/ui';
import { formatarData, formatarMes, hoje } from '@/model/datas';
import { formatarDinheiro } from '@/model/formatos';
import type { Pagamento } from '@/model/Pagamento';
import { NOME_FORMA_PAGAMENTO, NOME_SERVICO, StatusVisita } from '@/model/tipos';
import type { Visita } from '@/model/Visita';
import { useDados } from '@/state/Dados';

function confirmar(mensagem: string, acao: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(mensagem)) acao();
    return;
  }
  Alert.alert('Confirmar', mensagem, [
    { text: 'Não', style: 'cancel' },
    { text: 'Sim', style: 'destructive', onPress: acao },
  ]);
}

/** Dados do jardim e da casa, histórico, saldo e atalhos de um cliente. */
export default function ClienteDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { cliente: buscar, excluirVisita, excluirPagamento, salvarVisita } = useDados();
  const cliente = buscar(id);
  const dataHoje = hoje();

  if (!cliente) return <Vazio>Cliente não encontrado.</Vazio>;

  const saldo = cliente.saldoPendente(dataHoje);
  const meses = cliente.mesesEmAberto(dataHoje);
  const ultima = cliente.ultimaVisitaRealizada();
  const proxima = ultima ? cliente.proximaVisitaPrevista(ultima.dataRealizada!) : null;
  const agendadas = cliente.visitas
    .filter((v) => v.status === StatusVisita.AGENDADA)
    .sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
  const realizadas = cliente.visitas
    .filter((v) => v.status === StatusVisita.REALIZADA)
    .sort((a, b) => b.dataRealizada!.localeCompare(a.dataRealizada!));
  const pagamentos = [...cliente.pagamentos].sort((a, b) => b.data.localeCompare(a.data));
  const whatsapp = linkWhatsApp(cliente.telefone);
  const mapa = linkMapa(cliente.endereco, cliente.bairro, Platform.OS);
  const telefone = linkTelefone(cliente.telefone);

  const registrarVisita = (visita?: Visita) =>
    router.push({
      pathname: '/visita',
      params: { clienteId: cliente.id, ...(visita ? { visitaId: visita.id, dataPrevista: visita.dataPrevista } : {}) },
    });

  return (
    <Tela>
      <Stack.Screen options={{ title: cliente.nome }} />
      <Titulo>{cliente.nome}</Titulo>
      <Texto suave>
        {cliente.fixo
          ? `Cliente fixo, a cada ${cliente.frequenciaSemanas} semanas, ${formatarDinheiro(cliente.valorMensal ?? 0)} por mês`
          : 'Cliente avulso, paga por visita'}
      </Texto>
      {!cliente.ativo ? (
        <Cartao destaque="aviso">
          <Texto negrito cor={cores.aviso}>
            Cliente inativo: não aparece na agenda.
          </Texto>
        </Cartao>
      ) : null}

      <View style={estilos.linha}>
        {whatsapp ? (
          <Botao titulo="WhatsApp" icone="whatsapp" variante="whatsapp" estilo={{ flex: 1 }} onPress={() => Linking.openURL(whatsapp)} />
        ) : null}
        {telefone ? (
          <Botao titulo="Ligar" icone="phone" variante="secundario" estilo={{ flex: 1 }} onPress={() => Linking.openURL(telefone)} />
        ) : null}
      </View>
      {mapa ? <Botao titulo="Abrir no mapa" icone="map-marker" variante="secundario" onPress={() => Linking.openURL(mapa)} /> : null}

      <Cartao destaque={saldo > 0 ? 'atraso' : undefined}>
        <Texto suave>Saldo pendente</Texto>
        <Texto negrito tamanho={fonte.titulo} cor={saldo > 0 ? cores.atraso : cores.primariaEscura}>
          {formatarDinheiro(saldo)}
        </Texto>
        {meses.length ? <Texto>Mensalidade de {meses.map(formatarMes).join(', ')}</Texto> : null}
        {cliente.precisaReajuste(dataHoje) ? (
          <Texto negrito cor={cores.aviso}>
            Mensalidade sem reajuste desde {formatarData(cliente.dataUltimoReajuste!)}
          </Texto>
        ) : null}
        <Botao
          titulo="Registrar pagamento"
          icone="cash-plus"
          onPress={() => router.push({ pathname: '/pagamento', params: { clienteId: cliente.id } })}
        />
      </Cartao>

      <Cartao>
        <Texto suave>Visitas</Texto>
        {cliente.fixo ? (
          <Texto>
            {ultima ? `Última: ${formatarData(ultima.dataRealizada!)}` : 'Nenhuma visita registrada'}
            {proxima ? `\nPróxima prevista: ${formatarData(proxima)}` : ''}
          </Texto>
        ) : null}
        {agendadas.map((v) => (
          <View key={v.id} style={{ gap: espaco.p, marginTop: espaco.p }}>
            <Texto negrito>
              Agendada: {formatarData(v.dataPrevista)} · {NOME_SERVICO[v.servico]}
            </Texto>
            <View style={estilos.linha}>
              <Botao titulo="Registrar" icone="check-circle" estilo={{ flex: 1 }} onPress={() => registrarVisita(v)} />
              <Botao
                titulo="Cancelar"
                variante="perigo"
                estilo={{ flex: 1 }}
                onPress={() =>
                  confirmar('Cancelar esta visita agendada?', () => {
                    v.cancelar();
                    salvarVisita(v);
                  })
                }
              />
            </View>
          </View>
        ))}
        {agendadas.length === 0 ? (
          <Botao titulo="Registrar visita" icone="check-circle" onPress={() => registrarVisita()} />
        ) : null}
        <Botao
          titulo="Agendar visita"
          icone="calendar-plus"
          variante="secundario"
          onPress={() => router.push({ pathname: '/visita', params: { clienteId: cliente.id, agendar: '1' } })}
        />
      </Cartao>

      <Cartao>
        <Texto suave>Cadastro</Texto>
        <Info rotulo="Telefone" valor={cliente.telefone} />
        <Info rotulo="Endereço" valor={cliente.endereco} />
        <Info rotulo="Bairro" valor={cliente.bairro} />
        {cliente.fixo && cliente.dataUltimoReajuste ? (
          <Info rotulo="Último reajuste" valor={formatarData(cliente.dataUltimoReajuste)} />
        ) : null}
        <Info rotulo="Tamanho do jardim" valor={cliente.tamanhoJardim} />
        <Info rotulo="Árvores" valor={cliente.arvores} />
        <Info rotulo="Plantas" valor={cliente.plantas} />
        <Info rotulo="Acesso à casa" valor={cliente.acessoCasa} />
        <Info rotulo="Animais" valor={cliente.animais} />
        <Botao
          titulo="Editar cadastro"
          icone="pencil"
          variante="secundario"
          onPress={() => router.push({ pathname: '/cliente/editar', params: { id: cliente.id } })}
        />
      </Cartao>

      <Titulo>Histórico</Titulo>
      <Texto negrito>Visitas realizadas</Texto>
      {realizadas.length === 0 ? <Texto suave>Nenhuma.</Texto> : null}
      {realizadas.map((v) => (
        <ItemHistorico
          key={v.id}
          titulo={`${formatarData(v.dataRealizada!)} · ${NOME_SERVICO[v.servico]}${v.valor ? ` · ${formatarDinheiro(v.valor)}` : ''}`}
          detalhe={v.observacoes}
          onExcluir={() => confirmar('Excluir esta visita?', () => excluirVisita(v))}
        />
      ))}
      <Texto negrito>Pagamentos</Texto>
      {pagamentos.length === 0 ? <Texto suave>Nenhum.</Texto> : null}
      {pagamentos.map((p) => (
        <ItemHistorico
          key={p.id}
          titulo={tituloPagamento(p)}
          detalhe={p.observacoes}
          onExcluir={() => confirmar('Excluir este pagamento?', () => excluirPagamento(p))}
        />
      ))}
    </Tela>
  );
}

function tituloPagamento(p: Pagamento): string {
  const ref = p.referencia ? ` · ref. ${formatarMes(p.referencia)}` : '';
  return `${formatarData(p.data)} · ${formatarDinheiro(p.valor)} · ${NOME_FORMA_PAGAMENTO[p.forma]}${ref}`;
}

function Info({ rotulo, valor }: { rotulo: string; valor: string }) {
  if (!valor) return null;
  return (
    <Texto>
      <Texto negrito>{rotulo}: </Texto>
      {valor}
    </Texto>
  );
}

function ItemHistorico({ titulo, detalhe, onExcluir }: { titulo: string; detalhe: string; onExcluir: () => void }) {
  return (
    <Cartao>
      <Texto>{titulo}</Texto>
      {detalhe ? <Texto suave>{detalhe}</Texto> : null}
      <Botao titulo="Excluir" variante="perigo" icone="delete" estilo={{ minHeight: 44, alignSelf: 'flex-start' }} onPress={onExcluir} />
    </Cartao>
  );
}
