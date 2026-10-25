import { router } from 'expo-router';
import { Linking, View } from 'react-native';

import { linkWhatsApp } from '@/controllers/atalhos';
import { cores, espaco, fonte } from '@/components/tema';
import { Botao, Cartao, estilos, Tela, Texto, Titulo, Vazio } from '@/components/ui';
import { formatarData, formatarMes, hoje } from '@/model/datas';
import { formatarDinheiro } from '@/model/formatos';
import { useDados } from '@/state/Dados';

/** Clientes com saldo pendente (RF09) e mensalidades a reajustar (RF14). */
export default function PendenciasTela() {
  const { clientes } = useDados();
  const dataHoje = hoje();

  const devedores = clientes
    .filter((c) => c.ativo || c.saldoPendente(dataHoje) > 0)
    .map((c) => ({ cliente: c, saldo: c.saldoPendente(dataHoje) }))
    .filter((d) => d.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo);
  const total = devedores.reduce((soma, d) => soma + d.saldo, 0);
  const reajustes = clientes.filter((c) => c.ativo && c.precisaReajuste(dataHoje));

  return (
    <Tela>
      <Titulo>A receber</Titulo>
      <Cartao>
        <Texto suave>Total pendente</Texto>
        <Texto negrito tamanho={fonte.titulo} cor={total > 0 ? cores.atraso : cores.primariaEscura}>
          {formatarDinheiro(total)}
        </Texto>
      </Cartao>
      {devedores.length === 0 ? <Vazio>Nenhum pagamento pendente.</Vazio> : null}
      {devedores.map(({ cliente, saldo }) => {
        const meses = cliente.mesesEmAberto(dataHoje);
        const whatsapp = linkWhatsApp(cliente.telefone);
        return (
          <Cartao key={cliente.id} destaque="atraso" onPress={() => router.push(`/cliente/${cliente.id}`)}>
            <Texto negrito tamanho={fonte.grande}>
              {cliente.nome}
            </Texto>
            <Texto negrito cor={cores.atraso}>
              {formatarDinheiro(saldo)}
            </Texto>
            <Texto suave>
              {cliente.fixo ? `Mensalidade de ${meses.map(formatarMes).join(', ')}` : 'Visitas avulsas não pagas'}
            </Texto>
            <View style={[estilos.linha, { marginTop: espaco.p }]}>
              <Botao
                titulo="Receber"
                icone="cash-plus"
                estilo={{ flex: 1 }}
                onPress={() => router.push({ pathname: '/pagamento', params: { clienteId: cliente.id } })}
              />
              {whatsapp ? (
                <Botao
                  titulo="WhatsApp"
                  icone="whatsapp"
                  variante="whatsapp"
                  estilo={{ flex: 1 }}
                  onPress={() => Linking.openURL(whatsapp)}
                />
              ) : null}
            </View>
          </Cartao>
        );
      })}

      <View style={{ height: espaco.m }} />
      <Titulo>Mensalidades a reajustar</Titulo>
      {reajustes.length === 0 ? <Vazio>Nenhuma mensalidade com mais de um ano sem reajuste.</Vazio> : null}
      {reajustes.map((c) => (
        <Cartao key={c.id} destaque="aviso">
          <Texto negrito tamanho={fonte.grande}>
            {c.nome}
          </Texto>
          <Texto>
            {formatarDinheiro(c.valorMensal ?? 0)} desde {formatarData(c.dataUltimoReajuste!)}
          </Texto>
          <Botao
            titulo="Atualizar valor"
            icone="pencil"
            variante="secundario"
            onPress={() => router.push({ pathname: '/cliente/editar', params: { id: c.id } })}
          />
        </Cartao>
      ))}
    </Tela>
  );
}
