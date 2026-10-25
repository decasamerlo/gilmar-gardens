import { Tabs } from 'expo-router/js-tabs';

import { IndicadorSync } from '@/components/IndicadorSync';
import { cores } from '@/components/tema';
import { Icone, type NomeIcone } from '@/components/ui';

function icone(nome: NomeIcone) {
  return function IconeAba({ focused }: { focused: boolean }) {
    return <Icone nome={nome} cor={focused ? cores.primariaEscura : cores.textoSuave} tamanho={30} />;
  };
}

export default function Abas() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: cores.primaria },
        headerTintColor: '#fff',
        headerTitleStyle: { fontSize: 22, fontWeight: '700' },
        headerRight: () => <IndicadorSync />,
        // A aba ativa ganha um fundo verde, para se destacar das outras ao sol.
        tabBarActiveTintColor: cores.primariaEscura,
        tabBarInactiveTintColor: cores.textoSuave,
        tabBarActiveBackgroundColor: cores.primariaMedia,
        tabBarItemStyle: { borderRadius: 14, marginHorizontal: 6 },
        tabBarLabelStyle: { fontSize: 15, fontWeight: '700' },
        tabBarStyle: { height: 80, paddingTop: 6, paddingBottom: 10 },
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: cores.fundo },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Agenda', tabBarIcon: icone('calendar-month') }} />
      <Tabs.Screen name="clientes" options={{ title: 'Clientes', tabBarIcon: icone('account-group') }} />
      <Tabs.Screen name="pendencias" options={{ title: 'Pendências', tabBarIcon: icone('cash-clock') }} />
    </Tabs>
  );
}
