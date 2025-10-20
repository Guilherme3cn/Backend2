# EcoHome Tuya Demo

Monorepo com backend Next.js pronto para Vercel e aplicativo React Native (Expo) para demonstrar a integração com Tuya Cloud usando OAuth H5.

## Estrutura

- `backend/` — Next.js (App Router) com rotas `api/tuya/*` e cliente para Tuya Cloud.
- `app/` — Projeto Expo/React Native com botão “Conectar Tuya”, lista de dispositivos e tela de consumo.
- `.env.example` — modelo de variáveis de ambiente compartilhadas.

## Pré-requisitos

- Conta e credenciais no [Tuya IoT Platform](https://developer.tuya.com/).
- Node.js 18+ e npm.
- Expo CLI (`npm install -g expo-cli`) para rodar o app localmente.

## Variáveis de ambiente

Copie `.env.example` para `.env` na raiz e ajuste conforme necessário. Em seguida:

- Duplique para `backend/.env` (ou configure diretamente na Vercel).
- Duplique para `app/.env` para que o Expo exponha `EXPO_PUBLIC_BACKEND_URL`.

Campos principais:

| Variável | Descrição |
| --- | --- |
| `TUYA_CLIENT_ID` / `TUYA_CLIENT_SECRET` | Credenciais do projeto Tuya |
| `TUYA_REGION_BASE_URL` | Base URL do data center (Western America: `https://openapi.tuyaus.com`) |
| `TUYA_CALLBACK_URL` | Callback configurado na Tuya e apontando para `/api/tuya/auth/callback` da Vercel |
| `TUYA_APP_DEEP_LINK` | (Opcional) Deep link para retornar ao app (`myapp://tuya/callback`) |
| `BACKEND_URL` | URL pública do backend (ex.: `https://...vercel.app`) |
| `EXPO_PUBLIC_BACKEND_URL` | URL pública usada pelo aplicativo móvel |

> Não deixe credenciais em repositórios públicos. Use `.env` localmente e configure os mesmos valores no painel da Vercel e no EAS/Expo.

## Backend (Next.js / Vercel)

```bash
cd backend
npm install
npm run dev
```

- Rotas disponíveis: `/api/tuya/login`, `/api/tuya/auth/callback`, `/api/tuya/devices`, `/api/tuya/status/:deviceId`, `/api/tuya/energy/:deviceId`, `/api/tuya/command/:deviceId`.
- Tokens são armazenados em memória (ver `lib/tokenStore.ts`). Ao migrar para MySQL, implemente o mesmo contrato e substitua a instância exportada.
- `vercel.json` define o output padrão para deploy. Configure as variáveis no dashboard da Vercel antes de publicar.

## Aplicativo Expo

1. Configure `app/.env` com `EXPO_PUBLIC_BACKEND_URL`.
2. Instale dependências e inicie o bundle:

```bash
cd app
npm install
npm start
```

3. Abra no emulador ou dispositivo físico (via QR Code).

Funcionalidades:

- Botão “Conectar Tuya” abre o fluxo OAuth (`Linking.openURL`).
- Lista de dispositivos com status, energia e ações rápidas.
- Botão “Adicionar ao app” mantém estado local e alimenta o gráfico de pizza na tela de detalhes.
- Tela “Ver consumo” mostra métricas em tempo real (ou mock se Tuya não retornar dados) e um gráfico consolidado.

## Fluxo OAuth

1. O app chama `GET {BACKEND_URL}/api/tuya/login`.
2. A Tuya redireciona para `TUYA_CALLBACK_URL`.
3. O backend troca o `code` por tokens, armazena em memória e redireciona para `TUYA_APP_DEEP_LINK` (ou página `/connected`).
4. O app volta a focar a tela e requisita `/api/tuya/devices` usando os tokens que ficaram disponíveis no backend.

## Próximos passos sugeridos

1. Substituir o armazenamento em memória por MySQL/PostgreSQL usando a interface de `tokenStore`.
2. Adicionar autenticação própria do backend (JWT/session) antes de expor as rotas públicas.
3. Expandir a tela móvel com histórico de energia usando os endpoints estatísticos da Tuya.
