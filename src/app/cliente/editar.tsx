import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { cores, fonte } from '@/components/tema';
import { Botao, Campo, CampoData, Cartao, Opcoes, Tela, Texto, Titulo } from '@/components/ui';
import { Cliente } from '@/model/Cliente';
import { hoje } from '@/model/datas';
import { lerValor, valorParaCampo } from '@/model/formatos';
import { novoId } from '@/model/id';
import { StatusVisita, TipoCliente, TipoServico, type DataISO } from '@/model/tipos';
import { Visita } from '@/model/Visita';
import { useDados } from '@/state/Dados';

/** Cadastro e edição de cliente (RF01, RF02). */
export default function EditarCliente() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { cliente: buscar, salvarCliente, salvarVisita } = useDados();
  const original = id ? buscar(id) : undefined;
  const novo = !original;

  const [nome, setNome] = useState(original?.nome ?? '');
  const [telefone, setTelefone] = useState(original?.telefone ?? '');
  const [endereco, setEndereco] = useState(original?.endereco ?? '');
  const [bairro, setBairro] = useState(original?.bairro ?? '');
  const [tipo, setTipo] = useState<TipoCliente>(original?.tipo ?? TipoCliente.FIXO);
  const [frequencia, setFrequencia] = useState(original?.frequenciaSemanas ?? 2);
  const [valorMensal, setValorMensal] = useState(valorParaCampo(original?.valorMensal));
  const [dataReajuste, setDataReajuste] = useState<DataISO>(original?.dataUltimoReajuste ?? hoje());
  const [mudouDataReajuste, setMudouDataReajuste] = useState(false);
  const [ultimaVisita, setUltimaVisita] = useState<DataISO | undefined>();
  const [tamanhoJardim, setTamanhoJardim] = useState(original?.tamanhoJardim ?? '');
  const [arvores, setArvores] = useState(original?.arvores ?? '');
  const [plantas, setPlantas] = useState(original?.plantas ?? '');
  const [acessoCasa, setAcessoCasa] = useState(original?.acessoCasa ?? '');
  const [animais, setAnimais] = useState(original?.animais ?? '');
  const [ativo, setAtivo] = useState(original?.ativo ?? true);
  const [erro, setErro] = useState('');

  const fixo = tipo === TipoCliente.FIXO;

  async function salvar() {
    const valor = lerValor(valorMensal);
    if (!nome.trim()) return setErro('Preencha o nome.');
    if (fixo && valor == null) return setErro('Preencha o valor mensal (ex.: 300 ou 300,50).');
    if (fixo && !(frequencia > 0)) return setErro('Escolha a frequência das visitas.');

    // Mudou a mensalidade e não mexeu na data: conta como reajuste de hoje.
    const reajustouHoje = !novo && fixo && valor !== original?.valorMensal && !mudouDataReajuste;
    const cliente = new Cliente({
      id: original?.id ?? novoId(),
      nome: nome.trim(),
      telefone: telefone.trim(),
      endereco: endereco.trim(),
      bairro: bairro.trim(),
      tipo,
      frequenciaSemanas: fixo ? frequencia : undefined,
      valorMensal: fixo ? valor! : undefined,
      dataUltimoReajuste: fixo ? (reajustouHoje ? hoje() : dataReajuste) : undefined,
      tamanhoJardim: tamanhoJardim.trim(),
      arvores: arvores.trim(),
      plantas: plantas.trim(),
      acessoCasa: acessoCasa.trim(),
      animais: animais.trim(),
      ativo,
    });
    await salvarCliente(cliente);
    if (novo && ultimaVisita) {
      await salvarVisita(
        new Visita({
          id: novoId(),
          clienteId: cliente.id,
          dataPrevista: ultimaVisita,
          dataRealizada: ultimaVisita,
          servico: TipoServico.MANUTENCAO,
          status: StatusVisita.REALIZADA,
          observacoes: 'Última visita anotada no caderno',
        }),
      );
    }
    if (novo) {
      router.replace(`/cliente/${cliente.id}`);
    } else {
      router.back();
    }
  }

  return (
    <Tela>
      <Stack.Screen options={{ title: novo ? 'Novo cliente' : 'Editar cliente' }} />
      <Campo rotulo="Nome *" value={nome} onChangeText={setNome} autoCapitalize="words" />
      <Campo
        rotulo="Telefone (WhatsApp)"
        value={telefone}
        onChangeText={setTelefone}
        keyboardType="phone-pad"
        placeholder="(48) 99999-9999"
      />
      <Campo rotulo="Endereço" value={endereco} onChangeText={setEndereco} placeholder="Rua e número" />
      <Campo rotulo="Bairro" value={bairro} onChangeText={setBairro} autoCapitalize="words" />
      <Opcoes
        rotulo="Tipo de cliente"
        valor={tipo}
        onChange={setTipo}
        opcoes={[
          { valor: TipoCliente.FIXO, titulo: 'Fixo (mensal)' },
          { valor: TipoCliente.AVULSO, titulo: 'Avulso' },
        ]}
      />

      {fixo ? (
        <>
          <Opcoes
            rotulo="Visita a cada"
            valor={frequencia}
            onChange={setFrequencia}
            opcoes={[
              { valor: 1, titulo: '1 semana' },
              { valor: 2, titulo: '2 semanas' },
              { valor: 3, titulo: '3 semanas' },
              { valor: 4, titulo: '4 semanas' },
            ]}
          />
          <Campo
            rotulo="Valor mensal (R$) *"
            value={valorMensal}
            onChangeText={setValorMensal}
            keyboardType="decimal-pad"
            placeholder="Ex.: 300"
          />
          <CampoData
            rotulo="Desde quando vale esse valor"
            valor={dataReajuste}
            onChange={(d) => {
              setDataReajuste(d);
              setMudouDataReajuste(true);
            }}
          />
          {novo ? (
            <>
              <CampoData rotulo="Data da última visita (do caderno)" valor={ultimaVisita} onChange={setUltimaVisita} />
              <Texto suave tamanho={fonte.pequena}>
                A próxima visita é calculada a partir dela. Sem ela, o cliente aparece na agenda de hoje.
              </Texto>
            </>
          ) : null}
        </>
      ) : null}

      <Titulo>Jardim e casa</Titulo>
      <Campo rotulo="Tamanho do jardim" value={tamanhoJardim} onChangeText={setTamanhoJardim} placeholder="Ex.: grande, 200 m²" />
      <Campo
        rotulo="Árvores (frutíferas ou não)"
        value={arvores}
        onChangeText={setArvores}
        multiline
        placeholder="Ex.: 2 mangueiras, 1 ipê"
      />
      <Campo rotulo="Plantas" value={plantas} onChangeText={setPlantas} multiline placeholder="Inclusive as que não cuidamos" />
      <Campo
        rotulo="Acesso à casa"
        value={acessoCasa}
        onChangeText={setAcessoCasa}
        multiline
        placeholder="Ex.: portão lateral, chave com o vizinho"
      />
      <Campo rotulo="Animais" value={animais} onChangeText={setAnimais} placeholder="Ex.: 2 cachorros, soltos" />

      {!novo ? (
        <Opcoes
          rotulo="Cliente ativo?"
          valor={ativo ? 'sim' : 'nao'}
          onChange={(v) => setAtivo(v === 'sim')}
          opcoes={[
            { valor: 'sim', titulo: 'Sim' },
            { valor: 'nao', titulo: 'Não (deixou de ser atendido)' },
          ]}
        />
      ) : null}

      {erro ? (
        <Cartao destaque="atraso">
          <Texto cor={cores.atraso} negrito>
            {erro}
          </Texto>
        </Cartao>
      ) : null}
      <Botao titulo="Salvar" icone="content-save" onPress={salvar} />
    </Tela>
  );
}
