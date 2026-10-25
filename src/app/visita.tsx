import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { PREFIXO_PREVISTA } from '@/controllers/Agenda';
import { cores, fonte } from '@/components/tema';
import { Botao, Campo, CampoData, Cartao, Opcoes, Tela, Texto, Vazio } from '@/components/ui';
import { formatarData, hoje } from '@/model/datas';
import { lerValor } from '@/model/formatos';
import { novoId } from '@/model/id';
import { NOME_SERVICO, StatusVisita, TipoServico, type DataISO } from '@/model/tipos';
import { Visita } from '@/model/Visita';
import { useDados } from '@/state/Dados';

/**
 * Registro de visita realizada (RF07) ou agendamento de visita (RF06).
 * Parâmetros: clienteId; visitaId e dataPrevista quando vem da agenda; agendar=1 para agendar.
 */
export default function VisitaTela() {
  const params = useLocalSearchParams<{ clienteId: string; visitaId?: string; dataPrevista?: string; agendar?: string }>();
  const { cliente: buscar, agenda, salvarVisita } = useDados();
  const cliente = buscar(params.clienteId);
  const agendar = params.agendar === '1';
  const gravada =
    params.visitaId && !params.visitaId.startsWith(PREFIXO_PREVISTA)
      ? cliente?.visitas.find((v) => v.id === params.visitaId)
      : undefined;

  const [data, setData] = useState<DataISO>(hoje());
  const [servico, setServico] = useState<TipoServico>(gravada?.servico ?? TipoServico.MANUTENCAO);
  const [valor, setValor] = useState('');
  const [observacoes, setObservacoes] = useState(gravada?.observacoes ?? '');
  const [erro, setErro] = useState('');

  if (!cliente) return <Vazio>Cliente não encontrado.</Vazio>;

  async function salvar() {
    if (!cliente) return;
    const valorNumero = valor.trim() ? lerValor(valor) : undefined;
    if (valorNumero === null) return setErro('Valor inválido (ex.: 150 ou 150,50).');

    let visita: Visita;
    if (agendar) {
      visita = agenda.agendarAvulso(cliente, data);
    } else if (gravada) {
      visita = new Visita({ ...gravada });
      visita.registrarRealizacao(data, cliente.fixo ? undefined : valorNumero);
    } else {
      visita = new Visita({ id: novoId(), clienteId: cliente.id, dataPrevista: params.dataPrevista ?? data });
      visita.registrarRealizacao(data, cliente.fixo ? undefined : valorNumero);
    }
    visita.servico = servico;
    visita.observacoes = observacoes.trim();
    if (agendar) visita.status = StatusVisita.AGENDADA;
    await salvarVisita(visita);
    router.back();
  }

  return (
    <Tela>
      <Stack.Screen options={{ title: agendar ? 'Agendar visita' : 'Registrar visita' }} />
      <Texto negrito tamanho={fonte.grande}>
        {cliente.nome}
      </Texto>
      {params.dataPrevista && !agendar ? <Texto suave>Prevista para {formatarData(params.dataPrevista)}</Texto> : null}
      <CampoData rotulo={agendar ? 'Data da visita' : 'Data em que foi feita'} valor={data} onChange={setData} />
      <Opcoes
        rotulo="Serviço"
        valor={servico}
        onChange={setServico}
        opcoes={[TipoServico.MANUTENCAO, TipoServico.LIMPEZA_TERRENO].map((s) => ({ valor: s, titulo: NOME_SERVICO[s] }))}
      />
      {!cliente.fixo && !agendar ? (
        <Campo rotulo="Valor cobrado (R$)" value={valor} onChangeText={setValor} keyboardType="decimal-pad" placeholder="Ex.: 150" />
      ) : null}
      <Campo
        rotulo="Observações"
        value={observacoes}
        onChangeText={setObservacoes}
        multiline
        placeholder="Ex.: podei a cerca viva, falta adubar"
      />
      {erro ? (
        <Cartao destaque="atraso">
          <Texto cor={cores.atraso} negrito>
            {erro}
          </Texto>
        </Cartao>
      ) : null}
      <Botao titulo={agendar ? 'Agendar' : 'Salvar visita'} icone="content-save" onPress={salvar} />
    </Tela>
  );
}
