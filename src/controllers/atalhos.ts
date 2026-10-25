// Atalhos para a conversa no WhatsApp (RF10) e o endereço no aplicativo de mapas (RF11).

const DDD_PADRAO = '48';
const CIDADE = 'Florianópolis - SC';

export function linkWhatsApp(telefone: string): string | null {
  let numero = telefone.replace(/\D/g, '');
  if (!numero) return null;
  if (numero.length >= 12 && numero.startsWith('55')) numero = numero.slice(2);
  if (numero.length <= 9) numero = DDD_PADRAO + numero;
  return `https://wa.me/55${numero}`;
}

export function linkMapa(endereco: string, bairro: string, plataforma: string): string | null {
  if (!endereco.trim()) return null;
  const busca = encodeURIComponent([endereco.trim(), bairro.trim(), CIDADE].filter(Boolean).join(', '));
  return plataforma === 'android'
    ? `geo:0,0?q=${busca}`
    : `https://www.google.com/maps/search/?api=1&query=${busca}`;
}

export function linkTelefone(telefone: string): string | null {
  const numero = telefone.replace(/\D/g, '');
  return numero ? `tel:${numero}` : null;
}
