import { Pressable, Text } from 'react-native';

import { useDados } from '@/state/Dados';

import { Icone, type NomeIcone } from './ui';

/** Mostra no cabeçalho se os dados já foram enviados ao outro celular; tocar sincroniza na hora. */
export function IndicadorSync() {
  const { sync, sincronizar } = useDados();
  if (sync.situacao === 'desligada') return null;

  const aparencias: Record<Exclude<typeof sync.situacao, 'desligada'>, { icone: NomeIcone; texto: string }> = {
    sincronizando: { icone: 'cloud-sync', texto: 'Enviando' },
    ok: sync.pendentes ? { icone: 'cloud-upload', texto: String(sync.pendentes) } : { icone: 'cloud-check', texto: '' },
    'sem-internet': { icone: 'cloud-off-outline', texto: sync.pendentes ? String(sync.pendentes) : '' },
    erro: { icone: 'cloud-alert', texto: 'Erro' },
  };
  const { icone, texto } = aparencias[sync.situacao];

  return (
    <Pressable
      onPress={sincronizar}
      accessibilityLabel="Sincronizar agora"
      style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 8 }}>
      <Icone nome={icone} cor="#fff" tamanho={28} />
      {texto ? <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{texto}</Text> : null}
    </Pressable>
  );
}

export function textoSync(sync: ReturnType<typeof useDados>['sync']): string {
  switch (sync.situacao) {
    case 'desligada':
      return 'Dados só neste celular (sem sincronização).';
    case 'sincronizando':
      return 'Sincronizando…';
    case 'sem-internet':
      return sync.pendentes
        ? `Sem internet. ${sync.pendentes} alteração(ões) guardada(s) no celular, serão enviadas quando houver conexão.`
        : 'Sem internet. Os dados estão guardados no celular.';
    case 'erro':
      return `Erro ao sincronizar: ${sync.erro}`;
    case 'ok': {
      if (sync.pendentes) return `${sync.pendentes} alteração(ões) para enviar.`;
      if (!sync.ultima) return 'Aguardando a primeira sincronização.';
      const hora = sync.ultima.toTimeString().slice(0, 5);
      return `Tudo sincronizado às ${hora}.`;
    }
  }
}
