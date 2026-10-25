# GilmarGardens

Aplicativo Android (APK GilmarGardens) de agenda de clientes, visitas e pagamentos para a Gilmar Jardins, microempresa de jardinagem de Florianópolis/SC.

Projeto de extensão da disciplina ARA0089 – Programação para Dispositivos Móveis em Android (Estácio de Sá, EAD).

## Estrutura

- `src/model/`: as classes do diagrama (Cliente, Visita, Pagamento, Usuario) e as regras de domínio.
- `src/controllers/`: Agenda, SincronizacaoServico e os atalhos de WhatsApp e mapa.
- `src/data/`: o SQLite do celular (esquema e Repositorio).
- `src/app/`: as telas (Expo Router); `src/components/`: os componentes de interface.
- `supabase/schema.sql`: o banco remoto, as regras de acesso e os gatilhos de sincronização.
- `scripts/importar-clientes.mjs`: importa clientes de uma planilha CSV (modelo em `scripts/modelo-clientes.csv`).

O Roteiro de Extensão, com os requisitos, o diagrama de classes e os resultados, faz parte da entrega à disciplina e não está neste repositório, porque traz dados pessoais da parte interessada.

## Desenvolvimento

O `.env` (fora do git) guarda `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Sem ele, o app funciona só no celular, sem login nem sincronização.

```sh
npm install
npm test             # testes de unidade (Jest)
npm run typecheck
npx expo lint
npx expo start --web # as telas no navegador, com o SQLite da web
```

## APK

O build roda no EAS, perfil `preview`. As variáveis do Supabase ficam no ambiente `preview` do EAS (`eas env:list preview`).

```sh
npx eas-cli@latest build -p android --profile preview
```

## Importar clientes de uma planilha

Preencha uma planilha com as colunas de `scripts/modelo-clientes.csv`, baixe como CSV e rode com o login de um usuário do app:

```sh
GG_EMAIL=... GG_SENHA=... node scripts/importar-clientes.mjs clientes.csv            # confere
GG_EMAIL=... GG_SENHA=... node scripts/importar-clientes.mjs clientes.csv --enviar   # envia
```

## Usuários

Os usuários são criados no painel do Supabase (Authentication → Users → Add user, com "Auto Confirm User"); um gatilho os autoriza a ler e gravar os dados. O cadastro aberto (sign up) fica desligado no painel.
