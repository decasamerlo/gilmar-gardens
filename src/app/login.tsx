import { useState } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cores, espaco } from '@/components/tema';
import { Botao, Campo, Icone, Tela, Texto, Titulo } from '@/components/ui';
import { Usuario } from '@/model/Usuario';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState('');

  async function entrar() {
    setErro('');
    setEntrando(true);
    try {
      const ok = await Usuario.entrar(email, senha);
      if (!ok) setErro('E-mail ou senha incorretos.');
    } catch {
      setErro('Sem internet. O primeiro acesso precisa de conexão.');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo }}>
      <Tela>
        <View style={{ alignItems: 'center', gap: espaco.p, marginTop: espaco.g * 2, marginBottom: espaco.g }}>
          <Icone nome="sprout" cor={cores.primaria} tamanho={72} />
          <Titulo>GilmarGardens</Titulo>
          <Texto suave>Agenda e pagamentos da Gilmar Jardins</Texto>
        </View>
        <Campo
          rotulo="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        <Campo rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry autoComplete="password" />
        {erro ? <Texto cor={cores.atraso}>{erro}</Texto> : null}
        <Botao titulo={entrando ? 'Entrando…' : 'Entrar'} onPress={entrar} desabilitado={entrando || !email || !senha} />
      </Tela>
    </SafeAreaView>
  );
}
