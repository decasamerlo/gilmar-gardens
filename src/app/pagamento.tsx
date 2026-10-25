import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { cores, fonte } from '@/components/tema';
import { Botao, Campo, CampoData, Cartao, estilos, Opcoes, Tela, Texto, Vazio } from '@/components/ui';
import { formatarMes, hoje, mesDe } from '@/model/datas';
import { formatarDinheiro, lerValor, valorParaCampo } from '@/model/formatos';
import { novoId } from '@/model/id';
import { Pagamento } from '@/model/Pagamento';
import { FormaPagamento, NOME_FORMA_PAGAMENTO, type DataISO, type MesISO } from '@/model/tipos';
import { useDados } from '@/state/Dados';

function somarMeses(mes: MesISO, n: number): MesISO {
  const [ano, m] = mes.split('-').map(Number);
  const total = ano * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`;
}

/** Registro de pagamento recebido (RF08). */
export default function PagamentoTela() {
  const { clienteId } = useLocalSearchParams<{ clienteId: string }>();
  const { cliente: buscar, salvarPagamento } = useDados();
  const cliente = buscar(clienteId);
  const dataHoje = hoje();
  const saldo = cliente?.saldoPendente(dataHoje) ?? 0;
  const emAberto = cliente?.mesesEmAberto(dataHoje) ?? [];

  const [data, setData] = useState<DataISO>(dataHoje);
  const [referencia, setReferencia] = useState<MesISO>(emAberto[0] ?? mesDe(dataHoje));
  const [valor, setValor] = useState(
    valorParaCampo(cliente?.fixo ? cliente.valorMensal : saldo > 0 ? saldo : undefined),
  );
  const [forma, setForma] = useState<FormaPagamento>(FormaPagamento.PIX);
  const [observacoes, setObservacoes] = useState('');
  const [erro, setErro] = useState('');

  if (!cliente) return <Vazio>Cliente não encontrado.</Vazio>;

  async function salvar() {
    if (!cliente) return;
    const numero = lerValor(valor);
    if (!numero) return setErro('Preencha o valor (ex.: 300 ou 300,50).');
    await salvarPagamento(
      new Pagamento({
        id: novoId(),
        clienteId: cliente.id,
        data,
        referencia: cliente.fixo ? referencia : undefined,
        valor: numero,
        forma,
        observacoes: observacoes.trim(),
      }),
    );
    router.back();
  }

  return (
    <Tela>
      <Stack.Screen options={{ title: 'Registrar pagamento' }} />
      <Texto negrito tamanho={fonte.grande}>
        {cliente.nome}
      </Texto>
      <Texto suave>Saldo pendente: {formatarDinheiro(saldo)}</Texto>
      <Campo rotulo="Valor recebido (R$)" value={valor} onChangeText={setValor} keyboardType="decimal-pad" />
      {cliente.fixo ? (
        <View style={{ gap: 6 }}>
          <Texto negrito>Mensalidade de qual mês</Texto>
          <View style={estilos.linha}>
            <Botao titulo="◀" variante="secundario" estilo={{ width: 64 }} onPress={() => setReferencia(somarMeses(referencia, -1))} />
            <Texto negrito tamanho={fonte.grande}>
              {formatarMes(referencia)}
            </Texto>
            <Botao titulo="▶" variante="secundario" estilo={{ width: 64 }} onPress={() => setReferencia(somarMeses(referencia, 1))} />
          </View>
          {emAberto.length ? (
            <Texto suave tamanho={fonte.pequena}>
              Em aberto: {emAberto.map(formatarMes).join(', ')}
            </Texto>
          ) : null}
        </View>
      ) : null}
      <Opcoes
        rotulo="Forma de pagamento"
        valor={forma}
        onChange={setForma}
        opcoes={[FormaPagamento.PIX, FormaPagamento.DINHEIRO, FormaPagamento.TRANSFERENCIA].map((f) => ({
          valor: f,
          titulo: NOME_FORMA_PAGAMENTO[f],
        }))}
      />
      <CampoData rotulo="Data do pagamento" valor={data} onChange={setData} />
      <Campo rotulo="Observações" value={observacoes} onChangeText={setObservacoes} multiline />
      {erro ? (
        <Cartao destaque="atraso">
          <Texto cor={cores.atraso} negrito>
            {erro}
          </Texto>
        </Cartao>
      ) : null}
      <Botao titulo="Salvar pagamento" icone="content-save" onPress={salvar} />
    </Tela>
  );
}
