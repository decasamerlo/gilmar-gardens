import { linkMapa, linkWhatsApp } from '../atalhos';

describe('linkWhatsApp', () => {
  it('põe o código do Brasil no número com DDD', () => {
    expect(linkWhatsApp('(48) 99988-7766')).toBe('https://wa.me/5548999887766');
  });

  it('usa o DDD 48 quando o número vem sem DDD', () => {
    expect(linkWhatsApp('99988-7766')).toBe('https://wa.me/5548999887766');
  });

  it('não repete o código do país', () => {
    expect(linkWhatsApp('+55 48 99988-7766')).toBe('https://wa.me/5548999887766');
  });

  it('é nulo sem telefone', () => {
    expect(linkWhatsApp('')).toBeNull();
  });
});

describe('linkMapa', () => {
  it('busca o endereço com bairro e cidade no aplicativo de mapas', () => {
    expect(linkMapa('Rua das Flores, 10', 'Centro', 'android')).toBe(
      'geo:0,0?q=Rua%20das%20Flores%2C%2010%2C%20Centro%2C%20Florian%C3%B3polis%20-%20SC',
    );
  });

  it('abre o Google Maps fora do Android', () => {
    expect(linkMapa('Rua das Flores, 10', '', 'web')).toBe(
      'https://www.google.com/maps/search/?api=1&query=Rua%20das%20Flores%2C%2010%2C%20Florian%C3%B3polis%20-%20SC',
    );
  });

  it('é nulo sem endereço', () => {
    expect(linkMapa(' ', 'Centro', 'android')).toBeNull();
  });
});
