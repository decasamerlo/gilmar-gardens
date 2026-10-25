import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { cores } from '@/components/tema';
import { migrarBanco, NOME_BANCO } from '@/data/banco';
import { DadosProvider } from '@/state/Dados';
import { SessaoProvider, useSessao } from '@/state/Sessao';

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <SQLiteProvider databaseName={NOME_BANCO} onInit={migrarBanco}>
        <SessaoProvider>
          <DadosProvider>
            <StatusBar style="light" />
            <Navegacao />
          </DadosProvider>
        </SessaoProvider>
      </SQLiteProvider>
    </KeyboardProvider>
  );
}

function Navegacao() {
  const { carregando, logado } = useSessao();
  if (carregando) return null;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: cores.primaria },
        headerTintColor: '#fff',
        headerTitleStyle: { fontSize: 22, fontWeight: '700' },
        contentStyle: { backgroundColor: cores.fundo },
      }}>
      <Stack.Protected guard={!logado}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={logado}>
        <Stack.Screen name="(abas)" options={{ headerShown: false }} />
        <Stack.Screen name="cliente/[id]" options={{ title: 'Cliente' }} />
        <Stack.Screen name="cliente/editar" options={{ title: 'Cadastro do cliente' }} />
        <Stack.Screen name="visita" options={{ title: 'Visita' }} />
        <Stack.Screen name="pagamento" options={{ title: 'Pagamento' }} />
      </Stack.Protected>
    </Stack>
  );
}
