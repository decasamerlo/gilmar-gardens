import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { type ComponentProps, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { formatarData, hoje, lerData } from '@/model/datas';
import type { DataISO } from '@/model/tipos';

import { cores, espaco, fonte } from './tema';

export type NomeIcone = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Tela({ children }: { children: ReactNode }) {
  // Ao abrir o teclado, rola a tela até o campo tocado ficar visível acima dele.
  return (
    <KeyboardAwareScrollView
      style={{ flex: 1, backgroundColor: cores.fundo }}
      contentContainerStyle={estilos.conteudo}
      bottomOffset={96}
      keyboardShouldPersistTaps="handled">
      {children}
    </KeyboardAwareScrollView>
  );
}

export function Titulo({ children }: { children: ReactNode }) {
  return <Text style={estilos.titulo}>{children}</Text>;
}

export function Texto({
  children,
  suave,
  negrito,
  cor,
  tamanho,
}: {
  children: ReactNode;
  suave?: boolean;
  negrito?: boolean;
  cor?: string;
  tamanho?: number;
}) {
  return (
    <Text
      style={[
        estilos.texto,
        suave && { color: cores.textoSuave },
        negrito && { fontWeight: '700' },
        cor ? { color: cor } : null,
        tamanho ? { fontSize: tamanho } : null,
      ]}>
      {children}
    </Text>
  );
}

export function Icone({ nome, cor = cores.texto, tamanho = 24 }: { nome: NomeIcone; cor?: string; tamanho?: number }) {
  return <MaterialCommunityIcons name={nome} color={cor} size={tamanho} />;
}

type Variante = 'primario' | 'secundario' | 'perigo' | 'whatsapp';

export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  icone,
  desabilitado,
  estilo,
}: {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  icone?: NomeIcone;
  desabilitado?: boolean;
  estilo?: StyleProp<ViewStyle>;
}) {
  const fundo = {
    primario: cores.primaria,
    secundario: cores.cartao,
    perigo: cores.cartao,
    whatsapp: cores.whatsapp,
  }[variante];
  const corTexto = { primario: '#fff', secundario: cores.primariaEscura, perigo: cores.atraso, whatsapp: '#fff' }[variante];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={desabilitado}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.botao,
        { backgroundColor: fundo, opacity: desabilitado ? 0.5 : pressed ? 0.75 : 1 },
        variante !== 'primario' && variante !== 'whatsapp' && { borderWidth: 2, borderColor: corTexto },
        estilo,
      ]}>
      {icone && <Icone nome={icone} cor={corTexto} tamanho={26} />}
      <Text style={[estilos.botaoTexto, { color: corTexto }]}>{titulo}</Text>
    </Pressable>
  );
}

export function Cartao({
  children,
  onPress,
  destaque,
}: {
  children: ReactNode;
  onPress?: () => void;
  destaque?: 'atraso' | 'aviso';
}) {
  const estilo = [
    estilos.cartao,
    destaque === 'atraso' && { borderLeftColor: cores.atraso, borderLeftWidth: 6 },
    destaque === 'aviso' && { borderLeftColor: cores.aviso, borderLeftWidth: 6 },
  ];
  if (!onPress) return <View style={estilo}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [estilo, pressed && { opacity: 0.7 }]}>
      {children}
    </Pressable>
  );
}

export function Campo({
  rotulo,
  dica,
  ...props
}: TextInputProps & { rotulo: string; dica?: string }) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor="#8A9086"
        {...props}
        style={[estilos.entrada, props.multiline && { minHeight: 90, textAlignVertical: 'top' }]}
      />
      {dica ? <Texto suave tamanho={fonte.pequena}>{dica}</Texto> : null}
    </View>
  );
}

export function Opcoes<T extends string | number>({
  rotulo,
  opcoes,
  valor,
  onChange,
}: {
  rotulo: string;
  opcoes: { valor: T; titulo: string }[];
  valor: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <View style={estilos.opcoes}>
        {opcoes.map((o) => {
          const ativo = o.valor === valor;
          return (
            <Pressable
              key={String(o.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              onPress={() => onChange(o.valor)}
              style={[estilos.opcao, ativo && estilos.opcaoAtiva]}>
              <Text style={[estilos.opcaoTexto, ativo && { color: '#fff' }]}>{o.titulo}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Escolhe uma data: no Android abre o calendário do celular; na web, digita DD/MM/AAAA. */
export function CampoData({
  rotulo,
  valor,
  onChange,
}: {
  rotulo: string;
  valor: DataISO | undefined;
  onChange: (d: DataISO) => void;
}) {
  if (Platform.OS === 'web') {
    return (
      <Campo
        rotulo={rotulo}
        defaultValue={valor ? formatarData(valor) : ''}
        placeholder="DD/MM/AAAA"
        onChangeText={(t) => {
          const d = lerData(t);
          if (d) onChange(d);
        }}
      />
    );
  }
  const abrir = () =>
    DateTimePickerAndroid.open({
      value: valor ? new Date(`${valor}T12:00:00`) : new Date(),
      mode: 'date',
      onValueChange: (_evento, data) => {
        if (data) onChange(hoje(data));
      },
    });
  return (
    <View style={estilos.campo}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Pressable onPress={abrir} style={[estilos.entrada, estilos.data]}>
        <Icone nome="calendar" cor={cores.primariaEscura} />
        <Text style={estilos.texto}>
          {valor ? formatarData(valor) : 'Escolher data'}
          {valor === hoje() ? ' (hoje)' : ''}
        </Text>
      </Pressable>
    </View>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return (
    <View style={{ padding: espaco.g, alignItems: 'center' }}>
      <Texto suave>{children}</Texto>
    </View>
  );
}

export const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: cores.fundo },
  conteudo: { padding: espaco.m, gap: espaco.m, paddingBottom: 48 },
  titulo: { fontSize: fonte.titulo, fontWeight: '700', color: cores.texto },
  texto: { fontSize: fonte.normal, color: cores.texto },
  botao: {
    minHeight: 56,
    borderRadius: 12,
    paddingHorizontal: espaco.m,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaco.p,
  },
  botaoTexto: { fontSize: fonte.grande - 2, fontWeight: '700' },
  cartao: {
    backgroundColor: cores.cartao,
    borderRadius: 12,
    padding: espaco.m,
    gap: 4,
    borderWidth: 1,
    borderColor: cores.borda,
  },
  campo: { gap: 6 },
  rotulo: { fontSize: fonte.normal, fontWeight: '700', color: cores.texto },
  entrada: {
    backgroundColor: cores.cartao,
    borderWidth: 2,
    borderColor: cores.borda,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 54,
    fontSize: fonte.normal,
    color: cores.texto,
  },
  data: { flexDirection: 'row', alignItems: 'center', gap: espaco.p },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: espaco.p },
  opcao: {
    minHeight: 50,
    paddingHorizontal: 18,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: cores.primaria,
    backgroundColor: cores.cartao,
    justifyContent: 'center',
  },
  opcaoAtiva: { backgroundColor: cores.primaria },
  opcaoTexto: { fontSize: fonte.normal, fontWeight: '600', color: cores.primariaEscura },
  linha: { flexDirection: 'row', alignItems: 'center', gap: espaco.p },
});
